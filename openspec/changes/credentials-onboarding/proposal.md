## Why

pi-outpost embeds the pi SDK, so `npx pi-outpost` needs no pi installation — only model credentials. With none, the server starts happily, the UI connects, and nothing looks wrong until the first message, which fails with a dead end:

> No API key found for the selected model. Use `/login` to log into a provider via OAuth or API key. See: `<…>/node_modules/@earendil-works/pi-coding-agent/docs/providers.md`

`/login` is a pi TUI command that does not exist in pi-outpost, and the path points inside `node_modules`. The user has no way forward from either surface. The failure is also late: the server had `[pi] No models available` at startup and said nothing the user would see.

This bites hardest in the two configurations the project actively recommends: `npx pi-outpost` (a newcomer with no `~/.pi/agent`) and an isolated `agentDir` (which by definition starts with no `auth.json`, and can only be filled today by copying a file by hand).

## What Changes

- Detect at startup that no model has usable credentials, and say so on both surfaces instead of failing on the first prompt.
- **Web onboarding**: when no provider is configured, the UI shows a first-run screen — pick a provider, paste an API key — instead of a chat that cannot answer. The key is stored in `<agentDir>/auth.json` through the SDK's `AuthStorage`, the model registry is refreshed and the session rebuilt, and the user lands in a working chat without restarting the server.
- **Custom OpenAI-compatible endpoints**, the corporate case: the same screen declares a provider that speaks the OpenAI API — base URL, key, model id, and the `compat` flags (`supportsDeveloperRole`, `supportsReasoningEffort`) that gateways like vLLM and SGLang need to work at all. It is written to `<agentDir>/models.json` through the SDK, so today's hand-written file becomes a form.
- **`pi-outpost login`**: a terminal command for headless and scripted setups (`--provider`, key read from stdin, never from argv — same rule as the deliberately absent `--token` flag).
- Report credential status to the client (which providers are configured, whether any model is usable), so the UI can also surface an expired or removed credential later, not just a first run.
- **Name the TLS failure instead of hiding it**: behind a corporate TLS-inspecting proxy, an unknown CA surfaces today as an opaque `fetch failed`. The error SHALL say that the certificate could not be verified and name `NODE_EXTRA_CA_CERTS` as the fix. No option that weakens TLS is added — see the design.
- API keys only in this version; OAuth (`AuthStorage.login()`) is left for a follow-up.

**Security.** Accepting a credential over HTTP is a new write surface, so it inherits the server's existing rule rather than inventing one: the endpoint requires the same `server.token` as `/ws`, and the server already refuses to bind off-loopback without a token. On loopback with no token, whoever can reach the server can already drive an agent with bash/edit tools — writing a key there is not a new escalation. Stored keys are never sent back to a client; the UI receives a configured/not-configured status only.

## Capabilities

### New Capabilities

- `credentials`: discover, report, and store model provider credentials — including a custom OpenAI-compatible endpoint — through first-run onboarding in the web UI and `pi-outpost login` in the terminal.

### Modified Capabilities

- `api`: the session snapshot carries credential status, and a new client message stores a provider credential or declares a custom provider.
- `cli`: a `login` subcommand.
- `config`: state where credentials and custom providers are read from and written to (`<agentDir>/auth.json`, `<agentDir>/models.json`), which the current documentation leaves implicit.
- `model`: a provider declared at runtime joins the model list without a restart.

## Impact

- Protocol: `shared/src/protocol.ts` (snapshot field + `set_credential` message).
- Server: `server/src/index.ts` (credential status, message handling, registry refresh + session rebuild), `server/src/cli.ts` (`login`).
- Web: new onboarding component, `web/src/App.tsx`, `web/src/useAgent.ts`.
- Docs: the README's requirements block, which currently sends users to `~/.pi/agent/auth.json` even when their config names another `agentDir`.
