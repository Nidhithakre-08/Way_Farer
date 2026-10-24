import { useState } from 'react';
import { ArrowDownRight, IndianRupee, MapPin, Sparkles } from 'lucide-react';

const ideas = [
  {
    name: 'Kyoto, Japan',
    region: 'Japan · Culture & gardens',
    image: 'photo-1493976040374-85c8e12f0c0e',
    days: 4,
    budget: 52000,
    highlights: ['Fushimi Inari Shrine', 'Arashiyama bamboo grove', 'Kiyomizu-dera', 'Nishiki Market'],
    plan: [
      'East Kyoto: Kiyomizu-dera, historic lanes, and a tea-house stop',
      'Fushimi Inari early, then explore Gion and riverside dining',
      'Arashiyama bamboo grove, Tenryu-ji, and the river district',
      'Nishiki Market, a garden visit, and a relaxed final afternoon',
    ],
  },
  {
    name: 'Amalfi Coast, Italy',
    region: 'Italy · Coast & cuisine',
    image: 'photo-1533105079780-92b9be482077',
    days: 4,
    budget: 68000,
    highlights: ['Positano', 'Amalfi Cathedral', 'Ravello gardens', 'Coastal viewpoints'],
    plan: [
      'Arrive in Sorrento, settle in, and enjoy an easy old-town evening',
      'Explore Amalfi town and its cathedral; allow time for the waterfront',
      'Visit Ravello’s gardens and viewpoints, then return before sunset',
      'Choose a relaxed Positano visit; check current ferry and bus schedules',
    ],
  },
  {
    name: 'Jaipur, India',
    region: 'India · Heritage & bazaars',
    image: 'photo-1599661046827-dacff0c0f09a',
    days: 3,
    budget: 16000,
    highlights: ['Amber Fort', 'Hawa Mahal', 'City Palace', 'Jantar Mantar'],
    plan: [
      'Amber Fort in the morning, then explore nearby viewpoints',
      'Hawa Mahal, City Palace, and Jantar Mantar in the old city',
      'Browse a local bazaar, enjoy a relaxed meal, and keep departure flexible',
    ],
  },
  {
    name: 'Madeira, Portugal',
    region: 'Portugal · Island & nature',
    image: 'photo-1510414842594-a61c69b5ae57',
    days: 4,
    budget: 47000,
    highlights: ['Funchal Old Town', 'Monte gardens', 'Cabo Girão', 'Levada walk'],
    plan: [
      'Explore Funchal Old Town and the waterfront at an easy pace',
      'Visit Monte’s gardens and scenic overlooks; verify lift operations',
      'Choose a levada walk matched to your fitness and current trail notices',
      'See Cabo Girão and nearby villages; allow for island driving time',
    ],
  },
];

export default function DestinationIdeas({ onSelect }) {
  const [expanded, setExpanded] = useState('');

  return (
    <section className="destination-ideas" aria-labelledby="destination-ideas-title">
      <div className="destination-ideas-heading">
        <div>
          <span className="destination-ideas-kicker">NEED A LITTLE INSPIRATION?</span>
          <h2 id="destination-ideas-title">Great places, ready-made ideas</h2>
          <p>Explore highlights, a sample route, and a rough local-trip budget.</p>
        </div>
        <Sparkles size={22} aria-hidden="true" />
      </div>
      <p className="destination-budget-note">Estimated per traveler in INR for the suggested stay; excludes international flights. Treat costs as planning estimates, not live quotes.</p>
      <div className="destination-ideas-grid">
        {ideas.map((place) => {
          const isExpanded = expanded === place.name;
          return (
            <article className={`destination-card-wrap ${isExpanded ? 'destination-card-expanded' : ''}`} key={place.name}>
              <div className="destination-card-photo">
                <img src={`https://images.unsplash.com/${place.image}?auto=format&fit=crop&w=900&q=85`} alt={`${place.name} travel scenery`} loading="lazy" />
                <span className="destination-photo-region"><MapPin size={13} /> {place.region}</span>
              </div>
              <div className="destination-detail">
                <div className="destination-title-row">
                  <div><h3>{place.name}</h3><p>{place.days} days · {place.highlights.length} highlights</p></div>
                  <span className="destination-cost"><IndianRupee size={15} />{place.budget.toLocaleString('en-IN')}<small>/person</small></span>
                </div>
                <div className="destination-highlights">{place.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)}</div>
                {isExpanded && (
                  <ol className="destination-plan">
                    {place.plan.map((item, index) => <li key={item}><b>Day {index + 1}</b><span>{item}</span></li>)}
                  </ol>
                )}
                <div className="destination-actions">
                  <button type="button" className="destination-plan-toggle" onClick={() => setExpanded(isExpanded ? '' : place.name)}>
                    {isExpanded ? 'Hide sample plan' : 'See sample plan'} <ArrowDownRight size={15} />
                  </button>
                  <button type="button" className="destination-use-button" onClick={() => onSelect(place)}>
                    Use this idea
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
