import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { supabase } from './lib/supabase';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Planner from './pages/Planner';
import TripPage from './components/TripPage';
import SharedPage from './pages/SharedPage';

export default function App() {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setReady(true);
      })
      .catch((error) => {
        console.error('Could not restore the Supabase session:', error);
        if (!active) return;
        setSession(null);
        setReady(true);
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  if (!ready) {
    return <div className="grid min-h-screen place-items-center bg-sand text-forest">Getting your travel space ready…</div>;
  }

  return (
    <Routes>
      <Route path="/shared/:code" element={<SharedPage />} />
      <Route path="/auth" element={session ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/" element={session ? <Dashboard user={session.user} onSignOut={signOut} /> : <Navigate to="/auth" replace />} />
      <Route path="/planner" element={session ? <Planner user={session.user} onSignOut={signOut} /> : <Navigate to="/auth" replace />} />
      <Route path="/trips/:id" element={session ? <TripPage user={session.user} onSignOut={signOut} /> : <Navigate to="/auth" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
