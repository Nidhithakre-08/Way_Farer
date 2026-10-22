import { useState } from 'react';
import { ArrowRight, Compass, Landmark, Mountain, Sparkles, Utensils } from 'lucide-react';
import { supabase } from '../lib/supabase';
import TravelChatbot from '../components/TravelChatbot';

function getAuthErrorMessage(error) {
  const message = error?.message || '';
  if (error?.name === 'AuthRetryableFetchError' || /failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Could not connect to Supabase Auth. Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env are your real project values, that your Supabase project is active, and that you are online. Restart the frontend after changing .env.';
  }
  return message || 'Unable to continue. Please try again.';
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name } } });
        if (error) throw error;
        setMessage('Account created. Check your inbox if email confirmation is enabled, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error));
      setIsError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand text-slate-800">
      <header className="border-b border-emerald-950/10 bg-sand/90"><div className="mx-auto flex max-w-7xl items-center gap-2 px-5 py-4 font-black text-forest"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-forest text-white"><Compass size={22} /></span> wayfarer<span className="text-coral">.</span></div></header>
      <section className="site-hero"><div className="site-hero-inner"><span className="site-hero-kicker"><Sparkles size={14} /> TRAVEL, YOUR WAY</span><h1>A Smarter Way to See the World.</h1><p>Thoughtful journeys, shaped around you.</p></div></section>
      <main className="mx-auto grid min-h-[70vh] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-2">
        <section>
          <div className="eyebrow"><Sparkles size={14} /> YOUR NEXT CHAPTER STARTS HERE</div>
          <h2 className="mt-5 max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-forest sm:text-6xl">Less planning.<br /><span className="text-coral">More living.</span></h2>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600">Build a trip that fits your pace, your people, and the things you love. Your personal travel planner, all in one place.</p>
          <div className="mt-9 flex flex-wrap gap-3"><span className="chip"><Mountain size={15} /> Adventure</span><span className="chip"><Landmark size={15} /> Culture</span><span className="chip"><Utensils size={15} /> Local food</span></div>
          <div className="auth-inspiration mt-12"><p className="text-sm text-white/90">A little inspiration</p><p className="mt-2 text-2xl font-semibold">“Take the scenic route.”</p><p className="mt-2 text-sm text-white/90">Make space for the unexpected.</p></div>
        </section>
        <section className="panel mx-auto w-full max-w-md p-7 sm:p-9">
          <div className="mb-7"><p className="text-sm font-bold uppercase tracking-[.2em] text-coral">{mode === 'login' ? 'Welcome back' : 'Start exploring'}</p><h2 className="mt-2 text-3xl font-black text-forest">{mode === 'login' ? 'Sign in to Wayfarer' : 'Create your account'}</h2><p className="mt-2 text-sm text-slate-500">Your trips are saved securely to your account.</p></div>
          <form onSubmit={submit} className="space-y-4">
            {mode === 'signup' && <label className="field-label">Name<input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" required /></label>}
            <label className="field-label">Email address<input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required /></label>
            <label className="field-label">Password<input className="field" type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" required /></label>
            {message && <p className={`rounded-xl p-3 text-sm ${isError ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-forest'}`} role={isError ? 'alert' : 'status'}>{message}</p>}
            <button disabled={busy} className="btn-primary w-full justify-center">{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowRight size={17} /></button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">{mode === 'login' ? 'New to Wayfarer?' : 'Already have an account?'} <button className="font-bold text-forest underline" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }} type="button">{mode === 'login' ? 'Create account' : 'Sign in'}</button></p>
        </section>
      </main>
      <footer className="mx-auto max-w-7xl px-5 py-8 text-center text-xs text-slate-500">Thoughtful trips, made personal. Check current local details before traveling.</footer>
      <TravelChatbot />
    </div>
  );
}
