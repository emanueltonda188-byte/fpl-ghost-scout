// FPL Ghost Scout — plain HTML, CSS and JavaScript only.
// No frameworks, no build step. Every function has one short comment.
//
// Main rule: show the sample players FIRST (the moment the page loads),
// then try the live FPL data in the background. Live data only replaces
// the sample if it loads OK and loads FAST. If it is slow or fails, the
// sample data stays on screen and the badge says so honestly.

// --- Supabase settings for Ghost Chat. Paste your real values here. ---
// Get them from your Supabase project (the same pesalink project works):
// Project Settings -> API -> Project URL and anon public key.
// Leave them as PASTE_... and chat still works across tabs on this device.
const SUPABASE_URL = "PASTE_YOUR_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

// Next Gameweek deadline: Gameweek 11, Saturday 21 Nov 2026, 11:00 GMT.
// That is 2:00pm EAT. Verified from the official FPL API on 7 Nov 2026.
const NEXT_DEADLINE = new Date("2026-11-21T11:00:00Z");

// How long to wait for the live FPL data before giving up and keeping the
// sample. Short on purpose: the fetch should feel fast. 7 seconds.
const LIVE_FETCH_TIMEOUT_MS = 7000;

// Sample players, as of Gameweek 9 (before Gameweek 10 finished).
// These numbers come from FPL / The Scout / FPL Hub on 3-6 Nov 2026:
// De Cuyper 69 pts (top scorer), Haaland 68, Gabriel 58, Barry 55,
// Raya 54, Isak 53, Evanilson 52, Verbruggen 51, Joao Pedro 47.
// "form" here is just points per game so far — simple and honest.
const samplePlayers = [
  { name: "Maxim De Cuyper", team: "Brighton", position: "DEF", price: 5.4, points: 69, form: 7.7, note: "Top scorer in the game. 2 goals, 4 assists." },
  { name: "Erling Haaland", team: "Man City", position: "FWD", price: 15.8, points: 68, form: 7.6, note: "9 goals in 9 games. The safe captain." },
  { name: "Gabriel", team: "Arsenal", position: "DEF", price: 6.0, points: 58, form: 6.4, note: "Goals, clean sheets and defensive points." },
  { name: "Barry", team: "Everton", position: "FWD", price: 5.7, points: 55, form: 6.1, note: "Cheap forward who starts every week." },
  { name: "David Raya", team: "Arsenal", position: "GK", price: 6.2, points: 54, form: 6.0, note: "Clean sheets behind the best defence." },
  { name: "Alexander Isak", team: "Liverpool", position: "FWD", price: 9.2, points: 53, form: 6.6, note: "6 league goals in 8 games." },
  { name: "Evanilson", team: "Bournemouth", position: "FWD", price: 6.5, points: 52, form: 5.8, note: "Great value. 8.1 points per £1m." },
  { name: "Bart Verbruggen", team: "Brighton", position: "GK", price: 4.6, points: 51, form: 5.7, note: "Cheapest way into a top keeper." },
  { name: "Joao Pedro", team: "Chelsea", position: "FWD", price: 7.7, points: 47, form: 5.2, note: "Owned by a third of managers." },
  { name: "Mohammed Kudus", team: "Spurs", position: "MID", price: 6.6, points: 44, form: 4.9, note: "3 assists in 5 games. Spurs face 3 of the bottom 6 next." }
];

// Sample fixtures for Gameweek 10, from the FPL Scout preview.
// Live fixtures replace these when the live data loads.
const sampleFixtures = [
  { match: "Everton v Coventry City", note: "Gameweek 10 opener" },
  { match: "Nottingham Forest v Man City", note: "Sat 7 Nov, 8:30pm EAT — Haaland away" },
  { match: "Arsenal v Hull", note: "Arsenal at home — Gabriel and Raya" },
  { match: "Liverpool v Crystal Palace", note: "Isak away at Palace" }
];

// Seed chat messages, so Ghost Chat is never empty.
const seedChat = [
  { name: "Ghost 👻", message: "Welcome to Ghost Chat! Who are you captaining this week?", time: "7 Nov", mine: false },
  { name: "TEE", message: "Haaland again. He never lets me down.", time: "7 Nov", mine: false },
  { name: "Ghost 👻", message: "De Cuyper is the real hidden gem. 69 points for £5.4m!", time: "7 Nov", mine: false }
];

// The players currently on screen. Starts as the sample, live data may replace it.
let currentPlayers = samplePlayers;
let usingLiveData = false;

