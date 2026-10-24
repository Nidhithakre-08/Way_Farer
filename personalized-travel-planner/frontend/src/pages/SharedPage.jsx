import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Share2 } from 'lucide-react';
import { api } from '../lib/api';
import TravelChatbot from '../components/TravelChatbot';

export default function SharedPage() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    api(`/api/shared/${code}`).then((result) => { if (active) setData(result); }).catch((err) => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [code]);

  return (
    <div className="min-h-screen bg-sand text-slate-800">
      <header className="border-b border-emerald-950/10 bg-white"><div className="mx-auto max-w-5xl px-5 py-4"><Link to="/" className="font-black text-forest">wayfarer<span className="text-coral">.</span></Link></div></header>
      <main className="mx-auto max-w-4xl px-5 py-12">
        {!data ? <div className="panel p-8 text-center">{error ? <><h1 className="text-2xl font-black text-forest">Shared trip unavailable</h1><p className="mt-2 text-slate-600">{error}</p></> : <p className="text-slate-500">Loading shared trip…</p>}</div> : <>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={16} /> Wayfarer</Link>
          <section className="trip-detail-hero mt-5"><div className="trip-detail-topline"><span><Share2 size={14} className="mr-1 inline" /> Shared trip</span><span>Wayfarer itinerary</span></div><h1>{data.trip.destination}</h1><p>{data.trip.start_date} — {data.trip.end_date}</p><div className="trip-detail-meta"><span><MapPin size={15} /> {data.trip.travel_style} escape</span></div></section>
          {(data.itinerary?.days || []).map((day) => <section key={day.day} className="panel mt-5 p-6"><p className="text-xs font-bold uppercase tracking-widest text-coral">DAY {day.day} · {day.date}</p><h2 className="mt-1 text-xl font-black text-forest">{day.theme}</h2>{(day.activities || []).map((activity, index) => <article key={`${activity.time}-${index}`} className="activity-row mt-3"><span className="w-16 shrink-0 text-sm font-bold text-forest">{activity.time}</span><div><b>{activity.title}</b><p className="mt-1 text-sm text-slate-600">{activity.description}</p></div></article>)}</section>)}
  </>}
      </main>
      <footer className="mx-auto max-w-5xl px-5 py-8 text-center text-xs text-slate-500">Shared trip suggestions are estimates; verify details before travel.</footer><TravelChatbot />
    </div>
  );
}
