import json
import re
import httpx
from datetime import timedelta
from .config import settings

def _demo_days(trip: dict) -> list[dict]:
    start = trip["start_date"]
    end = trip["end_date"]
    if isinstance(start, str):
        from datetime import date
        start = date.fromisoformat(start)
    if isinstance(end, str):
        from datetime import date
        end = date.fromisoformat(end)
    days = []
    count = (end - start).days + 1
    destination = trip["destination"]
    interests = trip.get("interests") or ["Food", "Culture"]
    style = trip.get("travel_style", "solo")
    pace = trip.get("preferences", {}).get("pace", "balanced")
    for i in range(count):
        date_text = (start + timedelta(days=i)).isoformat()
        if style == "couple":
            theme = ["Scenic arrival and relaxed exploration", "Local culture and a special meal", "Leisurely favorites and departure"][min(i, 2)]
        elif style == "group":
            theme = ["Group orientation and shared favorites", "Choose-your-own activity blocks", "Shared highlights and departure"][min(i, 2)]
        else:
            theme = ["Arrival and neighborhood orientation", "Top local sights and food", "Favorite spots and departure"][min(i, 2)]
        focus = interests[i % len(interests)]
        second_focus = interests[(i + 1) % len(interests)] if len(interests) > 1 else "Relaxation"
        activities = [
            _interest_activity(focus, destination, "09:00"),
            _interest_activity("Food", destination, "12:30"),
            _interest_activity(second_focus, destination, "15:00"),
        ]
        days.append({
            "day": i + 1,
            "date": date_text,
            "theme": theme,
            "activities": activities,
            "transport_notes": "Group nearby places together; check live navigation for current travel times.",
            "estimated_day_cost": 0,
            "notes": f"Demo suggestion for a {pace} pace. Costs are placeholders, not live quotes."
        })
    return days


def _interest_activity(interest: str, destination: str, time: str) -> dict:
    """Create a practical demo activity that reflects the selected trip interest."""
    plans = {
        "adventure": ("Outdoor adventure", f"Choose a guided hike, bike route or outdoor activity around {destination}; check route difficulty and current conditions.", "adventure"),
        "culture": ("Local culture and neighborhood walk", f"Explore a cultural district or museum in {destination}; check visitor guidance and opening times before you go.", "culture"),
        "food": ("Taste local food", f"Try a regional dish at a well-reviewed local restaurant or market in {destination}; confirm current hours and dietary options.", "food"),
        "nature": ("Green space and nature break", f"Visit a nearby garden, park or nature area around {destination}; check access and weather before setting out.", "nature"),
        "history": ("Historic sights and stories", f"Choose a historic landmark or guided heritage walk in {destination}; verify tickets and opening times with the official site.", "history"),
        "shopping": ("Local makers and market finds", f"Browse a craft market or independent shopping area in {destination}; compare options and check market days.", "shopping"),
        "relaxation": ("Slow down and recharge", f"Leave time for an unhurried café, scenic rest stop or wellness activity in {destination}; book ahead if needed.", "relaxation"),
    }
    title, description, category = plans.get(
        interest.strip().lower(),
        (f"Explore {destination}", f"Choose a well-reviewed local experience in {destination} that matches your interests.", "sightseeing"),
    )
    return {"time": time, "title": title, "description": description, "estimated_cost": 0, "category": category}

