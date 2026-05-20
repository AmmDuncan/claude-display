---
name: using-display
description: Use whenever a response is about to include a long explanation (>2 paragraphs), a UI mockup, a diagram, a side-by-side comparison, ≥3 options, a code diff / before-after, or a multi-step status view — push it to the claude-display MCP instead of dumping it in the terminal.
---

# using-display

The `claude-display` MCP gives this session a live browser tab the user keeps open in split-screen. The `display_push` tool appends a card to a single scrolling page. You push proactively. You do not ask.

## When to push (push)

- Explanation that would run >2 paragraphs in the terminal.
- Any UI mockup, wireframe, or layout proposal.
- Side-by-side comparisons, ≥3 options, decision matrices.
- Architecture / sequence / flow / state diagrams.
- Code diffs or before-after snippets where scanning visually helps.
- Multi-step progress, status snapshots, run summaries.
- Anything you'd otherwise format as a long markdown block with headings.

## When NOT to push (stay terminal)

- 1–2 lines.
- Clarifying questions or yes/no acknowledgements.
- A single short code block the user is about to copy.
- Direct answers to "what's the value of X" style queries.

## How to push

Call the `display_push` tool with:

- `html` — required. Full HTML body. Sandboxed in an iframe with `allow-scripts`. The wrapper injects baseline typography (off-white background, Inter sans, sane heading scale) so plain `<h1>/<h2>/<p>` markup looks right without extra CSS.
- `title` — short label shown in the card header. Use a sentence-case phrase, no trailing period.
- `kind` — freeform tag for the chip on the card: `mockup`, `diff`, `explanation`, `comparison`, `diagram`, `progress`, `status`, etc.

Reply in chat with **one line**: `pushed to display ↗ — #N` (or similar). Do not restate the content.

## Style

Matches global Rule 30 in `~/.claude/CLAUDE.md`. Two surface-specific rules that bite if you forget them:

### 1. Let the tool own the background

The host iframe applies its own canvas color and adapts to the user's light/dark mode preference. **Do not** set `background` on `body` or your top-level wrapper — it fights the host and creates a visible block of the wrong shade when the user flips modes.

Set **only**:
- Text colors (on a `.wrap` container that scopes `color: inherit` to every descendant — see snippet below)
- Card / section backgrounds (so cards still float visibly above whatever canvas the tool provides)

If you want a particular mode's feel, pick *card* colors that imply it (white cards = light feel; `#111827` cards = dark feel) but let the host canvas show through everywhere else.

Frame-mode-agnostic scaffold:

```html
<style>
  .wrap { color: #111; padding: 56px 40px 96px; font-family: -apple-system, 'Inter', system-ui, sans-serif; }
  .wrap *, .wrap h1, .wrap h2, .wrap p, .wrap li, .wrap span, .wrap div, .wrap b, .wrap em { color: inherit; }
  /* Cards still get their own bg so they read as cards: */
  .card { background: #fff; border: 1px solid #e5e5e5; border-radius: 12px; padding: 24px; }
  /* For a dark-mode-feel push, swap card bg to #111827 and .wrap color to #e5e7eb */
</style>
<div class="wrap">…</div>
```

The failure mode: setting `color: #111` only inside white cards leaves page-level titles/lede inheriting whatever the host frame chose, so half the type washes out depending on the user's mode.

### 2. Stack desktop mockups vertically — don't squeeze them side-by-side

The iframe is roughly 900 px wide. Two desktop-screen mockups in a 2-col grid each get ~430 px, which crushes column widths, wraps headings to 3 lines, and turns matrix/table cells unreadable. Stack vertically with a clear label above each ("**Now**", "**Proposed**") so each mock gets full width — the whole point of mocking a desktop view is to show it at desktop proportions.

Side-by-side is fine only for: narrow mobile-screen mockups, small cards, or short text columns that genuinely fit in half-width without distortion.

### 3. Other style rules (from Rule 30)

- Typography: 32 px+ section titles, 18–22 px body, 14 px uppercase eyebrows. Inter / system sans.
- Whitespace: 32–48 px card padding, 64+ px between sections. Companions are presentations, not dashboards.
- One accent colour, at most 3–4 instances per push.
- Visualisations are tangible (browser chrome, terminal windows, code editor frames, real device frames) — not abstract labeled rectangles connected by arrows. If a bullet list would communicate the same thing, rebuild the visual.
- No `<script>` tags that try to mutate the parent window — the sandbox blocks it anyway. Self-contained `<style>` is fine.

## Failure mode

If `display_push` errors with a missing session id, the SessionStart hook hasn't fired for this session yet. Mention it once in the terminal (`display unavailable — continuing without it`) and proceed. Do not retry every push.

## Example call (illustrative)

```
display_push({
  title: "PaymentMethodModal copy variants",
  kind: "comparison",
  html: "<style>.wrap{color:#111;padding:48px 40px;font-family:-apple-system,Inter,system-ui,sans-serif}.wrap *{color:inherit}.card{background:#fff;border:1px solid #e5e5e5;border-radius:12px;padding:24px;margin-bottom:24px}</style><div class='wrap'><h2>Two ways to ask</h2><div class='card'><h3>Now</h3><p>Select a payment method to continue</p></div><div class='card'><h3>Proposed</h3><p>How would you like to pay?</p></div></div>"
})
```
