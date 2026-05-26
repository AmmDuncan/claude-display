# Visual regression suite

A fixture battery + contrast audit that renders every built-in primitive across
the full preset × theme × density matrix and flags text that washes out against
its surface. Built to catch the recurring class of bug where a primitive's text
colour and background fall out of sync (the `.window` / `.code` washout family).

## Pieces

- **`fixtures.mjs`** — one push per primitive (`.window`, `.window.dark`,
  `.code`/`.terminal`, `.card`, chips, table, prose, `.full-bleed`, …) plus a few
  realistic composites (dashboard, dark-UI app, code walkthrough).
- **`audit-snippet.js`** — injected into every fixture before it's pushed. Runs
  inside the sandboxed iframe (the parent can't read it), walks every text node,
  composites translucent backgrounds over the host backdrop, computes the WCAG
  contrast ratio, and `postMessage`s a report up to the viewer window. Re-runs on
  host theme/preset/density changes. Also reports the iframe's resolved root state
  (theme/preset/ink/bg) for debugging.
- **`driver.mjs`** — pushes every fixture (with the audit injected) to a running
  easel server.

## Running it

```bash
# 1. Boot an isolated server from this checkout (separate port + data is keyed
#    by session id, so it won't touch your real easel sessions).
EASEL_PORT=7900 node dist/http-entry.js &

# 2. Push the fixtures.
node tests/visual/driver.mjs --port 7900 --session render-test

# 3. Open the viewer and collect audits. In any browser automation tool, open
#    http://localhost:7900/s/render-test, install a window 'message' listener
#    that collects `easel:audit` events keyed by `e.data.fixture`, scroll every
#    card into view (iframes lazy-render), then drive states with:
#       POST /api/config { "preset": "...", "theme": "...", "density": "..." }
#    (the viewer applies + re-broadcasts to iframes, which re-audit). Read back
#    the collected reports and flag any fixture with a non-empty `fails` array.
```

## Reading results

The signal is **theme-flip stability**: a primitive with a stable surface shows
the *same* worst-contrast ratio in light and dark host. A ratio that drops sharply
in one theme is the washout signature. Decorative low-contrast labels inside a
fixture are theme-stable and expected — they confirm the surface holds, they're
not engine failures.
