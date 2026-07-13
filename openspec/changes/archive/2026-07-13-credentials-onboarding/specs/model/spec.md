## MODIFIED Requirements

### Requirement: ClientMessageValidation

The system SHALL validate ClientMessage according to these rules:
- type must be one of: prompt, abort, set_model, set_thinking, new_session, switch_session, delete_session, list_sessions, compact, list_directory, read_file, write_file, search_files, list_tree, navigate_tree, fork_session, edit_prompt, git_status, git_diff, git_log, git_show, extension_ui_response, set_credential, declare_provider
- When type is 'prompt', text is required (images optional)
- When type is 'set_model', provider and id are required
- When type is 'set_thinking', level is required
- When type is 'switch_session' or 'delete_session', path is required
- When type is 'list_directory' or 'read_file', path and requestId are required
- When type is 'write_file', path, content, expectedMtimeMs, and requestId are required
- When type is 'search_files', query and requestId are required
- When type is 'navigate_tree' or 'fork_session', entryId is required
- When type is 'edit_prompt', entryId and text are required (images optional); entryId must be a user-message entry
- When type is 'git_status' or 'git_log', requestId is required (git_log limit optional, clamped to [1, 100])
- When type is 'git_diff', path and requestId are required
- When type is 'git_show', sha (matching /^[0-9a-f]{7,40}$/i) and requestId are required
- When type is 'set_credential', provider and a non-empty apiKey are required
- When type is 'declare_provider', provider, baseUrl (an http(s) URL), apiKey, and at least one model id are required; compatibility flags are optional booleans
- Malformed or non-object frames are ignored without crashing the server

#### Scenario: ValidClientMessage
- **WHEN** a well-formed ClientMessage arrives
- **THEN** it is handled according to its type

#### Scenario: CredentialMessageWithoutKey
- **WHEN** a 'set_credential' frame arrives with no apiKey, or an empty one
- **THEN** it is rejected and no credential is written

#### Scenario: DeclaredProviderWithoutBaseUrl
- **WHEN** a 'declare_provider' frame arrives with no baseUrl, or one that is not an http(s) URL
- **THEN** it is rejected and no provider is registered

#### Scenario: MalformedFrame
- **WHEN** a non-object or unknown frame arrives
- **THEN** it is ignored and the server keeps running
