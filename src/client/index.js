(function () {
  "use strict";

  const listEl = document.getElementById("session-list");
  const emptyEl = document.getElementById("empty-state");
  const countEl = document.getElementById("session-count");
  const themeToggleEl = document.getElementById("theme-toggle");

  const THEME_KEY = "claude-display:theme";
  const LAST_VISITED_KEY = "claude-display:last-visited";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function applyTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {
      /* ignore */
    }
  }

  themeToggleEl.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  });

  function readLastVisited() {
    try {
      return JSON.parse(localStorage.getItem(LAST_VISITED_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function basenameOf(path) {
    if (!path || typeof path !== "string") return null;
    const trimmed = path.replace(/\/+$/, "");
    const idx = trimmed.lastIndexOf("/");
    return idx >= 0 ? trimmed.slice(idx + 1) : trimmed;
  }

  function relTime(ts) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    if (diff < 0) return "just now";
    const s = Math.floor(diff / 1000);
    if (s < 30) return "just now";
    if (s < 60) return s + "s ago";
    const m = Math.floor(s / 60);
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    if (d < 7) return d + "d ago";
    const dt = new Date(ts);
    return dt.toLocaleDateString();
  }

  function shortId(id) {
    if (!id) return "";
    return id.length > 12 ? id.slice(0, 8) : id;
  }

  function renderRow(session, lastVisited) {
    const a = document.createElement("a");
    a.className = "session-row";
    a.href = "/s/" + encodeURIComponent(session.id);

    const left = document.createElement("div");
    left.className = "session-left";

    const head = document.createElement("div");
    head.className = "session-head";

    const project = document.createElement("span");
    project.className = "session-project";
    const name = basenameOf(session.cwd) || "Untitled session";
    project.textContent = name;
    project.title = session.cwd || session.id;
    head.appendChild(project);

    const idChip = document.createElement("span");
    idChip.className = "session-id";
    idChip.textContent = shortId(session.id);
    head.appendChild(idChip);

    const visitedAt = lastVisited[session.id] || 0;
    if (session.lastActivity > visitedAt && session.pushCount > 0) {
      const dot = document.createElement("span");
      dot.className = "session-unread";
      dot.title = "Unread pushes";
      head.appendChild(dot);
    }
    left.appendChild(head);

    const lastPush = document.createElement("p");
    lastPush.className = "session-last-push";
    if (session.lastPushTitle) {
      lastPush.textContent = session.lastPushTitle;
    } else {
      const span = document.createElement("span");
      span.className = "none";
      span.textContent = "no pushes yet";
      lastPush.appendChild(span);
    }
    left.appendChild(lastPush);

    const meta = document.createElement("div");
    meta.className = "session-meta";
    const parts = [];
    if (session.cwd) parts.push(session.cwd);
    if (session.lastPushKind) parts.push(session.lastPushKind);
    meta.textContent = parts.join("  ·  ");
    if (parts.length === 0) meta.hidden = true;
    left.appendChild(meta);

    a.appendChild(left);

    const right = document.createElement("div");
    right.className = "session-right";

    const count = document.createElement("div");
    count.className = "session-pushcount";
    count.textContent =
      session.pushCount === 1 ? "1 push" : session.pushCount + " pushes";
    right.appendChild(count);

    const when = document.createElement("div");
    when.className = "session-when";
    when.textContent = relTime(session.lastActivity);
    right.appendChild(when);

    a.appendChild(right);

    return a;
  }

  async function load() {
    let sessions = [];
    try {
      const r = await fetch("/api/sessions");
      const data = await r.json();
      sessions = data.sessions || [];
    } catch (err) {
      console.error("[claude-display] failed to load sessions", err);
    }

    const lastVisited = readLastVisited();
    listEl.innerHTML = "";
    if (sessions.length === 0) {
      emptyEl.hidden = false;
      countEl.textContent = "— sessions";
      return;
    }
    emptyEl.hidden = true;
    countEl.textContent =
      sessions.length === 1 ? "1 session" : sessions.length + " sessions";

    for (const s of sessions) {
      const row = renderRow(s, lastVisited);
      listEl.appendChild(row);
    }
  }

  load();
  setInterval(load, 4000);
})();
