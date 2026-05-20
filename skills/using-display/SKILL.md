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

### 1. Let the tool own the canvas — and adapt EVERYTHING else to the host's color scheme

The host iframe applies its own canvas color and adapts to the user's light/dark mode preference. **Do not** set `background` on `body` or your top-level wrapper — it fights the host and creates a visible block of the wrong shade when the user is in the opposite mode.

But because the tool owns the canvas, **text color and card backgrounds must also respond to light/dark mode** — you can't just hardcode `color: #111` or your whole push goes invisible the moment the host frame is in dark mode (this has bitten us — black text on a dark canvas).

Use CSS `light-dark()` to swap. The iframe inherits the user's system scheme via `color-scheme`:

```html
<style>
  :root { color-scheme: light dark; }
  .wrap {
    color: light-dark(#111, #e5e7eb);
    padding: 56px 40px 96px;
    font-family: -apple-system, 'Inter', system-ui, sans-serif;
  }
  .wrap *, .wrap h1, .wrap h2, .wrap p, .wrap li, .wrap span, .wrap div, .wrap b, .wrap em { color: inherit; }
  /* Cards float above whatever canvas the tool gives us — also adapt to mode */
  .card {
    background: light-dark(#fff, #111827);
    border: 1px solid light-dark(#e5e5e5, #1f2937);
    border-radius: 12px;
    padding: 24px;
  }
  /* Same treatment for any badge, chip, accent shade you previously hardcoded */
  .badge { background: light-dark(#f0fdf4, #052e16); color: light-dark(#028043, #6ee7b7); }
</style>
<div class="wrap">…</div>
```

If you want a particular mode's *feel* regardless of host (e.g. always-dark for a code-heavy push), then OWN the canvas too — `background: #0b0f17; color: #e5e7eb;` on `.wrap` — and commit fully to dark. That's the superpowers-companion pattern, not the claude-display pattern.

**Locked-mode containers must set their own text color (inverse rule).** Any container that paints a *fixed*, non-adaptive background — a terminal/code block locked to dark, an always-dark callout, a hero filled with a brand color — MUST also set its own text color AND re-scope `color: inherit` to its children. Otherwise it inherits `color: light-dark(…)` from `.wrap` and the text flips to the wrong shade for that container's bg in one of the two modes (e.g. dark text on a locked-dark terminal in light host mode = invisible). Background and text are a pair: commit one, commit the other.

```css
.terminal {
  background: #0f172a;  /* locked dark, ignores host mode */
  color: #e6edf3;       /* MUST set text too */
}
.terminal * { color: inherit; }  /* re-scope so .wrap's light-dark() doesn't leak in */
```

Failure modes that have bitten:
- Setting `color: #111` only inside white cards → page-level titles/lede go invisible on dark host.
- Hardcoding `color: #111` on `.wrap` with no `light-dark()` → entire push goes invisible on dark host.
- Hardcoding `background: #fff` on cards with no `light-dark()` → white cards on a dark canvas look like blown-out screens. Adapt card bg too.
- Painting a locked-dark terminal but letting it inherit `.wrap`'s light-mode `#111` text → black-on-dark inside the terminal block.

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
  html: "<style>:root{color-scheme:light dark}.wrap{color:light-dark(#111,#e5e7eb);padding:48px 40px;font-family:-apple-system,Inter,system-ui,sans-serif}.wrap *{color:inherit}.card{background:light-dark(#fff,#111827);border:1px solid light-dark(#e5e5e5,#1f2937);border-radius:12px;padding:24px;margin-bottom:24px}</style><div class='wrap'><h2>Two ways to ask</h2><div class='card'><h3>Now</h3><p>Select a payment method to continue</p></div><div class='card'><h3>Proposed</h3><p>How would you like to pay?</p></div></div>"
})
```
