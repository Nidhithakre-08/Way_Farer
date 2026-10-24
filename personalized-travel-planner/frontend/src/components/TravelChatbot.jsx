import { useCallback, useEffect, useRef, useState } from 'react';
import { Bot, Send, X, Sparkles, MessageCircle } from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const welcome = {
  role: 'assistant',
  content: 'Hi! I’m your Wayfarer travel assistant. Ask me for destination ideas, packing tips, or help shaping your itinerary.',
};
const prompts = ['What should I pack?', 'Plan a 3-day trip', 'Help me set a budget'];
const STORAGE_KEY = 'wayfarer-chat-history-v1';

function readSavedMessages() {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(stored) && stored.every((message) => ['user', 'assistant'].includes(message.role) && typeof message.content === 'string')
      ? [welcome, ...stored.filter((message) => !(message.role === 'assistant' && message.content === welcome.content))].slice(-13)
      : [welcome];
  } catch {
    return [welcome];
  }
}

export default function TravelChatbot() {
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState(readSavedMessages);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [assistantLabel, setAssistantLabel] = useState('Travel guide');
  const bottomRef = useRef(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages.filter((message) => !(message.role === 'assistant' && message.content === welcome.content)).slice(-12)));
    } catch {
      // Keep chat usable if browser storage is disabled or full.
    }
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, open, busy, error]);

  const send = useCallback(async (event, suggestedText = input, retrying = false) => {
    event?.preventDefault();
    const content = suggestedText.trim();
    if (!content || busy || !session) return;
    const userMessage = { role: 'user', content };
    const nextMessages = retrying ? messages : [...messages, userMessage];
    if (!retrying) setMessages(nextMessages);
    setError('');
    setBusy(true);
    try {
      const result = await api('/api/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: nextMessages.slice(-12) }),
      });
      if (!result.reply || typeof result.reply !== 'string') throw new Error('The assistant returned an empty reply. Please try again.');
      setAssistantLabel(result.provider === 'travel-guide' ? 'Travel guide' : 'AI travel assistant');
      setMessages((current) => [...current, { role: 'assistant', content: result.reply }]);
      setInput('');
    } catch (err) {
      setError(err.message || 'Could not reach the travel assistant.');
      // Keep the user’s message in the transcript; show a retry action instead of clearing the chat.
      setInput(content);
    } finally {
      setBusy(false);
    }
  }, [busy, input, messages, session]);

  return (
    <div className="chat-widget">
      {open && (
        <section className="chat-panel" aria-label="Travel assistant" aria-busy={busy}>
          <header className="chat-header">
            <div className="flex items-center gap-3">
              <span className="chat-avatar"><Bot size={20} /></span>
              <div><h2 className="font-bold">Wayfarer</h2><p className="text-xs text-emerald-100">{assistantLabel} · trip-planning sidekick</p></div>
            </div>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat"><X size={19} /></button>
          </header>
          <div className="chat-messages" aria-live="polite" role="log" aria-relevant="additions text">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`} key={`${index}-${message.role}`}>
                {message.content}
              </div>
            ))}
            {busy && <div className="chat-message chat-message-assistant chat-typing"><Sparkles size={14} /> Finding ideas…</div>}
            {error && <div className="chat-error" role="alert"><span>{error}</span><button type="button" onClick={() => send(null, input, true)} disabled={busy || !input.trim()}>Try again</button></div>}
            {messages.length === 1 && session && <div className="chat-prompts"><span>Try asking</span>{prompts.map((prompt) => <button type="button" key={prompt} onClick={() => send(null, prompt)} disabled={busy}>{prompt}</button>)}</div>}
            <div ref={bottomRef} />
          </div>
          {!session ? (
            <p className="chat-login-note">Sign in to chat with your travel assistant. <a href="/auth">Sign in</a></p>
          ) : (
            <form className="chat-form" onSubmit={send}>
              <input aria-label="Message your travel assistant" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about your next trip…" maxLength={2000} />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send message"><Send size={17} /></button>
            </form>
          )}
          <p className="chat-footnote">Suggestions aren’t live travel information. Verify details before booking.</p>
        </section>
      )}
      <button className="chat-launcher" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close travel chat' : 'Open travel chat'}>
        {open ? <X size={22} /> : <><MessageCircle size={21} /><span>Ask Wayfarer</span></>}
      </button>
    </div>
  );
}
