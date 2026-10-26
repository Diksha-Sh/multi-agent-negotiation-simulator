# Supabase Authentication & Simulation History Setup

This guide details how to connect the **Multi-Agent Negotiation Simulator** to a free Supabase cloud database for real user accounts (Sign-Up / Login) and persistent simulation history.

---

## 1. Create a Free Supabase Project

1. Visit [https://supabase.com](https://supabase.com) and click **Start your project** (free tier).
2. Enter an **Organization** and **Project Name** (e.g. `negotiation-simulator`).
3. Set a strong Database Password and select your nearest region.
4. Click **Create new project** (takes ~1-2 minutes to provision).

---

## 2. Run the Database Schema

1. In your Supabase Dashboard, go to **SQL Editor** on the left menu.
2. Click **New query**.
3. Copy the entire contents of [`supabase_schema.sql`](../supabase_schema.sql) and paste it into the editor.
4. Click **Run** (or `Ctrl+Enter`).
5. Verify in **Table Editor** that the `simulations` table has been created with Row-Level Security (RLS) enabled.

---

## 3. Configure Frontend Environment Variables

1. In your Supabase Dashboard, go to **Project Settings** (gear icon) -> **API**.
2. Find the following two values under **Project API keys**:
   - **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   - **Project API Anon Key** (`anon` `public` key)
3. In your local project, inside the `frontend/` folder, create a `.env.local` file (this file is ignored by Git):

```env
VITE_API_URL=http://127.0.0.1:8000
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

4. Restart your Vite dev server:
```bash
cd frontend
npm run dev
```

---

## 4. How It Works

- **Authentication**:
  - `LoginPage.jsx` supports both **Sign In** and **Create Account (Sign Up)**.
  - When Supabase credentials are provided, accounts are created directly in Supabase GoTrue Auth (`auth.users`).
  - If credentials are not configured yet, the app gracefully operates in **Demo Mode** with local session caching so team members can work without internet/credentials.
- **Simulation History**:
  - When any negotiation run completes in [`NegotiationArena.jsx`](../frontend/src/components/NegotiationArena.jsx), the run is automatically recorded via `saveSimulationRecord()`.
  - Logged-in users can open the **History** modal from the navigation bar to inspect past scenarios, outcomes, round counts, and turn replays.
