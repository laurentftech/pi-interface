## Context

pi-outpost bundles the pi SDK (`@earendil-works/pi-coding-agent`), so credentials — not a pi installation — are the real prerequisite. The SDK resolves them through `AuthStorage`, backed by `<agentDir>/auth.json` (`createAgentSessionServices` builds it as `AuthStorage.create(join(agentDir, "auth.json"))`), with provider environment variables as the other source. `agentDir` is whatever the pi-outpost config names, defaulting to `~/.pi/agent`.

Measured current behaviour with an empty `agentDir` and no provider environment variables: the server starts, logs `[pi] No models available` (a warning nobody reads), selects a model with no usable auth, and the first prompt returns an error telling a web user to run `/login` — a pi TUI command pi-outpost does not have — and to read a file inside `node_modules`.

The SDK gives us everything needed to fix this without touching pi: `authStorage.set(provider, { type: "api_key", key })`, `authStorage.getAuthStatus(provider)`, `modelRegistry.getAvailable()`, `modelRegistry.hasConfiguredAuth(model)`, and `modelRegistry.refresh()` to reload after a write. `AuthStorage.login()` exists for OAuth and is deliberately left for later.

## Goals / Non-Goals

**Goals:**

- Fail early and legibly: an unconfigured server says so before the user types a message.
- Let a user go from `npx pi-outpost` to a working chat without leaving the browser, and without restarting the server.
- Serve headless deployments too, where no browser will ever open the UI.
- Make the credential file's real location (`<agentDir>/auth.json`) explicit, since an isolated `agentDir` — which the project recommends — starts empty.

**Non-Goals:**

- OAuth login (`AuthStorage.login()`), provider-specific consent flows, token refresh UI.
- Managing several credentials per provider, or editing `models.json` / custom providers.
- Any new secret store: credentials keep living where the SDK already puts them.
- Replacing provider environment variables, which keep working and keep winning where the SDK says they do.

## Decisions

### Report credential status in the session snapshot

The snapshot gains a credential block: which providers the registry knows, which are configured, and whether any usable model exists. The web client already reacts to the snapshot (`hello`, `session_replaced`), so onboarding needs no polling and no separate fetch, and the same field lets the UI flag a credential that stops working later — not just a first run.

Deriving "unconfigured" client-side from an empty model list was rejected: the model list is filtered for other reasons (`allowedModels`), so an empty list does not mean "no credentials", and conflating them would send a configured user to an onboarding screen.

### Store credentials through the SDK's AuthStorage, never by writing JSON

The server calls `authStorage.set(provider, { type: "api_key", key })` and then `modelRegistry.refresh()`. `AuthStorage` owns the file's schema and its locking (it refreshes OAuth tokens under a file lock, so several pi processes can share the file). Hand-writing `auth.json` would duplicate a format we do not own and race with any pi instance sharing the same `agentDir`.

### Re-point the session after the first credential lands, do not rebuild it

The session in flight was created against a model with no auth. After a successful write, the server refreshes the registry, switches the live session onto a usable model (`session.setModel`), and broadcasts a full snapshot — which is what carries the new model list and status. The user keeps the browser tab they already have; no restart, no reload.

Rebuilding the session through `replaceSession` was the first plan and is unnecessary: nothing about the session is broken, it was merely pointed at a model that could not answer. Rebuilding would also throw away a conversation, which matters for the case this feature will hit second — a credential that expires *mid-session*, where the user must not lose what they were doing to re-authenticate.

### Accept the key over the existing authenticated channel, on the existing threat model

The credential write is a new `set_credential` client message on the WebSocket, so it is covered by the token check that already guards `/ws` — no new endpoint, no second auth story. Two properties make this safe rather than merely convenient:

- The server already refuses to bind off-loopback without `server.token`, so a credential write is never reachable unauthenticated from a network.
- On loopback with no token, the caller can already run an agent with bash/edit tools; being able to store an API key is not an escalation over that.

Keys travel one way only. The snapshot reports a provider as configured or not; it never carries the stored key back, so a client that later loses the token cannot read what an earlier session stored.

A dedicated HTTPS endpoint was considered and rejected: it would need its own auth check, and the two could drift apart.

### Declare a custom OpenAI-compatible endpoint from the same screen

