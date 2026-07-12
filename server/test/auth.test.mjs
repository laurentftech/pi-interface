/**
 * Shared-token auth: the WebSocket, /branding and /health. No model auth needed —
 * a rejected socket is closed before the session ever sees it.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { connect, makeWorkspace, startServer } from "./harness.mjs";

const TOKEN = "test-token-auth";
/** App close code the client keys on to show the token screen instead of retrying. */
const WS_CLOSE_UNAUTHORIZED = 4401;

describe("auth", () => {
  let guarded;
  let open;

  before(async () => {
    guarded = await startServer(await makeWorkspace({ "README.md": "# x\n" }), {
      server: { token: TOKEN },
    });
    open = await startServer(await makeWorkspace({ "README.md": "# x\n" }));
  });
  after(async () => {
    await guarded?.stop();
    await open?.stop();
  });

  test("a valid token connects and gets the snapshot", async () => {
    const client = connect(guarded.wsUrl(TOKEN));
    await client.open();
    const hello = await client.waitFor("hello", 15_000);
    assert.ok(hello.sessionId);
    client.close();
  });

  test("a missing or wrong token is closed with 4401 and gets no data", async () => {
    for (const url of [guarded.wsUrl(), guarded.wsUrl("wrong")]) {
      const client = connect(url);
      const code = await client.waitForClose();
      assert.equal(code, WS_CLOSE_UNAUTHORIZED);
      assert.deepEqual(client.received, [], "a rejected socket must receive nothing");
    }
  });

  test("/branding needs a Bearer token; /health hides the session id", async () => {
    assert.equal((await fetch(`${guarded.base}/branding`)).status, 401);
    const ok = await fetch(`${guarded.base}/branding`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    assert.equal(ok.status, 200);

    const health = await (await fetch(`${guarded.base}/health`)).json();
    assert.equal(health.sessionId, undefined, "the public probe must not leak the session id");
  });

  test("a server without a token behaves as before", async () => {
    const client = connect(open.wsUrl());
    await client.open();
    await client.waitFor("hello", 15_000);
    client.close();

    assert.equal((await fetch(`${open.base}/branding`)).status, 200);
    const health = await (await fetch(`${open.base}/health`)).json();
    assert.ok(health.sessionId, "without auth, /health still reports the session id");
  });
});
