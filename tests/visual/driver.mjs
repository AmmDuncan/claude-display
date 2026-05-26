/**
 * Pushes every visual-regression fixture to a running easel server.
 *
 * Appends the contrast-audit snippet (with the fixture name substituted) to
 * each fixture body so the audit reports back to the viewer page under a known
 * name. Clears the target session first so re-runs start clean.
 *
 * Usage: node tests/visual/driver.mjs [--port 7900] [--session render-test]
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fixtures } from "./fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const port = arg("--port", "7900");
const session = arg("--session", "render-test");
const base = `http://127.0.0.1:${port}`;
const auditTpl = readFileSync(resolve(__dirname, "audit-snippet.js"), "utf8");

function withAudit(html, name) {
  const audit = auditTpl.replaceAll("__FIXTURE_NAME__", name);
  return `${html}\n<script>${audit}</script>`;
}

async function main() {
  await fetch(`${base}/api/sessions/${session}`, { method: "DELETE" }).catch(() => {});

  for (const fx of fixtures) {
    const res = await fetch(`${base}/api/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session,
        html: withAudit(fx.html, fx.name),
        title: fx.name,
        kind: fx.kind,
      }),
    });
    if (!res.ok) {
      console.error(`✗ ${fx.name}: ${res.status} ${await res.text()}`);
      process.exitCode = 1;
    } else {
      console.log(`✓ pushed ${fx.name}`);
    }
  }
  console.log(`\n${fixtures.length} fixtures → ${base}/s/${session}`);
}

main();
