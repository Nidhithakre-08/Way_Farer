import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Check, MapPin, RefreshCw, Save, Share2, Sparkles, Wallet, Users } from 'lucide-react';
import { api } from '../lib/api';
import TravelChatbot from './TravelChatbot';

const categories = ['all', 'food', 'culture', 'adventure', 'nature', 'history', 'shopping', 'relaxation'];

export default function TripPage({ user, onSignOut }) {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingDay, setEditingDay] = useState(null);
  const [editText, setEditText] = useState('');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api(`/api/trips/${id}/itinerary`));
    } catch (err) {
      setError(err.message || 'Could not load this saved trip.');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const trip = data?.trip;
  const days = data?.itinerary?.days || [];
  const activityCounts = useMemo(() => days.flatMap((day) => day.activities || []).reduce((counts, activity) => {
    const category = (activity.category || 'other').toLowerCase();
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {}), [days]);
  const availableFilters = categories.filter((category) => category === 'all' || activityCounts[category]);
  const visibleDays = days.filter((day) => filter === 'all' || (day.activities || []).some((activity) => (activity.category || '').toLowerCase() === filter));

  const generate = async (dayNumber) => {
    setBusy(true);
    setError('');
    try {
      await api(`/api/trips/${id}/generate`, {
        method: 'POST',
        body: JSON.stringify(dayNumber ? { regenerate_day: dayNumber } : {}),
      });
      await load();
    } catch (err) {
      setError(err.message || 'Could not generate the itinerary. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const saveDay = async () => {
    try {
      const day = JSON.parse(editText);
      await api(`/api/trips/${id}/itinerary/day/${editingDay}`, { method: 'PUT', body: JSON.stringify({ day }) });
      setEditingDay(null);
      setError('');
      await load();
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Check the JSON format and try saving again.' : (err.message || 'Could not save this day.'));
    }
  };

  const shareTrip = async () => {
    if (!trip?.share_code) return;
    const url = `${window.location.origin}/shared/${trip.share_code}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt('Copy your trip share link:', url);
    }
  };

  return (
    <div className="min-h-screen bg-sand text-slate-800">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-sand/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2 font-black tracking-tight text-forest"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white"><MapPin size={20} /></span><span>wayfarer<span className="text-coral">.</span></span></Link>
          {user && <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span><button onClick={onSignOut} className="btn-quiet">Sign out</button></div>}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={16} /> Back to dashboard</Link>
        {location.state?.notice && <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-forest" role="status">{location.state.notice}</div>}
        {error && <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert"><span>{error}</span><button onClick={load} className="shrink-0 font-bold underline">Retry</button></div>}

        {loading ? (
          <div className="panel mt-6 p-10 text-center text-slate-500" role="status">Loading your saved trip…</div>
        ) : !trip ? (
          <div className="panel mt-6 p-10 text-center"><h1 className="text-2xl font-black text-forest">Trip unavailable</h1><p className="mt-2 text-slate-600">We couldn’t load this trip. Check your connection and retry.</p><button className="btn-primary mt-5" onClick={load}>Try again</button></div>
        ) : (
          <>
            <section className="trip-detail-hero mt-6">
              <div className="trip-detail-topline"><span>{trip.travel_style} escape</span><span className="trip-detail-saved"><Check size={14} /> Saved to your trips</span></div>
              <h1>{trip.destination}</h1>
              <p>{trip.start_date} — {trip.end_date}</p>
              <div className="trip-detail-meta"><span><Users size={15} /> {trip.party_size} traveler{trip.party_size === 1 ? '' : 's'}</span><span><Wallet size={15} /> {trip.currency} {Number(trip.budget).toLocaleString()}</span></div>
              <div className="trip-detail-actions"><button className="btn-light" onClick={shareTrip}>{copied ? <Check size={16} /> : <Share2 size={16} />}{copied ? 'Link copied' : 'Share trip'}</button><button className="btn-light" disabled={busy} onClick={() => generate()}><RefreshCw size={16} /> Regenerate plan</button></div>
              {!!trip.interests?.length && <div className="trip-interest-tags">{trip.interests.map((interest) => <span key={interest}>{interest}</span>)}</div>}
            </section>

            <div className="mt-9 flex flex-wrap items-end justify-between gap-4">
              <div><div className="eyebrow"><Sparkles size={14} /> MADE AROUND YOUR INTERESTS</div><h2 className="mt-2 text-2xl font-black text-forest">Your itinerary</h2><p className="mt-1 text-sm text-slate-500">Filter by what you’d like to do, or edit and regenerate any day.</p></div>
              {!days.length && <button className="btn-primary" onClick={() => generate()} disabled={busy}><Sparkles size={16} />{busy ? 'Creating plan…' : 'Generate itinerary'}</button>}
            </div>

            {!days.length ? (
              <div className="panel mt-5 p-8 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-forest"><Sparkles size={24} /></div><h3 className="mt-4 text-lg font-bold text-forest">Your trip is saved</h3><p className="mt-2 text-slate-600">Create a day-by-day plan based on your selected interests.</p><button className="btn-primary mt-5" onClick={() => generate()} disabled={busy}>{busy ? 'Creating your plan…' : 'Build my itinerary'}</button></div>
            ) : (
              <>
                <nav className="itinerary-filters mt-5" aria-label="Filter itinerary by activity">
                  {availableFilters.map((category) => <button type="button" key={category} aria-pressed={filter === category} className={filter === category ? 'itinerary-filter-active' : ''} onClick={() => setFilter(category)}>{category === 'all' ? 'All activities' : category[0].toUpperCase() + category.slice(1)}<span>{category === 'all' ? days.reduce((total, day) => total + (day.activities || []).length, 0) : activityCounts[category]}</span></button>)}
                </nav>
                <div className="mt-5 space-y-5">
                  {visibleDays.map((day) => {
                    const activities = (day.activities || []).filter((activity) => filter === 'all' || (activity.category || '').toLowerCase() === filter);
                    return (
                      <section className="panel p-5 sm:p-7" key={day.day}>
                        <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-mint font-black text-forest">{String(day.day).padStart(2, '0')}</div><div><p className="text-xs font-bold uppercase tracking-widest text-coral">DAY {day.day} · {day.date}</p><h3 className="mt-1 text-xl font-black text-forest">{day.theme}</h3></div></div><div className="flex gap-2"><button className="btn-quiet" onClick={() => generate(day.day)} disabled={busy}><RefreshCw size={15} /> Regenerate day</button><button className="btn-quiet" onClick={() => { setEditingDay(day.day); setEditText(JSON.stringify(day, null, 2)); }}><Save size={15} /> Edit</button></div></div>
                        {editingDay === day.day ? <div className="mt-5"><label className="field-label">Edit this day’s itinerary<textarea className="field min-h-64 font-mono text-xs" value={editText} onChange={(event) => setEditText(event.target.value)} /></label><div className="mt-3 flex gap-2"><button className="btn-primary" onClick={saveDay}>Save changes</button><button className="btn-quiet" onClick={() => setEditingDay(null)}>Cancel</button></div></div> : <><div className="mt-5 space-y-3">{activities.map((activity, index) => <article className="activity-row" key={`${activity.time}-${activity.title}-${index}`}><div className="w-16 shrink-0 pt-1 text-sm font-bold text-forest">{activity.time || '—'}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="font-bold text-slate-800">{activity.title}</h4>{activity.category && <span className="chip">{activity.category}</span>}</div><p className="mt-1 text-sm leading-6 text-slate-600">{activity.description}</p></div>{Number(activity.estimated_cost) > 0 && <span className="shrink-0 text-sm font-bold text-forest">~{trip.currency} {activity.estimated_cost}</span>}</article>)}</div>{day.transport_notes && <p className="mt-4 rounded-xl bg-sand p-3 text-sm text-slate-600"><MapPin size={14} className="mr-2 inline" />{day.transport_notes}</p>}{day.notes && <p className="mt-3 text-xs leading-5 text-slate-500">{day.notes}</p>}</>}
                      </section>
                    );
                  })}
                  {!visibleDays.length && <div className="panel p-8 text-center text-slate-600">No {filter} activities in this plan yet. Try another category or regenerate the itinerary.</div>}
                </div>
              </>
            )}
            <p className="mt-5 text-xs leading-5 text-slate-500">Verify local opening times, costs, weather, safety guidance, and route details before travel.</p>
          </>
        )}
      </main>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-xs text-slate-500">Thoughtful trips, made personal. Check current local details before traveling.</footer>
      <TravelChatbot />
    </div>
  );
}
