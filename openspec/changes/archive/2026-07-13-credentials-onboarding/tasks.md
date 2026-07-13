## 1. Credential status

- [x] 1.1 Derive credential status from the SDK (`modelRegistry.getAvailable()`, `getProviderAuthStatus`, `authStorage.list()`): which providers are configured, whether a usable model exists, and which of "no credentials" / "no model available" applies.
- [x] 1.2 Add the status to `SessionSnapshot` in `shared/src/protocol.ts` and to the server's `snapshot()`, carrying no key.
- [x] 1.3 Replace the startup warning with a legible line naming the agent directory the credentials are missing from.

## 2. Storing a credential

- [x] 2.1 Add the `set_credential` client message to the protocol, and handle it in `handleClientMessage`: `authStorage.set(provider, { type: "api_key", key })`, then `modelRegistry.refresh()`.
- [x] 2.2 After a successful write, switch the live session onto a usable model and broadcast a fresh snapshot — no session rebuild, so a mid-session re-auth keeps the conversation.
- [x] 2.3 Report a write failure (unwritable `agentDir`) as an error naming the path, leaving the session untouched.
- [x] 2.4 Server test: an unconfigured server accepts `set_credential` and then reports a usable model — no restart.

## 3. Custom OpenAI-compatible endpoint

- [x] 3.1 Add the `declare_provider` message: validate name / base URL (http(s)) / key / model ids / optional `compat` flags.
- [x] 3.2 Register it with `modelRegistry.registerProvider()` for the live session, and persist it to `<agentDir>/models.json` in the SDK's format — no pi-outpost-specific schema.
- [x] 3.3 Rebuild the session so the declared model is immediately selectable; verify it survives a restart.
- [x] 3.4 Server test: declaring an endpoint against a stub OpenAI-compatible server yields a usable model.

## 4. TLS diagnosis

- [x] 4.1 Detect certificate-verification failures (`UNABLE_TO_VERIFY_LEAF_SIGNATURE`, `SELF_SIGNED_CERT_IN_CHAIN`, …) on model requests and report them as such, naming `NODE_EXTRA_CA_CERTS` — today they surface as an opaque `fetch failed`.
- [x] 4.2 Confirm no configuration key can disable TLS verification, and say why in the config documentation.

## 5. Web onboarding

- [x] 5.1 Add an onboarding screen (modelled on `TokenGate`): known provider (key only) or custom endpoint (name, base URL, key, model id, `compat` flags) — shown when the snapshot reports no configured provider.
- [x] 5.2 Put the `compat` flags on the form with what they do, not in a doc the user only reaches after every turn has failed.
- [x] 5.3 Distinguish "no credentials" from "no model available" on screen, so a misconfigured `allowedModels` is not mistaken for a missing key.
- [x] 5.4 Surface store/declare failures inline (unwritable `agentDir`, unverifiable certificate) and keep the user on the screen.
- [x] 5.5 Wire it in `App.tsx` / `useAgent.ts` so a successful setup lands the user in a working chat in the same tab.

## 6. `pi-outpost login`

- [x] 6.1 Add the `login` subcommand to `server/src/cli.ts`: `--provider`, key from a non-echoing TTY prompt or from stdin when piped; refuse a key passed in argv.
- [x] 6.2 Resolve the agent directory exactly as the server does, store through `AuthStorage`, and print the path written.
- [x] 6.3 Test: piping a key stores it and the server then reports a usable model.

## 7. Documentation

- [x] 7.1 Rewrite the README's requirements block: pi is not required (the SDK is bundled), credentials come from provider environment variables or `<agentDir>/auth.json`, and an isolated `agentDir` starts empty.
- [x] 7.2 Document the onboarding screen, the custom OpenAI-compatible endpoint, and `pi-outpost login` where the CLI and configuration are described.
- [x] 7.3 Document `NODE_EXTRA_CA_CERTS` for corporate TLS-inspecting proxies, and say plainly why no config key disables verification.
