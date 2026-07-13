## MODIFIED Requirements

### Requirement: GETWebSocket

The API SHALL support `GET /ws` to establish a websocket connection for real-time communication. The state snapshot it sends SHALL carry the server's credential status: which providers are configured and whether a usable model exists — never a stored key.

#### Scenario: EstablishWebSocketConnection
- **GIVEN** The application is running and the request Origin is allowed
- **WHEN** GET /ws is called with a WebSocket upgrade
- **THEN** WebSocket connection is established and a state snapshot is sent

#### Scenario: DisallowedOrigin
- **GIVEN** The application is running
- **WHEN** GET /ws is called with an Origin that is neither localhost nor listed in `server.allowedOrigins`
- **THEN** The upgrade is rejected

#### Scenario: SnapshotCarriesCredentialStatus
- **GIVEN** a server whose agent directory holds no credentials
- **WHEN** a client connects
- **THEN** the snapshot reports that no provider is configured and no model is usable

## ADDED Requirements

### Requirement: SetCredentialMessage

The WebSocket protocol SHALL accept a `set_credential` client message carrying a provider and an API key. The server SHALL store it through the SDK's auth storage, refresh the model registry, switch the live session onto a usable model, and broadcast a snapshot with an updated credential status — the session is re-pointed, not rebuilt, so a credential replaced mid-session does not cost the user the conversation. A failure to store SHALL be reported as an error naming the path that could not be written, leaving the session as it was.

The message SHALL be accepted only on an authenticated connection — it carries no auth of its own and relies on the token check that already guards `/ws`. The server already refuses to bind off-loopback without `server.token`, so this write is never reachable unauthenticated from a network.

#### Scenario: StoreCredential
- **GIVEN** a connected client on a server with no configured provider
- **WHEN** it sends `set_credential` with a provider and key
- **THEN** the credential is stored, the session is switched onto a usable model, and the new snapshot reports the provider as configured

#### Scenario: UnwritableAgentDir
- **WHEN** the credential cannot be written to the agent directory
- **THEN** the server replies with an error naming the path, and the session is unchanged

#### Scenario: KeyIsNeverEchoed
- **WHEN** any snapshot is sent after a credential is stored
- **THEN** it reports the provider as configured and contains no stored key

### Requirement: DeclareProviderMessage

The WebSocket protocol SHALL accept a `declare_provider` client message carrying an OpenAI-compatible endpoint: provider name, base URL, API key, one or more model ids, and optional compatibility flags. The server SHALL register it with the model registry for the running session and persist it to the agent directory's `models.json`, then make the new models selectable without a restart. It SHALL be subject to the same authentication as every other client message.

#### Scenario: DeclareCustomEndpoint
- **GIVEN** a connected client
- **WHEN** it sends `declare_provider` with a base URL, key, and model id
- **THEN** the model list contains that model, and the declaration is written to `models.json`

#### Scenario: RejectNonHttpBaseUrl
- **WHEN** the base URL is missing or is not an http(s) URL
- **THEN** the server rejects the message and registers nothing