async def generate_days(trip: dict, only_day: int | None = None, existing_days: list | None = None):
    if not settings.ai_api_key:
        days = _demo_days(trip)
        if only_day:
            old = existing_days or days
            replacement = days[only_day - 1] if only_day <= len(days) else None
            if replacement:
                replacement["theme"] = "Alternative plan: " + replacement["theme"]
                replacement["notes"] = "Regenerated using the built-in demo planner; verify local details."
                old[only_day - 1] = replacement
            return old, "demo"
        return days, "demo"

    system_prompt = (
        "You are a careful travel itinerary assistant. Return valid JSON only. "
        "Never claim live prices, opening hours, availability, or travel times are verified. "
        "Use plausible activities and label costs as estimates. Keep activities geographically clustered. "
        "JSON schema: {days:[{day:int,date:string,theme:string,activities:[{time:string,title:string,"
        "description:string,estimated_cost:number,category:string}],transport_notes:string,"
        "estimated_day_cost:number,notes:string}]}"
    )
    if only_day:
        user_prompt = f"Regenerate only day {only_day} of this trip. Existing plan: {json.dumps(existing_days or [])}. Trip: {json.dumps(trip, default=str)}. Return JSON with a days array containing exactly one replacement day."
    else:
        user_prompt = f"Create a day-by-day plan for this trip. Trip details: {json.dumps(trip, default=str)}"
    # Keep within Vercel's default serverless request duration on the Hobby plan.
    async with httpx.AsyncClient(timeout=50) as client:
        response = await client.post(
            settings.ai_base_url.rstrip("/") + "/chat/completions",
            headers={"Authorization": f"Bearer {settings.ai_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.ai_model,
                "temperature": 0.7,
                "messages": [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
                "response_format": {"type": "json_object"}
            }
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    days = parsed.get("days", [])
    if not isinstance(days, list) or not days:
        raise ValueError("AI provider returned no itinerary days.")
    if only_day:
        result = list(existing_days or [])
        while len(result) < only_day:
            result.append(_demo_days(trip)[len(result)])
        replacement = days[0]
        replacement["day"] = only_day
        result[only_day - 1] = replacement
        return result, settings.ai_model
    return days, settings.ai_model

async def answer_travel_chat(messages: list[dict], destination: str | None = None) -> tuple[str, str]:
    """Answer travel-planning questions with the configured model or a safe fallback."""
    if not settings.ai_api_key:
        return _travel_guide_reply(messages, destination), "travel-guide"

    system_prompt = (
        "You are Wayfarer, a warm, practical travel-planning assistant. Give concise, personalized suggestions. "
        "Do not claim to know live prices, opening hours, availability, weather, safety conditions, or travel times. "
        "Encourage users to verify current details with official/local sources. Avoid requesting sensitive personal data."
    )
    if destination:
        system_prompt += f" The current trip destination is {destination}."
    async with httpx.AsyncClient(timeout=40) as client:
        response = await client.post(
            settings.ai_base_url.rstrip("/") + "/chat/completions",
            headers={"Authorization": f"Bearer {settings.ai_api_key}", "Content-Type": "application/json"},
            json={
                "model": settings.ai_model,
                "temperature": 0.7,
                "messages": [{"role": "system", "content": system_prompt}, *messages],
            },
        )
        response.raise_for_status()
        reply = response.json()["choices"][0]["message"]["content"]
    if not isinstance(reply, str) or not reply.strip():
        raise ValueError("AI provider returned an empty response.")
    return reply.strip(), settings.ai_model


def _travel_guide_reply(messages: list[dict], destination: str | None = None) -> str:
    """Provide useful intent-aware travel guidance when no generative model is configured."""
    latest = next((item["content"].strip() for item in reversed(messages) if item["role"] == "user"), "")
    question = latest.lower()
    history = " ".join(item["content"] for item in messages if item["role"] == "user")
    place = destination.strip() if destination and destination.strip() else _known_destination(history)
    prefix = f"For {place}, " if place else ""
    mode_note = "\n\nI don’t have live prices, opening hours, weather, or safety updates; verify those with current local sources."

    if any(word in question for word in ("pack", "packing", "bring", "luggage", "clothes")):
        reply = (
            f"{prefix}start with comfortable walking shoes, weather-appropriate layers, a compact day bag, any regular medication, "
            "travel documents, chargers and a power adapter suited to your destination. Add activity-specific gear only after checking your plans. "
            "Check a current forecast shortly before departure. How many days are you traveling, and what activities are planned?"
        )
    elif any(word in question for word in ("budget", "cost", "cheap", "expensive", "save", "spend", "afford")):
        reply = (
            f"{prefix}set a daily allowance by dividing your total budget by trip days, then reserve about 15% for unexpected costs. "
            "Track lodging, local transport, meals, activities and a small emergency buffer separately. The example destination budgets in this app exclude international flights and are estimates, not live quotes. "
            "Tell me your dates, trip length and currency and I can help make a simple budget breakdown."
        )
    elif any(word in question for word in ("itinerary", "plan my", "plan a", "day trip", "days in", "schedule", "route")):
        day_match = re.search(r"\b(\d{1,2})\s*[- ]?\s*days?\b", question)
        day_count = min(max(int(day_match.group(1)), 1), 7) if day_match else 3
        plan = _sample_itinerary(place, day_count) if place else None
        if plan:
            reply = f"Here’s a balanced {day_count}-day starter plan for {place}:\n\n" + "\n".join(
                f"Day {index + 1}: {activities}" for index, activities in enumerate(plan)
            ) + "\n\nTell me your dates, budget and pace and I can adjust it."
        else:
            reply = (
                "I can make a day-by-day route. Which destination should I plan for, how many days do you have, "
                "and would you prefer a relaxed, balanced or packed pace?"
            )
    elif any(word in question for word in ("food", "eat", "restaurant", "cuisine", "dish", "meal")):
        reply = (
            f"{prefix}try a local market or food hall, one regional specialty, and a neighborhood restaurant away from the busiest attraction areas. "
            "Check current opening times, recent reviews, dietary options and reservation needs before you go. Share the city and any dietary preferences for more focused ideas."
        )
    elif any(word in question for word in ("culture", "museum", "tradition", "temple", "church", "etiquette", "local custom")):
        reply = (
            f"{prefix}combine a well-known cultural site with a slower neighborhood walk or small local museum. "
            "Dress respectfully at religious sites, follow posted photography rules, and check current visitor guidance before arriving. "
            "Tell me which city or kind of culture you’re interested in and I’ll suggest a themed day."
        )
    elif any(word in question for word in ("history", "historic", "historical", "old town", "heritage")):
        reply = (
            f"{prefix}build a history-focused day around two or three nearby sites rather than crossing the whole city. "
            "A guided orientation walk can add context; leave time for one museum or historic district at your own pace. "
            "Check official site schedules and ticket requirements for your dates. Which period or story interests you most?"
        )
    elif any(word in question for word in ("shop", "shopping", "market", "souvenir", "buy")):
        reply = (
            f"{prefix}look for a craft market or independent shopping street, compare a few stalls before buying, and ask about materials and local provenance. "
            "Keep fragile or bulky purchases in mind when planning luggage. Do you prefer local crafts, fashion, or food gifts?"
        )
    elif any(word in question for word in ("relax", "rest", "slow", "wellness", "spa", "beach")):
        reply = (
            f"{prefix}keep one morning or afternoon free, plan no more than one fixed activity in that block, and choose a nearby park, waterfront or wellness stop. "
            "A slower day is easier when meals and transport are simple. Would you prefer nature, a spa-style break, or a relaxed café day?"
        )
    elif any(word in question for word in ("safe", "safety", "solo", "emergency")):
        reply = (
            "For a safer trip, share your general itinerary with someone you trust, save local emergency contacts, use well-reviewed transport, "
            "and keep a backup copy of important documents. Check current official travel advice for your destination; I can’t see live safety updates. "
            "Tell me the destination and I can help make a practical preparation checklist."
        )
    elif any(word in question for word in ("weather", "season", "best time", "when should", "when to visit")):
        reply = (
            f"{prefix}the best timing depends on what matters most—comfortable weather, lower crowds, seasonal scenery, or a specific event. "
            "I don’t have live forecasts or current event calendars, so compare climate averages and official event dates for your travel month. "
            "What month are you considering, and what kind of weather do you prefer?"
        )
    elif any(word in question for word in ("place", "places", "visit", "attraction", "see", "recommend", "where to")):
        highlights = _destination_highlights(place) if place else None
        reply = (
            f"A good first shortlist for {place} is: " + ", ".join(highlights) + ". Which kinds of places do you enjoy most?"
            if highlights else
            "I can suggest landmarks, neighborhoods, food spots and nature breaks. Which city or region are you visiting, and what do you enjoy?"
        )
    else:
        reply = (
            "I can help with destination ideas, a day-by-day route, packing, food, culture, history, shopping, relaxation, or a realistic budget. "
            "Tell me the destination, travel dates, and what you enjoy, and I’ll tailor a useful plan."
        )

    return reply[0].upper() + reply[1:] + mode_note


def _known_destination(text: str) -> str | None:
    destinations = {
        "kyoto": "Kyoto", "jaipur": "Jaipur", "amalfi": "Amalfi Coast", "madeira": "Madeira",
        "tokyo": "Tokyo", "paris": "Paris", "london": "London", "rome": "Rome", "bali": "Bali",
        "new york": "New York", "barcelona": "Barcelona", "lisbon": "Lisbon",
    }
    normalized = text.lower()
    return next((name for needle, name in destinations.items() if needle in normalized), None)


def _destination_highlights(place: str | None) -> list[str] | None:
    if not place:
        return None
    highlights = {
        "kyoto": ["Fushimi Inari Shrine", "Kiyomizu-dera and Higashiyama", "Arashiyama bamboo grove", "Nishiki Market"],
        "jaipur": ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar"],
        "amalfi coast": ["Amalfi’s historic center", "Ravello’s gardens", "Positano’s lanes", "a coastal viewpoint"],
        "madeira": ["Funchal Old Town", "Monte gardens", "a suitable levada walk", "Cabo Girão viewpoint"],
        "tokyo": ["Asakusa and Sensō-ji", "Ueno Park and museums", "Shibuya", "a neighborhood food market"],
        "paris": ["the Louvre area", "Île de la Cité", "Montmartre", "a Seine-side walk"],
        "london": ["Westminster", "the British Museum", "South Bank", "a historic market"],
        "rome": ["the Colosseum area", "the Roman Forum", "the Pantheon", "Trastevere"],
        "bali": ["Ubud", "a temple visit with respectful dress", "a rice-terrace walk", "a coastal sunset spot"],
        "new york": ["Central Park", "the Metropolitan Museum area", "Lower Manhattan", "a neighborhood food stop"],
        "barcelona": ["Sagrada Família", "the Gothic Quarter", "Park Güell", "a local market"],
        "lisbon": ["Alfama", "Belém", "Baixa and Chiado", "a riverside viewpoint"],
    }
    return highlights.get(place.lower())


def _sample_itinerary(place: str | None, days: int) -> list[str] | None:
    if not place:
        return None
    plans = {
        "kyoto": [
            "Explore Kiyomizu-dera and the Higashiyama lanes; take a relaxed dinner nearby.",
            "Visit Fushimi Inari in the morning, then spend the afternoon around Gion and the river.",
            "See Arashiyama’s bamboo grove and Tenryu-ji; keep the rest of the day flexible.",
            "Browse Nishiki Market and choose a garden or museum for the afternoon.",
        ],
        "jaipur": [
            "Visit Amber Fort in the morning, then explore a nearby viewpoint and return for a relaxed evening.",
            "See Hawa Mahal, City Palace and Jantar Mantar; group these old-city sights together.",
            "Explore a local bazaar, take a meal break, and leave time for a garden or craft stop.",
        ],
        "paris": [
            "Explore Île de la Cité and the Seine; choose one nearby museum or garden.",
            "Spend the morning in the Louvre area, then walk through the Tuileries and nearby streets.",
            "Visit Montmartre at an unhurried pace and finish with a neighborhood meal.",
        ],
        "rome": [
            "Explore the Colosseum area and Roman Forum; check timed-entry details ahead of the visit.",
            "Visit the Pantheon area and historic center on foot, with a long meal break.",
            "Spend a slower day in Trastevere and choose one museum or garden nearby.",
        ],
        "tokyo": [
            "Explore Asakusa and Sensō-ji, then enjoy a nearby market or riverside walk.",
            "Visit Ueno Park and choose a museum; keep the afternoon flexible.",
            "Explore Shibuya and a nearby neighborhood, with dinner close to your stay.",
        ],
    }
    selected = plans.get(place.lower())
    if not selected:
        return None
    return [selected[index % len(selected)] for index in range(days)]
