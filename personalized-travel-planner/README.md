# Personalized Travel Itinerary Planner

A full-stack starter project using React + Tailwind, FastAPI, Supabase Auth/Postgres, and optional Llama 3 via a compatible chat-completions API.

## Features
- Separate login/sign-up screen (Supabase Auth)
- Authenticated dashboard with My Trips / Saved Plans
- Trip wizard for destination, dates, budget, group size, travel style and interests
- AI itinerary generation and regenerate-day endpoint
- Floating travel-assistant chat; add an AI provider key on the server for generated replies
- Scenic travel photography on trip cards and the sign-in inspiration panel
- Edit itinerary days and share a trip through a share code
- Solo, couple and small-group modes
- Safe demo fallback itinerary when no AI provider key is configured

> AI-generated attractions, prices, opening hours and travel times are suggestions, not verified live data. Verify details before travel.

## Requirements
- Node.js 20+
- Python 3.11+
- Supabase project
- Optional: API key for a provider compatible with the OpenAI Chat Completions API (for example, a Groq-hosted Llama model).

## 1. Supabase setup
1. Create a project at https://supabase.com
2. Open **SQL Editor**, create a new query, and run `supabase/schema.sql`.
3. In **Project Settings → API**, copy the Project URL and `anon` key.
4. Never put the Supabase `service_role` key in the React frontend.

## 2. Backend setup (Windows PowerShell)
```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```
Edit `backend/.env` and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (backend only), plus optionally AI settings.
```powershell
uvicorn app.main:app --reload
```
API docs: http://127.0.0.1:8000/docs

If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate again.

## 3. Frontend setup
Open a second terminal:
```powershell
cd frontend
npm install
Copy-Item .env.example .env
```
Fill `.env` with the same Supabase Project URL and anon key.
```powershell
npm run dev
```
Open the local URL printed by Vite (usually http://localhost:5173).

## 4. Test flow
1. Sign up with an email and password.
2. If email confirmation is enabled, confirm your email.
3. Log in and create a trip.
4. Generate the itinerary; without an AI key the backend uses a demo generator.
5. Edit a day, regenerate it, or copy the share code.

## 5. Upload the project to GitHub
1. Create an empty repository on GitHub (do not add a README or `.gitignore`, since this project already has files for both).
2. From this project folder in PowerShell, run:
```powershell
git init
git add .
git commit -m "Initial travel planner app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
Replace the remote URL with the URL of your GitHub repository. The root `.gitignore` excludes local `.env` files, Python environments, installed packages, and build output. Check `git status` before pushing and never commit Supabase service-role keys or other secrets.

## 6. Deploy the complete app to Vercel
The repository root is the Vercel project root. `vercel.json` builds the Vite app from `frontend/`, serves the compiled SPA, and rewrites `/api/*` and `/health` to the FastAPI serverless function in `api/index.py`. API requests use the same Vercel domain, so do not set `VITE_API_URL` in production.

1. Push this repository to GitHub and import it in Vercel. Keep **Root Directory** set to the repository root (the folder containing `vercel.json`), then deploy.
2. In **Vercel → Project → Settings → Environment Variables**, add these for Production (and Preview if needed):
	- `VITE_SUPABASE_URL` — Supabase Project URL
	- `VITE_SUPABASE_ANON_KEY` — Supabase publishable/anon key
	- `SUPABASE_URL` — same Supabase Project URL
	- `SUPABASE_ANON_KEY` — same anon key (used only by the API for verifying sessions)
	- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role/secret key; server-side only, never use a `VITE_` prefix
	- Optional AI settings: `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL`. Without an AI key, the app uses its built-in demo planner.
3. In **Supabase → Authentication → URL Configuration**, set **Site URL** to the deployed Vercel URL and add that URL (and any preview URL you use) to **Redirect URLs**. Keep localhost URLs for local development.
4. Run `supabase/schema.sql` in the Supabase SQL Editor if you have not already done so. Redeploy after adding or changing `VITE_` variables; Vite embeds them during the build.
5. Check `https://<your-deployment>.vercel.app/health`, then sign up, create a trip, generate an itinerary, and open a shared trip link.

The travel assistant appears as **Ask Wayfarer** at the bottom-right of the app. It requires a signed-in session. Without `AI_API_KEY`, it returns a clearly labeled built-in fallback; with an OpenAI-compatible provider key it sends chat requests through the backend so the key is never exposed to the browser. Travel photography is loaded from Unsplash image URLs and therefore requires an internet connection in the browser.

For local development, start FastAPI from `backend/` with `uvicorn app.main:app --reload`, then run `npm run dev` from `frontend/`. Vite proxies `/api` and `/health` to `http://127.0.0.1:8000` by default. Set `VITE_API_URL` only if your local API runs elsewhere.

## Security notes
- Backend verifies the Supabase access token using Supabase Auth.
- Database tables use Row Level Security (RLS).
- The share code grants read access through the app's share endpoint; keep it private. For a public production app, add rate limits, expiry, revocation, and audit logs.
- The Supabase service-role key is used only by the backend and must never be exposed to the browser. Backend endpoints verify the signed-in user and enforce trip ownership before using it.
- For production, add request rate limiting, logging/monitoring, migrations, tests, and real place/route data integrations.

## Project structure
```text
personalized-travel-planner/
├── frontend/
├── backend/
└── supabase/schema.sql
```
