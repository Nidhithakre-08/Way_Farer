import { Check, Compass, Sparkles } from 'lucide-react';

const interests = [
  { name: 'Adventure', image: 'photo-1464822759023-fed622ff2c3b', description: 'Hikes, outdoor thrills, and active days.', plan: 'Start with a guided nature walk, leave time for a scenic viewpoint, and keep one flexible outdoor block.' },
  { name: 'Culture', image: 'photo-1519608487953-e999c86e7455', description: 'Local traditions, architecture, and art.', plan: 'Pair one landmark with a neighborhood walk, a local museum, and an evening performance or cultural experience.' },
  { name: 'Food', image: 'photo-1504674900247-0877df9cc836', description: 'Markets, regional dishes, and cooking.', plan: 'Visit a local market in the morning, book a regional food experience, and save dinner time for a neighborhood favorite.' },
  { name: 'Nature', image: 'photo-1441974231531-c6227db76b6e', description: 'Green spaces, coastlines, and wildlife.', plan: 'Choose one nearby park or nature reserve, plan a slow scenic route, and keep a weather-friendly alternative.' },
  { name: 'History', image: 'photo-1461360370896-922624d12aa1', description: 'Historic sites and stories of the past.', plan: 'Group historic sites by area, begin with an orientation or guided walk, and leave time to explore at your own pace.' },
  { name: 'Shopping', image: 'photo-1441986300917-64674bd600d8', description: 'Craft markets, boutiques, and keepsakes.', plan: 'Explore a craft market, compare local makers in one district, and keep purchases small enough to travel with.' },
  { name: 'Relaxation', image: 'photo-1470252649378-9c29740c9fa8', description: 'Slow mornings, wellness, and unhurried time.', plan: 'Keep mornings open, choose one restful experience, and leave a generous break between planned activities.' },
];

export default function InterestPlanner({ selected = [], onChange }) {
  const toggle = (name) => {
    const next = selected.includes(name)
      ? selected.filter((interest) => interest !== name)
      : [...selected, name];
    onChange(next);
  };

  return (
    <div className="interest-planner">
      <div className="interest-section-heading">
        <div><span>BUILD YOUR OWN TRIP</span><h3>Choose the experiences you love</h3><p>Tap a photo to add or remove an interest. Your activity ideas update as you choose.</p></div>
      </div>
      <div className="interest-grid">
        {interests.map((interest) => {
          const active = selected.includes(interest.name);
          return (
            <button
              type="button"
              key={interest.name}
              className={`interest-card ${active ? 'interest-card-active' : ''}`}
              aria-pressed={active}
              onClick={() => toggle(interest.name)}
            >
              <img src={`https://images.unsplash.com/${interest.image}?auto=format&fit=crop&w=640&q=80`} alt={`${interest.name} travel inspiration`} loading="lazy" />
              <span className="interest-card-shade" />
              <span className="interest-card-check">{active ? <Check size={15} /> : <Compass size={14} />}</span>
              <span className="interest-card-content"><b>{interest.name}</b><small>{interest.description}</small></span>
            </button>
          );
        })}
      </div>
      <div className="interest-plan-preview">
        <div className="interest-plan-title"><Sparkles size={16} /><b>Your trip inspiration</b></div>
        {selected.length ? (
          <ul>{interests.filter((interest) => selected.includes(interest.name)).map((interest) => (
            <li key={interest.name}><b>{interest.name}:</b> {interest.plan}</li>
          ))}</ul>
        ) : (
          <p>Choose one or more interests to add tailored activity ideas to your trip.</p>
        )}
      </div>
    </div>
  );
}
