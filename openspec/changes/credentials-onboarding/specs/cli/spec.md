## ADDED Requirements

### Requirement: LoginCommand

`pi-outpost login --provider <name>` SHALL store an API key for that provider in the configured agent directory's `auth.json`, through the SDK's auth storage, and print where it wrote it. It SHALL read the key from a non-echoing prompt on a TTY, and from standard input when piped. It SHALL NOT accept the key as a command-line argument — a secret in argv is readable by anyone who can list processes, the same reason there is no `--token` flag. It SHALL resolve the agent directory the same way the server does, so the key lands where the server will look for it.

#### Scenario: LoginThenStart
- **GIVEN** a configuration with an agent directory holding no credentials
- **WHEN** the user runs `pi-outpost login --provider <name>`, supplies a key, and then starts the server
- **THEN** the server reports a usable model and the chat answers

#### Scenario: LoginFromAScript
- **WHEN** a key is piped into `pi-outpost login --provider <name>`
- **THEN** it is read from standard input, stored, and never appears in the process arguments

#### Scenario: LoginRejectsAKeyInArgv
- **WHEN** the user passes the key as a flag value
- **THEN** the command exits non-zero and explains that the key must come from stdin or the prompt