// The display name typed into chat. We remember it so the user does not
// have to retype it every time they send a message or reload the page.
let chatName = localStorage.getItem("ghost-chat-name") || "";

// Show one player as a row in a list.
function showPlayerRow(listElement, player) {
  const row = document.createElement("div");
  row.className = "player-row";
  const value = (player.points / player.price).toFixed(1);
  row.innerHTML =
    "<div><strong>" + player.name + "</strong> — " + player.team +
    "<div class='meta'>" + player.position + " · £" + player.price + "m · " + player.note + "</div></div>" +
    "<div class='points'>" + player.points + " pts<br><span class='meta'>" + value + " pts/£1m</span></div>";
  listElement.appendChild(row);
}

// Fill the three big dashboard cards from the player list.
function showDashboardCards() {
  const topScorer = [...currentPlayers].sort((a, b) => b.points - a.points)[0];
  const bestForm = [...currentPlayers].sort((a, b) => b.form - a.form)[0];
  const bestValue = [...currentPlayers].sort((a, b) => (b.points / b.price) - (a.points / a.price))[0];

  document.getElementById("top-scorer").textContent = topScorer.name;
  document.getElementById("top-scorer-detail").textContent = topScorer.points + " pts · " + topScorer.team + " · £" + topScorer.price + "m";
  document.getElementById("best-form").textContent = bestForm.name;
  document.getElementById("best-form-detail").textContent = bestForm.form + " pts per game · " + bestForm.team;
  document.getElementById("best-value").textContent = bestValue.name;
  document.getElementById("best-value-detail").textContent = (bestValue.points / bestValue.price).toFixed(1) + " pts per £1m · £" + bestValue.price + "m";
}

// Fill the plain-words tips list.
function showTips() {
  const tips = [
    "Captain: Haaland. He has 9 goals in 9 games and is the safe pick.",
    "Bench: any player facing Arsenal or Man City this week.",
    "Transfer in: De Cuyper (£5.4m) — top scorer in the game, and cheap.",
    "Transfer in: Kudus (£6.6m) — 3 assists in 5 games, and Spurs have easy fixtures next.",
    "Transfer out: only if a player is injured or not starting. Do not chase one bad week."
  ];
  const list = document.getElementById("tips-list");
  list.innerHTML = "";
  tips.forEach(function (tip) {
    const item = document.createElement("li");
    item.textContent = tip;
    list.appendChild(item);
  });
}

// Show the top 5 players by points on the dashboard.
function showTopPlayers() {
  const list = document.getElementById("top-players");
  list.innerHTML = "";
  const topFive = [...currentPlayers].sort((a, b) => b.points - a.points).slice(0, 5);
  topFive.forEach(function (player) { showPlayerRow(list, player); });
}

// Show all players, filtered by the search box.
function showAllPlayers() {
  const search = document.getElementById("player-search").value.toLowerCase();
  const list = document.getElementById("all-players");
  list.innerHTML = "";
  const found = currentPlayers.filter(function (player) {
    return player.name.toLowerCase().includes(search) || player.team.toLowerCase().includes(search);
  });
  if (found.length === 0) {
    list.textContent = "No player matches that search.";
    return;
  }
  found.forEach(function (player) { showPlayerRow(list, player); });
}

// Run the Ghost Scout filters and show the hidden gems.
function runScout() {
  const position = document.getElementById("filter-position").value;
  const maxPrice = Number(document.getElementById("filter-price").value);
  const sortBy = document.getElementById("filter-sort").value;
  const list = document.getElementById("scout-results");
  list.innerHTML = "";

  let gems = currentPlayers.filter(function (player) {
    return (position === "all" || player.position === position) && player.price <= maxPrice;
  });
  if (sortBy === "form") gems.sort((a, b) => b.form - a.form);
  if (sortBy === "value") gems.sort((a, b) => (b.points / b.price) - (a.points / a.price));
  if (sortBy === "points") gems.sort((a, b) => b.points - a.points);

  if (gems.length === 0) {
    list.textContent = "No gems match those filters. Raise the max price a little.";
    return;
  }
  gems.slice(0, 8).forEach(function (player) { showPlayerRow(list, player); });
}

// Show the fixtures list.
function showFixtures(fixtures) {
  const list = document.getElementById("fixtures-list");
  list.innerHTML = "";
  fixtures.forEach(function (game) {
    const row = document.createElement("div");
    row.className = "fixture-row";
    row.innerHTML = "<strong>" + game.match + "</strong><div class='small'>" + game.note + "</div>";
    list.appendChild(row);
  });
}