A provider that speaks the OpenAI API is not an `auth.json` entry — it is a `models.json` one (`providers.<name>` with `baseUrl`, `api: "openai-completions"`, `apiKey`, `models[]`). The onboarding screen therefore has two paths: a known provider (key only), or a custom endpoint (name, base URL, key, model id).

The `compat` flags are part of the form, not a detail: many OpenAI-compatible gateways (vLLM, SGLang, corporate proxies) reject the `developer` role and `reasoning_effort` that pi sends to reasoning-capable models, so `supportsDeveloperRole: false` / `supportsReasoningEffort: false` is the difference between a working endpoint and one that errors on every turn. A user who does not know this cannot guess it from a failure.

The declaration goes through `modelRegistry.registerProvider(name, config)` for the live session and is persisted to `<agentDir>/models.json`, so it survives a restart. The SDK reads that file but exposes no writer for it (unlike credentials, where `AuthStorage` owns the write), so pi-outpost writes it — in the SDK's format, merging into the existing `providers` map, never clobbering a file the user may have hand-written. We do not invent a pi-outpost-specific provider format: the schema and the resolution order stay the SDK's.

### Do not add a switch that disables TLS verification

A corporate TLS-inspecting proxy re-signs certificates with an internal CA. The correct fix is to trust that CA — `NODE_EXTRA_CA_CERTS=/path/corp-ca.pem`, which Node honours for `fetch` — and everything then verifies normally. The SDK exposes no TLS hook at all (no `rejectUnauthorized`, no `dispatcher`, no injectable `fetch`), so the only alternative would be to set `NODE_TLS_REJECT_UNAUTHORIZED=0` for the whole process.

We deliberately do not offer that as a config key. It disables verification for *every* outbound connection, including the one carrying the user's API key, and a flag in a file gets copied between machines and outlives the reason it was added — a keyless switch to intercept the agent's traffic is not something a configuration file should be able to turn on quietly. It remains available as an environment variable for whoever knowingly sets it at launch; that is the right blast radius for it.

What we do instead is stop hiding the failure: an unverifiable certificate reaches the user today as an opaque `fetch failed`. The error is detected (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `SELF_SIGNED_CERT_IN_CHAIN`, and kin) and reported as what it is — a certificate that could not be verified — naming `NODE_EXTRA_CA_CERTS` as the fix.

### `pi-outpost login` reads the key from stdin, never from argv

The CLI subcommand mirrors the rule that already forbids `--token`: a secret on the command line is readable by anyone who can list processes. `pi-outpost login --provider anthropic` prompts on a TTY, and reads stdin when piped, so a provisioning script can do `echo "$KEY" | pi-outpost login --provider anthropic` without the key ever appearing in `ps`.

## Risks / Trade-offs

- [A web form that stores API keys is a credential-write surface] → It rides the existing `/ws` token check, and the server already refuses to bind off-loopback without a token; on loopback the caller already has agent-level access.
- [A stored key is echoed back to a client] → The snapshot carries status only (`configured: true`), never the key.
- [Onboarding hides a real misconfiguration — e.g. `allowedModels` filtering everything out] → Status distinguishes "no credentials" from "no model available", so the screen tells the user which of the two happened.
- [The `agentDir` is read-only, or the process cannot write `auth.json`] → The write failure is reported to the UI as an actionable error naming the path, instead of a silent no-op; environment variables remain a working alternative.
- [Several pi processes share the `agentDir`] → Writes go through `AuthStorage`, which locks the file; we neither parse nor rewrite it ourselves.
- [A custom endpoint is declared without its `compat` flags and fails on every turn] → The flags are on the form, with what they do, not buried in a doc the user reaches after the failure.
- [Users behind a TLS proxy reach for `NODE_TLS_REJECT_UNAUTHORIZED=0` anyway] → The certificate error names `NODE_EXTRA_CA_CERTS` first, so the safe fix is the one they see; the unsafe one stays an environment variable they must set knowingly, never a config key that can spread.

## Migration Plan

Additive: an existing configured server never sees the onboarding screen, since its snapshot reports a usable model. The protocol gains one optional snapshot field and one client message, both ignorable by an older client. Rollback is removing the onboarding screen and the subcommand; nothing about the credential file's format or location changes, because we never owned it.

## Open Questions

- Which providers to list first in the UI, and whether to order them by what `models.json` knows or by a curated shortlist. Resolvable at implementation time from `modelRegistry`.
