from uuid import UUID
from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from .config import settings
from .schemas import TripCreate, TripUpdate, DayUpdate, GenerateRequest, ChatRequest
from .ai import generate_days, answer_travel_chat

app = FastAPI(title="Personalized Travel Planner API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(dict.fromkeys([
        settings.frontend_origin.rstrip("/"),
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ])),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def supabase_client(admin: bool = False) -> Client:
    # The service-role key stays on the backend only. Every private operation
    # still checks ownership with the verified Supabase user ID.
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise HTTPException(status_code=503, detail="Supabase is not configured on the server.")
    if admin and not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Set SUPABASE_SERVICE_ROLE_KEY in the server environment.")
    key = settings.supabase_service_role_key if admin else settings.supabase_anon_key
    return create_client(settings.supabase_url, key)

def execute_optional_row(query):
    """Return optional row data without relying on maybe_single's empty-response behavior."""
    result = query.limit(1).execute()
    return result.data[0] if result.data else None

async def current_user(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Please sign in.")
    token = authorization.split(" ", 1)[1].strip()
    # Keep deployment misconfiguration distinct from an invalid user session.
    client = supabase_client()
    try:
        response = client.auth.get_user(token)
        if not response.user:
            raise ValueError("No user")
        return {"id": response.user.id, "email": response.user.email}
    except Exception:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Please sign in again.")

def owned_trip(client: Client, trip_id: str, user_id: str) -> dict:
    trip = execute_optional_row(client.table("trips").select("*").eq("id", trip_id).eq("owner_id", user_id))
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip

@app.get("/health")
def health():
    return {"status": "ok", "service": "personalized-travel-planner"}

@app.post("/api/chat")
async def travel_chat(payload: ChatRequest, user=Depends(current_user)):
    del user  # Authentication is required; no user data is sent to the model.
    messages = [message.model_dump() for message in payload.messages]
    if messages[-1]["role"] != "user":
        raise HTTPException(status_code=422, detail="The last chat message must be from you.")
    try:
        reply, provider = await answer_travel_chat(messages, payload.destination)
    except Exception:
        raise HTTPException(status_code=502, detail="The travel assistant is unavailable right now. Please try again.")
    return {"reply": reply, "provider": provider}

@app.get("/api/trips")
def list_trips(user=Depends(current_user)):
    client = supabase_client(admin=True)
    result = client.table("trips").select("*").eq("owner_id", user["id"]).order("created_at", desc=True).execute()
    trips = result.data or []
    if not trips:
        return []
    itineraries = client.table("itineraries").select("trip_id,days,version,ai_provider").in_("trip_id", [trip["id"] for trip in trips]).execute()
    by_trip_id = {itinerary["trip_id"]: itinerary for itinerary in (itineraries.data or [])}
    for trip in trips:
        itinerary = by_trip_id.get(trip["id"])
        trip["itineraries"] = [itinerary] if itinerary else []
    return trips

@app.post("/api/trips", status_code=201)
def create_trip(payload: TripCreate, user=Depends(current_user)):
    client = supabase_client(admin=True)
    data = payload.model_dump(mode="json")
    title = f"{payload.destination} trip"
    row = {
        "owner_id": user["id"], "title": title, "destination": payload.destination,
        "start_date": data["start_date"], "end_date": data["end_date"],
        "budget": payload.budget, "currency": payload.currency.upper(),
        "party_size": payload.party_size, "travel_style": payload.travel_style,
        "interests": payload.interests,
        "preferences": {"pace": payload.pace, "accommodation": payload.accommodation, "notes": payload.notes}
    }
    result = client.table("trips").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Could not create trip.")
    return result.data[0]

@app.patch("/api/trips/{trip_id}")
def update_trip(trip_id: UUID, payload: TripUpdate, user=Depends(current_user)):
    client = supabase_client(admin=True)
    owned_trip(client, str(trip_id), user["id"])
    changes = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not changes:
        raise HTTPException(status_code=400, detail="No changes supplied.")
    result = client.table("trips").update(changes).eq("id", str(trip_id)).eq("owner_id", user["id"]).execute()
    return result.data[0] if result.data else {}

@app.delete("/api/trips/{trip_id}", status_code=204)
def delete_trip(trip_id: UUID, user=Depends(current_user)):
    client = supabase_client(admin=True)
    owned_trip(client, str(trip_id), user["id"])
    client.table("trips").delete().eq("id", str(trip_id)).eq("owner_id", user["id"]).execute()
    return None

@app.get("/api/trips/{trip_id}/itinerary")
def get_itinerary(trip_id: UUID, user=Depends(current_user)):
    client = supabase_client(admin=True)
    trip = owned_trip(client, str(trip_id), user["id"])
    itinerary = execute_optional_row(client.table("itineraries").select("*").eq("trip_id", str(trip_id)))
    return {"trip": trip, "itinerary": itinerary}

@app.post("/api/trips/{trip_id}/generate")
async def generate_itinerary(trip_id: UUID, payload: GenerateRequest | None = None, user=Depends(current_user)):
    client = supabase_client(admin=True)
    trip = owned_trip(client, str(trip_id), user["id"])
    existing = execute_optional_row(client.table("itineraries").select("*").eq("trip_id", str(trip_id)))
    regenerate_day = payload.regenerate_day if payload else None
    if regenerate_day and not existing:
        raise HTTPException(status_code=400, detail="Generate the full itinerary before regenerating one day.")
    try:
        days, provider = await generate_days(trip, regenerate_day, existing.get("days", []) if existing else None)
    except Exception:
        raise HTTPException(status_code=502, detail="AI generation failed. Check the server AI settings and try again.")
    row = {"trip_id": str(trip_id), "days": days, "ai_provider": provider, "version": (existing or {}).get("version", 0) + 1}
    if existing:
        saved = client.table("itineraries").update(row).eq("trip_id", str(trip_id)).execute()
    else:
        saved = client.table("itineraries").insert(row).execute()
    return saved.data[0] if saved.data else row

@app.put("/api/trips/{trip_id}/itinerary/day/{day_number}")
def update_itinerary_day(trip_id: UUID, day_number: int, payload: DayUpdate, user=Depends(current_user)):
    client = supabase_client(admin=True)
    owned_trip(client, str(trip_id), user["id"])
    itinerary = execute_optional_row(client.table("itineraries").select("*").eq("trip_id", str(trip_id)))
    if not itinerary:
        raise HTTPException(status_code=404, detail="Generate an itinerary first.")
    days = itinerary["days"]
    if day_number < 1 or day_number > len(days):
        raise HTTPException(status_code=404, detail="Day number not found.")
    day = dict(payload.day)
    day["day"] = day_number
    days[day_number - 1] = day
    saved = client.table("itineraries").update({"days": days, "version": itinerary.get("version", 1) + 1}).eq("trip_id", str(trip_id)).execute()
    return saved.data[0] if saved.data else {"days": days}

@app.get("/api/shared/{share_code}")
def get_shared_trip(share_code: str):
    client = supabase_client(admin=True)
    trip = execute_optional_row(client.table("trips").select("id,title,destination,start_date,end_date,budget,currency,party_size,travel_style,interests,share_code").eq("share_code", share_code))
    if not trip:
        raise HTTPException(status_code=404, detail="Share link not found.")
    itinerary = execute_optional_row(client.table("itineraries").select("days").eq("trip_id", trip["id"]))
    return {"trip": trip, "itinerary": itinerary}
