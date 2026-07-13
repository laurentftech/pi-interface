# Model Credentials Specification

## Purpose

Turns "no credentials" from a dead end into a question. pi-outpost bundles the pi SDK,
so credentials — not a pi installation — are the prerequisite; without them the agent
used to start, look healthy, and fail on the user's first message with advice meant for
a terminal it does not have. Credentials are asked for in the browser, or supplied from
the terminal, and land where the SDK looks for them: `<agentDir>/auth.json`, with custom
OpenAI-compatible endpoints in `<agentDir>/models.json`.

## Requirements

### Requirement: Detect and report credential status
The system SHALL determine, at session start and after any credential change, whether a model with usable credentials exists, and SHALL report that state to clients. It SHALL distinguish "no provider is configured" from "providers are configured but no model is available" (for example because `allowedModels` filters them all out), so the user is told which of the two happened. It SHALL NOT send a stored credential back to any client.

#### Scenario: No credentials at all
- **WHEN** the server starts with an agent directory holding no `auth.json` and no provider environment variables
- **THEN** the session snapshot reports that no provider is configured and no model is usable

#### Scenario: Configured server
- **WHEN** at least one provider has usable credentials and a model is available
- **THEN** the snapshot reports the server as configured, and no onboarding is shown

#### Scenario: Status never carries the secret
- **WHEN** a provider is configured
- **THEN** the snapshot reports it as configured without including the stored key

### Requirement: Onboard from the web UI
The system SHALL, when no provider is configured, present a first-run screen in place of a chat that cannot answer, offering the known providers and accepting an API key for one of them. On success it SHALL store the credential, refresh the model registry, switch the session onto a usable model, and land the user in a working chat — without restarting the server and without reloading the page.

#### Scenario: User pastes a key
- **GIVEN** a server with no configured provider
- **WHEN** the user submits an API key for a provider from the onboarding screen
- **THEN** the credential is stored, a usable model is selected, and the chat becomes usable in the same tab

#### Scenario: The credential is refused
- **WHEN** the credential cannot be stored (for example the agent directory is not writable)
- **THEN** the UI reports an actionable error naming the path, and the user stays on the onboarding screen

### Requirement: Declare a custom OpenAI-compatible endpoint
The system SHALL let the user declare, from the same onboarding surface, a provider that speaks the OpenAI API: a name, a base URL, an API key, and at least one model id. It SHALL expose the compatibility flags such endpoints commonly need (`supportsDeveloperRole`, `supportsReasoningEffort`) as part of that declaration, because a gateway that rejects the `developer` role or `reasoning_effort` fails on every turn otherwise, and the user cannot infer that from the failure. The declaration SHALL be registered with the model registry for the running session (`registerProvider`) and persisted to the agent directory's `models.json` in the SDK's own format — the SDK reads that file but exposes no writer, so the system writes it, and SHALL merge into the existing `providers` map rather than replacing the file. The system SHALL NOT invent a provider format of its own.

#### Scenario: Corporate gateway
- **GIVEN** a server with no configured provider
- **WHEN** the user declares a custom endpoint with its base URL, key, model id, and compatibility flags
- **THEN** the model becomes selectable without a restart, and the declaration survives one

#### Scenario: Compatibility flags are offered, not hidden
- **WHEN** the user declares a custom endpoint
- **THEN** the compatibility flags are part of the form, with what they do

### Requirement: Name a TLS failure instead of hiding it
The system SHALL detect that a model request failed because the server's certificate could not be verified — the corporate TLS-inspecting proxy case — and SHALL report it as such, naming `NODE_EXTRA_CA_CERTS` as the way to trust the internal certificate authority. It SHALL NOT offer a configuration key that disables TLS verification: that would disable it for every outbound connection, the one carrying the user's API key included, and a key in a file spreads between machines and outlives its reason.

#### Scenario: Unverifiable certificate
- **WHEN** a model request fails because the certificate chain cannot be verified
- **THEN** the error says the certificate could not be verified and names `NODE_EXTRA_CA_CERTS`, instead of surfacing an opaque transport failure

### Requirement: Store credentials through the SDK's auth storage
The system SHALL store credentials with the pi SDK's `AuthStorage`, in the `auth.json` of the configured agent directory. It SHALL NOT write or parse that file itself, so the file's schema and its locking stay owned by the SDK and remain safe to share with other pi processes.

#### Scenario: An isolated agent directory
- **GIVEN** a configuration naming its own `agentDir`
- **WHEN** a credential is stored
- **THEN** it is written to that directory's `auth.json`, not to `~/.pi/agent/auth.json`

### Requirement: Onboard from the terminal
The system SHALL provide a `login` command for deployments where no browser will open the UI. It SHALL accept the provider as an argument and read the key from a prompt on a TTY, or from standard input when piped. It SHALL NOT accept the key as a command-line argument, because a secret in argv is readable by anyone who can list processes — the same rule that already forbids a `--token` flag.

#### Scenario: Interactive login
- **WHEN** the user runs `pi-outpost login --provider <name>` on a terminal
- **THEN** the key is prompted for without being echoed, and stored in the configured agent directory

#### Scenario: Scripted login
- **WHEN** a key is piped to `pi-outpost login --provider <name>`
- **THEN** it is read from standard input and stored, and it never appears in the process arguments
