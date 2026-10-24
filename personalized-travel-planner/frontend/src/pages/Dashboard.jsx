import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, Heart, LogOut, MapPin, PlaneTakeoff, Plus, Sparkles, Trash2, Users, Wallet } from 'lucide-react';
import { api } from '../lib/api';
import TravelChatbot from '../components/TravelChatbot';

function Stat({ icon, label, value, sub }) {
  return <div className="panel p-5"><div className="flex items-center justify-between text-slate-500"><span className="text-sm">{label}</span><span className="text-forest">{icon}</span></div><div className="mt-3 text-3xl font-black text-forest">{value}</div>{sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}</div>;
}

export default function Dashboard({ user, onSignOut }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingTripId, setDeletingTripId] = useState(null);
  const navigate = useNavigate();

  const loadTrips = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTrips(await api('/api/trips'));
    } catch (err) {
      setError(err.message || 'Could not load your trips.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const deleteTrip = async (trip) => {
    if (!window.confirm(`Delete your ${trip.destination} trip and itinerary?`)) return;
    setDeletingTripId(trip.id);
    setError('');
    try {
      await api(`/api/trips/${trip.id}`, { method: 'DELETE' });
      setTrips((current) => current.filter((item) => item.id !== trip.id));
    } catch (err) {
      setError(err.message || 'Could not delete this trip.');
    } finally {
      setDeletingTripId(null);
    }
  };

  return (
    <div className="dashboard min-h-screen bg-sand text-slate-800">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-sand/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><a href="/" className="flex items-center gap-2 font-black tracking-tight text-forest"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white"><Compass size={22} /></span><span>wayfarer<span className="text-coral">.</span><small className="ml-2 hidden font-medium text-slate-500 sm:inline">TRAVEL, YOUR WAY</small></span></a><div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span><button onClick={onSignOut} className="btn-quiet"><LogOut size={16} /> Sign out</button></div></div></header>
      <section className="site-hero"><div className="site-hero-inner"><span className="site-hero-kicker"><Sparkles size={14} /> TRAVEL, YOUR WAY</span><h1>A Smarter Way to See the World.</h1><p>Thoughtful journeys, shaped around you.</p></div></section>
      <main className="mx-auto max-w-7xl px-5 py-10">
        <section className="dashboard-feature"><div><span className="dashboard-feature-kicker">A little inspiration</span><h2>Make room for wonder.</h2><p>Find a new favorite place, then build a trip that fits your own pace.</p><button className="btn-light mt-4" onClick={() => navigate('/planner')}><Plus size={16} /> Start planning</button></div></section>
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><div className="eyebrow"><Compass size={14} /> YOUR TRAVEL SPACE</div><h2 className="mt-3 text-4xl font-black tracking-tight text-forest">Where to next?</h2><p className="mt-2 text-slate-600">Your saved plans, upcoming escapes, and new adventures.</p></div><button className="btn-primary" onClick={() => navigate('/planner')}><Plus size={18} /> Create new trip</button></div>
        <div className="mt-9 grid gap-4 sm:grid-cols-3"><Stat icon={<MapPin />} label="My trips" value={trips.length} /><Stat icon={<Heart />} label="Saved plans" value={trips.filter((trip) => trip.itineraries?.length).length} /><Stat icon={<Sparkles />} label="Travel styles" value="3" sub="Solo · Couple · Group" /></div>
        <div className="mt-12 flex items-center justify-between"><h2 className="text-2xl font-black text-forest">My trips</h2><span className="text-sm text-slate-500">{trips.length} saved</span></div>
        {error && <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700" role="alert"><span>{error}</span><button onClick={loadTrips} className="font-bold underline">Retry</button></div>}
        {loading ? <p className="py-10 text-slate-500">Loading your trips…</p> : trips.length === 0 ? <div className="panel mt-5 px-6 py-14 text-center"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-mint text-forest"><PlaneTakeoff size={28} /></div><h3 className="mt-5 text-xl font-bold text-forest">Your next adventure starts here</h3><p className="mx-auto mt-2 max-w-md text-slate-500">Create your first trip and get a day-by-day plan tailored to your budget and interests.</p><button onClick={() => navigate('/planner')} className="btn-primary mt-6"><Plus size={17} /> Plan a trip</button></div> : <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{trips.map((trip) => <article className="panel overflow-hidden" key={trip.id}><div className="trip-cover"><span className="rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-wider text-forest">{trip.travel_style || 'trip'} escape</span><MapPin size={34} /></div><div className="p-5"><h3 className="text-xl font-black text-forest">{trip.title || trip.destination}</h3><p className="mt-1 text-sm text-slate-500">{trip.start_date} — {trip.end_date}</p><div className="mt-4 flex flex-wrap gap-2"><span className="chip"><Users size={14} />{trip.party_size} travelers</span><span className="chip"><Wallet size={14} />{trip.currency} {Number(trip.budget).toLocaleString()}</span></div>{trip.interests?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{trip.interests.slice(0, 3).map((interest) => <span className="chip" key={interest}>{interest}</span>)}</div>}<div className="mt-5 flex gap-2"><button className="btn-primary flex-1 justify-center" onClick={() => navigate(`/trips/${trip.id}`)}>Open plan <ArrowRight size={16} /></button><button className="btn-quiet trip-delete-button" title={`Delete ${trip.destination} trip`} aria-label={`Delete ${trip.destination} trip`} disabled={deletingTripId === trip.id} onClick={() => deleteTrip(trip)}><Trash2 size={16} /><span>{deletingTripId === trip.id ? 'Deleting…' : 'Delete'}</span></button></div></div></article>)}</div>}
      </main>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-xs text-slate-500">Thoughtful trips, made personal. AI suggestions should be checked before travel.</footer><TravelChatbot />
    </div>
  );
}
