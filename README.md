# FPL Ghost Scout 👻

Fantasy Premier League helper for Kiroween 2026 — Frankenstein category.
Haunting but colourful, dark purple night, bright orange / green / pink.
Plain-words tips, no stats jargon. Plain HTML, CSS and JavaScript only —
no frameworks, no build step, code a beginner can read.

## How to run it

1. Download and unzip `fpl-ghost-scout.zip`
2. Double-click `index.html` — it opens in your browser, no server needed
3. That is it. Sample players show immediately. Live FPL data loads in
   the background when it can, and only replaces the sample if it works.

## What is inside

- **Dashboard** — Gameweek 11 countdown (Sat 21 Nov 2026, 2:00pm EAT),
  Top Scorer / Best Form / Best Value cards, plain-words tips, top players.
- **Ghost Scout** — filter hidden gems by position, max price, and
  points / form / value.
- **Players** — search all players.
- **Fixtures** — next Gameweek fixtures.
- **My Team** — type your FPL team ID, it tries the live entry page.
  If FPL blocks the lookup, it tells you so honestly.
- **Ghost Chat** — people can chat in the app. Works on this device
  straight away. To share it with everyone, set up Supabase below.

## Why this version is different from the Kiro one

The Kiro build waited for the live FPL API before showing anything, so
the Dashboard sat on "Loading gameweek information..." with empty bars,
and the theme was pale white. This version shows the sample players
**immediately** on load, then fetches live data in the background and
only swaps it in on success. If the fetch fails, it keeps the sample
and says so on the badge. Theme is dark purple, as asked.

Sample data is as of Gameweek 9 (before Gameweek 10 finished), from
FPL / The Scout / FPL Hub, 3–6 Nov 2026: De Cuyper 69 pts, Haaland 68,
Gabriel 58, Barry 55, Raya 54, Isak 53, Evanilson 52, Verbruggen 51,
Joao Pedro 47. Gameweek 11 deadline is 21 Nov 2026, 11:00 GMT,
verified from the official FPL API.

## Ghost Chat — Supabase setup (optional, 5 minutes)

Chat works on one device with no setup. For everyone to see each
other's messages:

1. In Supabase (the same `pesalink` project works), open SQL Editor
   and run this:

```sql
create table if not exists public.fpl_chat (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  created_at timestamptz default now()
);
alter table public.fpl_chat enable row level security;
create policy "Anyone can read chat" on public.fpl_chat
  for select using (true);
create policy "Anyone can send chat" on public.fpl_chat
  for insert with check (true);
```

2. Copy your Project URL and anon public key from
   Project Settings → API.
3. Paste them at the top of `app.js`, replacing
   `PASTE_YOUR_SUPABASE_URL_HERE` and `PASTE_YOUR_SUPABASE_ANON_KEY_HERE`.
4. Reload the page. The note under Ghost Chat will say "Online chat".

## For the Kiroween submission

This is a fixed version of the app Kiro built in your `fpl-ghost-scout`
folder on your PC. To submit it:

1. Copy these 4 files into that same folder, replacing Kiro's files:
   `index.html`, `styles.css`, `app.js`, `README.md`
2. **Do not delete the `.kiro` folder** Kiro made in that folder —
   the submission needs it at the root of the repo.
3. Push that folder to a new public GitHub repo, deploy it live
   (GitHub Pages, free), record a demo video under 3 minutes, and
   submit on Devpost before **Saturday 5 Dec 2026, 1:00am EAT**.

## Files

- `index.html` — the page, tabs and sections
- `styles.css` — dark haunting theme, colourful accents
- `app.js` — all the logic, with a short comment above every function
- `README.md` — this file