// Update the countdown every second.
function startCountdown() {
  const box = document.getElementById("countdown");
  function tick() {
    const now = new Date();
    const gap = NEXT_DEADLINE - now;
    if (gap <= 0) { box.textContent = "Deadline has passed — Gameweek 11 is live!"; return; }
    const days = Math.floor(gap / (1000 * 60 * 60 * 24));
    const hours = Math.floor((gap / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((gap / (1000 * 60)) % 60);
    const seconds = Math.floor((gap / 1000) % 60);
    box.textContent = days + "d " + hours + "h " + minutes + "m " + seconds + "s";
  }
  tick();
  setInterval(tick, 1000);
}

// Switch tabs when a tab button is clicked.
function setupTabs() {
  const buttons = document.querySelectorAll(".tab");
  buttons.forEach(function (button) {
    button.addEventListener("click", function () {
      buttons.forEach(function (other) { other.classList.remove("active"); });
      button.classList.add("active");
      document.querySelectorAll(".panel").forEach(function (panel) { panel.classList.remove("active"); });
      document.getElementById("tab-" + button.dataset.tab).classList.add("active");
    });
  });
}

// Fetch helper: try one URL with a short timeout so the fetch feels fast.
// If it does not answer in time, we abort and move on to the next URL
// (or give up and keep the sample data). Returns the JSON or null.
async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    clearTimeout(timer);
    return null; // timed out or network error — caller tries the next URL
  }
}

// Show the user's saved FPL account details in the dashboard box.
// account = { name, points } or null to hide the box.
function showAccountDetails(account) {
  const box = document.getElementById("account-box");
  const detail = document.getElementById("account-detail");
  if (!account) { box.style.display = "none"; return; }
  detail.innerHTML = "<strong>" + account.name + "</strong> — " +
    (account.points || 0) + " points in total. " +
    (account.gameweek != null ? "Gameweek " + account.gameweek + ": " + (account.gwPoints || 0) + " pts." : "");
  box.style.display = "block";
}

// Try to load the user's team by saved ID, quickly, so the dashboard can
// show account details soon after load. Silent if it fails.
async function tryAccountDetails() {
  const savedId = localStorage.getItem("fpl-team-id");
  if (!savedId) return;
  // Pre-fill the team-id box so the user sees it remembered.
  document.getElementById("team-id").value = savedId;
  const urls = [
    "https://fantasy.premierleague.com/api/entry/" + savedId + "/",
    "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://fantasy.premierleague.com/api/entry/" + savedId + "/")
  ];
  for (const url of urls) {
    const data = await fetchWithTimeout(url, LIVE_FETCH_TIMEOUT_MS);
    if (data && data.name) {
      showAccountDetails({
        name: data.name,
        points: data.summary_overall_points,
        gameweek: data.current_event,
        gwPoints: data.summary_event_points
      });
      return;
    }
  }
  // Could not load — leave the box hidden, no scary message on the dashboard.
}

