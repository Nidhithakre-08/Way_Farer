import { Heart, Users, UserRound } from 'lucide-react';

const travelerStyles = [
  { id: 'solo', title: 'Solo traveler', text: 'Your own pace', count: 1, icon: UserRound, image: 'photo-1551632811-561732d1e306' },
  { id: 'couple', title: 'Couple vacation', text: 'A little romance', count: 2, icon: Heart, image: 'photo-1516589178581-6cd7833ae3b2' },
  { id: 'group', title: 'Small group', text: 'Better together', count: 3, icon: Users, image: 'photo-1529156069898-49953e39b3ac' },
];

export default function TravelerStylePicker({ value, partySize, onSelect }) {
  return (
    <div className="traveler-style-grid" role="group" aria-label="Choose who is traveling">
      {travelerStyles.map(({ id, title, text, count, icon: Icon, image }) => {
        const selected = value === id;
        return (
          <button
            type="button"
            key={id}
            className={`traveler-style-card ${selected ? 'traveler-style-card-active' : ''}`}
            aria-pressed={selected}
            onClick={() => onSelect(id, count)}
            style={{ backgroundImage: `linear-gradient(0deg, rgba(8,31,26,.9), rgba(8,31,26,.04) 88%), url(https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=85)` }}
          >
            <span className="traveler-style-icon"><Icon size={19} /></span>
            <span className="traveler-style-copy"><b>{title}</b><small>{text}</small></span>
            <span className="traveler-style-count">{selected ? `${partySize} ${partySize === 1 ? 'traveler' : 'travelers'}` : count === 3 ? '3+ travelers' : `${count} ${count === 1 ? 'traveler' : 'travelers'}`}</span>
          </button>
        );
      })}
    </div>
  );
}
