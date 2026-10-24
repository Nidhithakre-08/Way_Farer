import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api } from '../lib/api';
import InterestPlanner from '../components/InterestPlanner';
import TravelerStylePicker from '../components/TravelerStylePicker';
import DestinationIdeas from '../components/DestinationIdeas';
import TravelChatbot from '../components/TravelChatbot';

export default function Planner({ user, onSignOut }) {
  const [form, setForm] = useState({ destination: '', start_date: '', end_date: '', budget: 25000, currency: 'INR', party_size: 1, travel_style: 'solo', interests: ['Food', 'Culture'], pace: 'balanced', accommodation: 'mid-range', notes: '' });
  const [activeStep, setActiveStep] = useState('destination-section');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const chooseTravelStyle = (style, defaultCount) => setForm((current) => ({ ...current, travel_style: style, party_size: style === 'group' ? Math.max(3, Number(current.party_size) || defaultCount) : defaultCount }));
  const updatePartySize = (value) => {
    const count = Math.max(1, Math.min(50, Number(value) || 1));
    setForm((current) => ({ ...current, party_size: count, travel_style: count === 1 ? 'solo' : count === 2 ? 'couple' : 'group' }));
  };

  useEffect(() => {
    const sections = ['destination-section', 'travelers-section', 'budget-section', 'interests-section'].map((id) => document.getElementById(id)).filter(Boolean);
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActiveStep(visible.target.id);
    }, { rootMargin: '-18% 0px -62% 0px', threshold: [0, 0.1, 0.25] });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const trip = await api('/api/trips', { method: 'POST', body: JSON.stringify(form) });
      try {
        await api(`/api/trips/${trip.id}/generate`, { method: 'POST', body: JSON.stringify({}) });
        navigate(`/trips/${trip.id}`, { state: { notice: 'Your trip and itinerary are saved.' } });
      } catch (generationError) {
        navigate(`/trips/${trip.id}`, { state: { notice: `Your trip is saved, but the itinerary could not be generated yet: ${generationError.message} Use “Generate itinerary” to retry.` } });
      }
    } catch (err) {
      setError(err.message || 'Could not save your trip. Check the API connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const stepLinks = [['destination-section', '01', 'Destination'], ['travelers-section', '02', 'Travelers'], ['budget-section', '03', 'Budget'], ['interests-section', '04', 'Interests']];

  return (
    <div className="min-h-screen bg-sand text-slate-800">
      <header className="sticky top-0 z-20 border-b border-emerald-950/10 bg-sand/90 backdrop-blur"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><Link to="/" className="font-black text-forest">wayfarer<span className="text-coral">.</span></Link>{user && <div className="flex items-center gap-3"><span className="hidden text-sm text-slate-600 sm:inline">{user.email}</span><button onClick={onSignOut} className="btn-quiet">Sign out</button></div>}</div></header>
      <section className="site-hero"><div className="site-hero-inner"><span className="site-hero-kicker"><Sparkles size={14} /> TRAVEL, YOUR WAY</span><h1>A Smarter Way to See the World.</h1><p>Thoughtful journeys, shaped around you.</p></div></section>
      <main className="planner-page mx-auto max-w-5xl px-5 py-10">
        <Link to="/" className="planner-back-link">← Back to dashboard</Link>
        <div className="planner-intro mt-5"><div className="eyebrow"><Sparkles size={14} /> YOUR TRIP, YOUR RULES</div><div className="planner-intro-row"><div><h2 className="mt-3 text-4xl font-black text-forest">Plan something memorable.</h2><p className="mt-2 text-slate-600">A few thoughtful details are all it takes to shape a trip around you.</p></div><span className="planner-time-badge"><Sparkles size={15} /> About 2 minutes</span></div></div>
        <nav className="planner-steps" aria-label="Jump to a trip planning section">{stepLinks.map(([id, number, label]) => <a key={id} className={activeStep === id ? 'planner-step-active' : ''} aria-current={activeStep === id ? 'step' : undefined} href={`#${id}`}><i>{number}</i> {label}</a>)}</nav>
        <form onSubmit={submit} className="planner-form panel mt-5 space-y-7 p-6 sm:p-8">
          <section id="destination-section" className="planner-form-section"><h3 className="section-title">01 <span>Where & when</span></h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label sm:col-span-2">Destination<input className="field" value={form.destination} onChange={(event) => update('destination', event.target.value)} placeholder="e.g. Jaipur, Rajasthan" required /></label><label className="field-label">Start date<input className="field" type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} required /></label><label className="field-label">End date<input className="field" type="date" min={form.start_date} value={form.end_date} onChange={(event) => update('end_date', event.target.value)} required /></label></div></section>
          <section id="travelers-section" className="planner-form-section"><h3 className="section-title">02 <span>Who's going?</span></h3><p className="mt-2 text-sm text-slate-500">Choose a travel style. The traveler count updates automatically.</p><div className="mt-4"><TravelerStylePicker value={form.travel_style} partySize={form.party_size} onSelect={chooseTravelStyle} /></div><label className="field-label mt-4">Number of travelers<input className="field" type="number" min="1" max="50" value={form.party_size} onChange={(event) => updatePartySize(event.target.value)} required /></label></section>
          <section id="budget-section" className="planner-form-section"><h3 className="section-title">03 <span>Budget & comfort</span></h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="field-label">Total trip budget<input className="field" type="number" min="0" value={form.budget} onChange={(event) => update('budget', Number(event.target.value))} required /></label><label className="field-label">Currency<select className="field" value={form.currency} onChange={(event) => update('currency', event.target.value)}><option>INR</option><option>USD</option><option>EUR</option><option>GBP</option></select></label><label className="field-label">Trip pace<select className="field" value={form.pace} onChange={(event) => update('pace', event.target.value)}><option value="relaxed">Relaxed & scenic</option><option value="balanced">Balanced</option><option value="packed">See as much as possible</option></select></label><label className="field-label">Accommodation style<select className="field" value={form.accommodation} onChange={(event) => update('accommodation', event.target.value)}><option value="budget">Budget-friendly</option><option value="mid-range">Comfortable mid-range</option><option value="premium">Premium</option></select></label></div></section>
          <section id="interests-section" className="planner-form-section"><h3 className="section-title">04 <span>What do you love?</span></h3><p className="mt-2 text-sm text-slate-500">Choose all that sound like you. Your picks shape the suggested activities.</p><InterestPlanner selected={form.interests} onChange={(interests) => update('interests', interests)} /><label className="field-label mt-4">Anything else we should know?<textarea className="field min-h-24" value={form.notes} onChange={(event) => update('notes', event.target.value)} placeholder="Dietary needs, must-see places, accessibility needs…" /></label></section>
          {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>}
          <button disabled={busy} className="btn-primary w-full justify-center py-4">{busy ? 'Saving trip and building your plan…' : 'Create my itinerary'} <Sparkles size={17} /></button><p className="text-center text-xs text-slate-500">Your trip is saved before the itinerary is generated. Suggestions are estimates.</p>
        </form>
        <DestinationIdeas onSelect={(place) => { update('destination', place.name); update('budget', place.budget * Number(form.party_size || 1)); update('currency', 'INR'); document.querySelector('input[placeholder="e.g. Jaipur, Rajasthan"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }} />
      </main>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-xs text-slate-500">Thoughtful trips, made personal. Check details before traveling.</footer><TravelChatbot />
    </div>
  );
}
