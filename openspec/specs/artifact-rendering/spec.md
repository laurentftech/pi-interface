# Artifact Rendering Specification

## Purpose

Renders workspace artifacts referenced in assistant messages: inline images served through
`/files/raw` and file links that open in the file viewer instead of navigating the browser.

## Requirements

### Requirement: InlineImageRendering

Assistant-message markdown SHALL render image references whose `src` is a relative path (or a path inside the workspace) as inline images, by rewriting the `src` to the `/files/raw` endpoint (including the auth token as a query parameter when one is in use). Absolute `http(s)` image URLs SHALL be rendered unchanged.

#### Scenario: RelativeImageDisplayed
- **GIVEN** the agent wrote `plot.png` in the workspace and replies with `![courbe](plot.png)`
- **WHEN** the message renders
- **THEN** the image is displayed inline in the conversation, loaded from `/files/raw?path=plot.png`

#### Scenario: ExternalImageUntouched
- **WHEN** a message contains `![logo](https://example.com/logo.png)`
- **THEN** the `src` is used as-is without rewriting

#### Scenario: BrokenImageDegradesGracefully
- **GIVEN** a referenced image that the server rejects (missing, oversize, unauthorized)
- **WHEN** the message renders
- **THEN** the layout stays intact and the failed image shows an unobtrusive fallback (alt text / broken-image state), with no error banner

### Requirement: FileLinkNavigation

Links in assistant-message markdown whose `href` is a relative path (or a path inside the workspace) SHALL open the referenced file in the file viewer instead of navigating the browser. External links SHALL open in a new tab.

#### Scenario: WorkspaceLinkOpensViewer
- **WHEN** the user clicks `[rapport](./report.html)` in an assistant message
- **THEN** the file viewer opens showing `report.html`, and the browser does not navigate away

#### Scenario: ExternalLinkNewTab
- **WHEN** the user clicks `[doc](https://example.com)` in an assistant message
- **THEN** the link opens in a new tab and the app keeps its state

<!-- manual -->
## Known Invariants

- **CustomMessageCard (web/src/components/CustomMessageCard.tsx)**: Extension message `details` payload SHALL be collapsed behind an accessible toggle button. The toggle button MUST be clearly labeled ("Details") and styled distinctly with visual affordances (padding, rounded corners, hover state) to be easily discoverable. JSON data MUST NOT be shown verbose by default.
  — discovered via bug fix on 2026-07-14, root cause: button label and styling made details toggle too subtle, appearing as a small triangle without context
<!-- /manual -->
