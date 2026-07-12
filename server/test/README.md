# Server tests

Integration tests: each one boots a real server (`npx tsx src/index.ts`) against a throwaway
workspace in `$TMPDIR` and talks to it over HTTP/WebSocket, the way a browser does. Nothing is
mocked — what these guard is the wiring (path confinement, auth, session bookkeeping) that unit
tests of the pure functions cannot see.

The harness pins `agentDir` inside the temp workspace, so runs never touch your real
`~/.pi/agent` (no reading your extensions, no writing your sessions).

```bash
npm run test --workspace server        # offline: no model auth needed, no tokens spent
npm run test:live --workspace server   # drives real agent turns (needs model auth, costs tokens)
```

| Suite | Guards |
|-------|--------|
| `auth.test.mjs` | WebSocket token check (valid connects; missing/wrong closes 4401 with no data), `/branding` Bearer, `/health` session-id redaction, unchanged behavior without a token |
| `files-raw.test.mjs` | `/files/raw`: confinement (traversal, absolute paths, symlink escapes → 404), 1 MiB cap → 413, image content types, non-images served as `attachment` (an HTML file must never render on our origin), SVG served with a scripts-off CSP, DNS-rebinding Host guard on token-less servers, token gating |
| `live/conversation-branching.test.mjs` | Editing a past prompt branches the session and the original exchange stays restorable *with its reply* (`tipId`); navigating to the turn itself rewinds with composer prefill; unknown entry ids refused; **the phantom-bubble regression** — a message an extension swallowed is echoed but never persisted, so pairing must fail closed instead of handing that bubble the previous turn's entry id (aligning by position would make an edit rewind the wrong turn) |

`fixtures/swallow-extension.ts` is what produces that phantom: an `input` handler returning
`{ action: "handled" }`, exactly like an extension slash command.
