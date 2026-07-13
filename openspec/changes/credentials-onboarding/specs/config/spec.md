## ADDED Requirements

### Requirement: CredentialLocation

The system SHALL read and write model credentials in the `auth.json` of the agent directory it is configured with — `<agentDir>/auth.json`, defaulting to `~/.pi/agent/auth.json` — and SHALL make that location explicit wherever credentials are documented or reported. Provider environment variables SHALL keep working as the other source of credentials. A configuration naming its own `agentDir` therefore starts with no credentials, and the system SHALL offer a way to supply them (web onboarding or `pi-outpost login`) rather than requiring a file to be copied in by hand.

#### Scenario: IsolatedAgentDirStartsEmpty
- **GIVEN** a configuration naming an `agentDir` that has no `auth.json`
- **WHEN** the server starts
- **THEN** it reports that no provider is configured, and points at that directory — not at `~/.pi/agent`

#### Scenario: EnvironmentVariablesStillWork
- **GIVEN** no `auth.json` but a provider environment variable in the environment
- **WHEN** the server starts
- **THEN** a usable model is reported and no onboarding is shown

### Requirement: CustomProviderLocation

The system SHALL read and write custom provider declarations — an OpenAI-compatible endpoint's base URL, models, and compatibility flags — in the `models.json` of the configured agent directory, in the SDK's own format. A provider declared through the UI SHALL therefore be visible to any pi process sharing that agent directory, and SHALL survive a restart.

#### Scenario: DeclaredProviderPersists
- **GIVEN** a custom OpenAI-compatible provider declared from the UI
- **WHEN** the server is restarted
- **THEN** the provider's models are still listed, without redeclaring them

### Requirement: TlsTrustIsEnvironmental

The system SHALL NOT expose a configuration key that disables TLS certificate verification. Trusting an internal certificate authority (the corporate TLS-inspecting proxy case) SHALL be done with `NODE_EXTRA_CA_CERTS`, and the system SHALL name that variable when a request fails because a certificate could not be verified.

#### Scenario: NoInsecureConfigKey
- **WHEN** a configuration file asks to disable TLS verification
- **THEN** no such key exists; verification cannot be turned off from a file that can be copied between machines
