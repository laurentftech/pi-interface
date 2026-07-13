# @pi-outpost/embed

Mount [pi-outpost](https://github.com/laurentftech/pi-outpost) — a web chat UI for the [pi coding agent](https://github.com/earendil-works/pi) — as a widget inside any web app.

The widget renders into a **Shadow DOM**, fully isolated from the host app's CSS in both directions: Tailwind's reset never touches the host page, and the host page's styles never bleed into the widget. React is a peer dependency (supplied by the host); everything else — Tailwind, markdown, mermaid, highlight.js, the wire protocol — is compiled into the package.

It talks to a pi-outpost server over WebSocket, so you need one running:

```sh
npx pi-outpost init   # writes a starter config
npx pi-outpost        # http://127.0.0.1:3141/
```

See the [main README](https://github.com/laurentftech/pi-outpost#readme) for configuring it.

## Install

```sh
npm install @pi-outpost/embed
```

Requires `react` and `react-dom` ≥ 19 in the host app.

## Usage

```js
import { mount } from "@pi-outpost/embed";

const widget = mount(document.getElementById("assistant"), {
  serverUrl: "https://your-pi-outpost-server", // omit for same-origin
  theme: "dark", // optional; falls back to the server's branding.defaultTheme, then "system"
  token: "…", // only for servers with `server.token` set
});

widget.setTheme("light"); // change the theme at runtime
widget.unmount(); // tear down the React tree
```

`mount(container, options?)` returns `{ unmount(), setTheme(theme) }`. The container itself stays in the DOM after `unmount()`, with an empty shadow root.

## Server-rendered apps

Importing the package is safe anywhere, but `mount()` needs a real DOM: it attaches a shadow root to the element you give it. In Next.js, Remix or Astro, call it from an effect (client-side only):

```jsx
useEffect(() => {
  const widget = mount(ref.current);
  return () => widget.unmount();
}, []);
```

In Next.js, the component doing this must be a client component (`"use client"`).

## Server-side configuration

Two things to set on the pi-outpost server, whatever the deployment topology:

- **`server.allowedOrigins`** — the widget's WebSocket carries the *host page's* origin (e.g. `https://your-app.example.com`), not pi-outpost's own. Add it explicitly; even same-domain deployments need this (only `localhost`/`127.0.0.1` are trusted automatically).
- **CORS** — `/branding` and `/health` are plain HTTP endpoints with no CORS headers. They work with zero extra config when the widget and the backend share an origin (recommended: reverse-proxy pi-outpost under your own domain). A genuinely cross-origin deployment needs a CORS layer in front.

## License

MIT
