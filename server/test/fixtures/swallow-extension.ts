/**
 * Test fixture: swallows any prompt starting with "!swallow", the way an extension
 * slash command (or an `input` handler returning "handled") does.
 *
 * The server still echoes the user bubble — preflight accepted the input — but the
 * SDK returns without appending a session entry. That mismatch between echoed
 * bubbles and persisted entries is what the `user_entries` pairing has to survive:
 * aligning by position would shift every earlier bubble onto the previous message's
 * entry, and editing one would then silently rewind the wrong turn.
 */
export default (pi: { on: (event: string, handler: (event: { text: string }) => unknown) => void }) => {
  pi.on("input", (event) =>
    event.text.startsWith("!swallow") ? { action: "handled" } : { action: "continue" },
  );
};