// Try to load live FPL player data. If it fails or is slow, keep the sample.
// Each URL gets the full timeout; we try direct first, then a proxy.
async function tryLiveData() {
  const badge = document.getElementById("data-badge");
  const urls = [
    "https://fantasy.premierleague.com/api/bootstrap-static/",
    "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://fantasy.premierleague.com/api/bootstrap-static/")
  ];
  for (const url of urls) {
    const data = await fetchWithTimeout(url, LIVE_FETCH_TIMEOUT_MS);
    if (!data || !data.elements || data.elements.length === 0) continue;
    // Turn the live FPL list into our simple player shape.
    const teams = {};
    data.teams.forEach(function (team) { teams[team.id] = team.name; });
    const positions = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
    const livePlayers = data.elements
      .filter(function (p) { return p.minutes > 300; })
      .map(function (p) {
        return {
          name: p.first_name + " " + p.second_name,
          team: teams[p.team] || "",
          position: positions[p.element_type] || "",
          price: p.now_cost / 10,
          points: p.total_points,
          form: Number(p.form) || 0,
          note: p.goals_scored + " goals, " + p.assists + " assists"
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 60);
    if (livePlayers.length < 10) continue;
    currentPlayers = livePlayers;
    usingLiveData = true;
    badge.textContent = "Live data ✓";
    badge.style.background = "#2ee6a8";
    // Refresh every screen that shows players with the live list.
    showDashboardCards();
    showTopPlayers();
    showAllPlayers();
    runScout();
    return;
  }
  badge.textContent = "Showing sample data — live data unavailable";
}

// Load my team by FPL team ID. Live fetch first, honest message if it fails.
// We also remember the ID so the dashboard can show account details next time.
async function loadMyTeam() {
  const teamId = document.getElementById("team-id").value.trim();
  const message = document.getElementById("team-message");
  const list = document.getElementById("my-team");
  list.innerHTML = "";
  if (!teamId) { message.textContent = "Type your team ID first."; return; }
  // Remember the ID for next time (used by tryAccountDetails on next load).
  localStorage.setItem("fpl-team-id", teamId);
  message.textContent = "Loading your team…";
  const urls = [
    "https://fantasy.premierleague.com/api/entry/" + teamId + "/",
    "https://api.allorigins.win/raw?url=" + encodeURIComponent("https://fantasy.premierleague.com/api/entry/" + teamId + "/")
  ];
  for (const url of urls) {
    const data = await fetchWithTimeout(url, LIVE_FETCH_TIMEOUT_MS);
    if (!data || !data.name) continue;
    message.textContent = "Team: " + data.name + " — " + (data.summary_overall_points || 0) + " points in total. Your players load from the live entry page; pick lists are in the Players tab.";
    // Show account details on the dashboard too, straight away.
    showAccountDetails({
      name: data.name,
      points: data.summary_overall_points,
      gameweek: data.current_event,
      gwPoints: data.summary_event_points
    });
    return;
  }
  message.textContent = "Could not load that team ID live (FPL blocks direct lookups from a plain web page). Check the ID on fantasy.premierleague.com — it is the number after /entry/ in your Points page address.";
}

// ===========================================================================
//  GHOST CHAT  —  the gameweek chat
//  ---------------------------------------------------------------------------
//  This lets FPL managers talk to each other. You type a display name and a
//  message, hit Send (or press Enter), and your message appears in the list.
//
//  How "chat with other players" works here, in plain words:
//   1. Every message is saved in the browser's localStorage ("ghost-chat").
//   2. When a message is saved, other tabs open on THIS browser get a
//      "storage" event and refresh their chat instantly. So open the page
//      in two tabs and the two of you can chat live — like a mini chat app.
//   3. If you paste real Supabase keys at the top of this file, messages are
//      also sent to a shared online table, so EVERYONE (not just your tabs)
//      can see and send messages. The local chat keeps working as a backup.
//
//  Comments below walk through each step.
// ===========================================================================

// Check if Supabase online chat is set up (keys are not still placeholders).
function chatIsOnline() {
  return SUPABASE_URL.indexOf("PASTE_") !== 0 && SUPABASE_ANON_KEY.indexOf("PASTE_") !== 0;
}

// Read the chat messages saved on this device.
function readLocalChat() {
  try {
    return JSON.parse(localStorage.getItem("ghost-chat") || "[]");
  } catch (error) {
    return [];
  }
}

// Show the chat messages, newest first. Messages you sent get a different
// colour (orange) so the chat reads like a normal chat app.
function showChat(messages) {
  const list = document.getElementById("chat-messages");
  list.innerHTML = "";
  // Newest first: flip the array so the latest message is at the top.
  const newestFirst = [...messages].reverse();
  newestFirst.forEach(function (chat) {
    const row = document.createElement("div");
    // "mine" is true only for messages sent with THIS tab's display name.
    // We compare names here (not a saved flag) so in another tab, using a
    // different display name, your message correctly shows on their side.
    const mine = chat.name === chatName && chatName !== "";
    row.className = "chat-row" + (mine ? " mine" : "");
    row.innerHTML =
      "<span class='chat-name'>" + chat.name + "</span> " +
      "<span class='chat-time'>" + (chat.time || "") + "</span>" +
      "<div class='chat-text'>" + chat.message + "</div>";
    list.appendChild(row);
  });
}

// Load chat to show on screen.
//  - If Supabase is set up, pull the latest online messages.
//  - Otherwise show the messages saved on this device (or the seed chat
//    if there are none yet), and note that chat is local for now.
async function loadChat() {
  const note = document.getElementById("chat-note");
  if (chatIsOnline()) {
    note.textContent = "Online chat — messages are shared with everyone.";
    try {
      const data = await fetchWithTimeout(
        SUPABASE_URL + "/rest/v1/fpl_chat?select=*&order=created_at.desc&limit=30",
        LIVE_FETCH_TIMEOUT_MS
      );
      if (data) {
        showChat(data.map(function (row) {
          // Online messages from other people; mark none as "mine" here
          // because the server does not know your display name.
          return {
            name: row.name,
            message: row.message,
            time: (row.created_at || "").slice(0, 10),
            mine: row.name === chatName
          };
        }));
        return;
      }
    } catch (error) { /* fall through to local chat */ }
  }
  // Local-only chat. Explain how to make it shared.
  note.textContent = "Chat works across tabs on this browser. To share it with everyone online, paste your Supabase URL and anon key at the top of app.js — the SQL is in README.md.";
  const saved = readLocalChat();
  showChat(saved.length > 0 ? saved : seedChat);
}

// Send a chat message. Saves locally (so other tabs see it) and, if set up,
// sends to Supabase so everyone online sees it too.
async function sendChat() {
  const nameBox = document.getElementById("chat-name");
  const messageBox = document.getElementById("chat-message");
  const name = nameBox.value.trim() || "Ghost 👻";
  const message = messageBox.value.trim();
  if (!message) return; // do not send empty messages

  // Remember the display name for next time and for marking "mine".
  chatName = name;
  localStorage.setItem("ghost-chat-name", name);

  // Build the new message with a short, readable timestamp.
  const newChat = {
    name: name,
    message: message,
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    mine: true
  };

  // If online chat is set up, push the message to Supabase for everyone.
  if (chatIsOnline()) {
    try {
      await fetch(SUPABASE_URL + "/rest/v1/fpl_chat", {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({ name: name, message: message })
      });
    } catch (error) { /* message still saves locally below */ }
  }

  // Always save the message on this device (keeps the last 50).
  const saved = readLocalChat();
  saved.push(newChat);
  localStorage.setItem("ghost-chat", JSON.stringify(saved.slice(-50)));

  // Clear the input and refresh the chat list.
  messageBox.value = "";
  loadChat();
}

// ===========================================================================
//  KEY-PRESS GHOSTS
//  ---------------------------------------------------------------------------
//  Every time the user presses a key, one little Halloween ghost pops up at
//  a random spot on the screen, floats up, and fades away. One ghost per key,
//  and the position is random each time. It never blocks anything
//  (pointer-events: none), so it is pure decoration.
// ===========================================================================

// A few ghost faces and spooky emojis to pick from at random.
const ghostFaces = ["👻", "🎃", "💀", "🧟", "🦇", "🕸️"];

// Make one ghost appear at a random spot, then remove it after the animation.
function spawnKeyGhost() {
  const ghost = document.createElement("div");
  ghost.className = "key-ghost";
  // Pick a random ghost face and a random spot on the screen.
  ghost.textContent = ghostFaces[Math.floor(Math.random() * ghostFaces.length)];
  ghost.style.left = Math.random() * 90 + "vw";   // 0%–90% across the screen
  ghost.style.top = Math.random() * 70 + "vh";    // 0%–70% down the screen
  document.body.appendChild(ghost);
  // Remove the ghost after the float-up animation finishes (1.6s).
  setTimeout(function () { ghost.remove(); }, 1700);
}

// Listen for any key press anywhere on the page and spawn one ghost.
// We ignore keys pressed while typing in an input/textarea so chat and
// search still feel normal (no ghosts spam while you type a message).
function setupKeyGhosts() {
  document.addEventListener("keydown", function (event) {
    const tag = (event.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    spawnKeyGhost();
  });
}

// Start the app: show sample data immediately, then try live data in the
// background. This is the key fix — the dashboard is never empty on load.
function startApp() {
  // 1. Show everything from the sample data RIGHT NOW.
  showDashboardCards();
  showTips();
  showTopPlayers();
  showAllPlayers();
  runScout();
  showFixtures(sampleFixtures);
  startCountdown();
  setupTabs();
  setupKeyGhosts();

  // 2. Set up the chat: pre-fill the saved display name and load messages.
  document.getElementById("chat-name").value = chatName;
  loadChat();
  // When another tab saves a chat message, this tab refreshes instantly.
  // That is how two tabs (two "players") chat with each other live.
  window.addEventListener("storage", function (event) {
    if (event.key === "ghost-chat") loadChat();
  });

  // 3. Wire up the buttons and inputs.
  document.getElementById("filter-button").addEventListener("click", runScout);
  document.getElementById("player-search").addEventListener("input", showAllPlayers);
  document.getElementById("team-button").addEventListener("click", loadMyTeam);
  document.getElementById("chat-button").addEventListener("click", sendChat);
  document.getElementById("chat-message").addEventListener("keydown", function (event) {
    if (event.key === "Enter") sendChat();
  });

  // 4. In the background, try the live FPL data and the user's account.
  //    These are fast (short timeout) and silent if they fail — the sample
  //    data already on screen is the fallback.
  tryLiveData();
  tryAccountDetails();
}

startApp();
