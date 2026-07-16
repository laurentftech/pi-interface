# Packaging pi-outpost as a Windows executable (Node SEA)

Node's [Single Executable Applications](https://nodejs.org/api/single-executable-applications.html)
(SEA) feature bundles the server into one `.exe` with the Node runtime baked
in — end users need nothing installed, no `npm install`, no terminal.

> **Requires Node ≥ 26** (for `--build-sea` + `mainFormat: "module"` support).
> On Node 24, the SEA loader only runs injected scripts as CJS (`embedderRunCjs`)
> and doesn't support `mainFormat`. The repo's CI uses Node 26 for the SEA build
> step; development on older Node works fine via `npm run dev` / `npm run start`.

## How it works

The build server `server/scripts/build-sea.mjs` does three things:

1. **Bundles** `server/src/index.ts` via esbuild into one ESM file (`bundle.mjs`).
2. **Generates a cross-platform blob** (`sea-prep.blob`) via `--experimental-sea-config` — this can be injected into a `node.exe` on any platform.
3. **On Windows only** (skipped in CI), builds a native `.exe` via `--build-sea` with `mainFormat: "module"`, so the bundle runs as ESM inside the blob.

## Extension loading with the SEA build

Config.`extensionPaths` loads `.ts`/`.mjs` files via the pi SDK's jiti
loader. Since npm dependencies are no longer bundled into the single-file
output, jiti remains available — `extensionPaths` works in both dev mode
and the published npm package.

The `extensionScripts` config key loads `.mjs` files at runtime via native
`import()`, which esbuild also preserves in bundled output:

```json
{
  "noExtensions": true,
  "extensionScripts": ["./my-extension.mjs"]
}
```

Each file must default-export an `ExtensionFactory`:

```js
export default (pi) => {
  pi.registerCommand("hello", {
    description: "Say hello",
    handler: async (args, ctx) => {
      ctx.ui.notify("Hello!", "info");
    },
  });
};
```

Paths are resolved relative to the config file's directory, same as every
other relative path in the config.

### Static imports at build time (`src/sea-extensions.ts`)

For extensions that should be baked into the bundle itself (no external file
to deploy alongside the binary), add them as static imports in
`server/src/sea-extensions.ts`:

```ts
import myExtension from "../extensions/my-extension.ts";

export const seaExtensionFactories: ExtensionFactory[] = [myExtension];
```

This goes through the SDK's `extensionFactories` instead of `import()` — no
dynamic loading, so esbuild bundles it like any other import. The tradeoff:
the set of extensions is fixed at build time.

`sea-extensions.ts` is empty by default and has no effect on the normal
`npm run dev` / `npm run start` flow, which reads `extensionScripts` from
config as usual.

## Also worth knowing

`pi`'s own self-referential docs (answering questions about pi's SDK,
extensions, etc. — see the default system prompt) read `README.md`/`docs`/
`examples/` from the SDK's package directory, resolved relative to the
*bundled* file's location once packaged. Those files aren't shipped by
default, so that specific feature silently stops working — harmless unless
you rely on it. Fixable by setting `PI_PACKAGE_DIR` (env var, read by the
SDK) to wherever you copy `node_modules/@earendil-works/pi-coding-agent`'s
`README.md`/`docs`/`examples/` alongside the executable, if you need it.

## Build

```bash
npm run build --workspace web   # produces web/dist
npm run build:sea --workspace server
```

With Node ≥ 26, produces in `server/dist/`:
- `bundle.mjs` — the whole server in one ESM file, no `node_modules` needed
- `sea-prep.blob` — cross-platform SEA blob (for npm distribution / manual injection)
- `pi-outpost.exe` — **Windows only**, generated via `--build-sea`

## Using the cross-platform blob (any platform)

Inject the blob into a copy of the Node binary:

```powershell
# 1. Start from a real Windows node.exe (same major version used to build the blob)
copy "C:\path\to\node.exe" pi-outpost.exe

# 2. Inject the blob
npx postject pi-outpost.exe NODE_SEA_BLOB server\dist\sea-prep.blob ^
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 ^
  --overwrite

# 3. Re-sign (requires signtool + a code-signing cert) — postject invalidates
#    node.exe's original signature; an unsigned .exe reliably triggers
#    Windows SmartScreen for a downloaded file
signtool sign /fd SHA256 pi-outpost.exe
```

## Using the native .exe (Windows only)

The `--build-sea` step produces a fully standalone `.exe` — no injection needed.
Lay out the folder so the server's static-file resolution (`../../web/dist`)
keeps working:

```
pi-outpost\
  pi-outpost.exe
  web\
    dist\            <- from `npm run build --workspace web`
  pi-outpost.config.json
```

`pi-outpost.exe` run from that folder serves the UI, `/ws`, `/branding`,
`/health` — same behavior as `npm run start`, just no Node.js install
required on the machine running it.
