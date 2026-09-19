# PastePilot for Mac

**Mac v1 is a complete app.** Open `PastePilot.app`. The main window is PastePilot (paste → at most three buttons → preview → Confirm). A bundled local Node server starts with the app and stops on quit. Settings is **PastePilot → Settings…** (`⌘,`).

You do **not** need Terminal or `npm run dev` for normal use. That web flow is still there for Linux and for people changing the TypeScript UI.

Services and Share open or focus the **app window** with `/?text=` (or `pastepilot://ingest?text=`). They do not open Chrome. The TypeSafe API key is **never** put on that URL. Nothing runs until Confirm. There is no clipboard watcher.

A Linux machine cannot produce a `.app`. GitHub Actions on `macos-latest` publishes an **ad-hoc / unsigned** zip on [Releases](https://github.com/buberlo/jev-pastepilot/releases). It is not notarized.

Windows share / tray is later work.

## Download (GitHub Releases)

Linux CI cannot build this `.app`. The Mac workflow does. **Every push to `main` rebuilds** the rolling tag [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest).

- **Release page:** <https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest>
- **Direct zip:** <https://github.com/buberlo/jev-pastepilot/releases/download/mac-latest/PastePilot-mac.zip>

| Trigger | Release | Asset |
| --- | --- | --- |
| Push to `main` | rolling tag [`mac-latest`](https://github.com/buberlo/jev-pastepilot/releases/tag/mac-latest) (replaced each time) | `PastePilot-mac.zip` |
| Tag `v*` (for example `v1.0.0`) | versioned release of that tag | `PastePilot-mac.zip` |
| `workflow_dispatch` | dry-run by default (build + zip only); set **publish** to replace `mac-latest` from `main` | same zip |

Workflow: [`.github/workflows/mac-release.yml`](../.github/workflows/mac-release.yml).

**This build is ad-hoc signed, not Developer ID signed, and not notarized.** macOS Gatekeeper will warn.

1. Download [`PastePilot-mac.zip`](https://github.com/buberlo/jev-pastepilot/releases/download/mac-latest/PastePilot-mac.zip).
2. Unzip. Drag `PastePilot.app` to `/Applications` (or `~/Applications`).
3. **Right-click** the app → **Open** (not a regular double-click) the first time. Confirm the Gatekeeper dialog.
4. The **main window is PastePilot**. Paste text, pick an action, Confirm.
5. Optionally save the TypeSafe API key in **PastePilot → Settings…** — it goes to **Keychain only**, never into the downloaded zip or this repo. The app injects it into the bundled server process environment.
6. Select text → **Services → Send to PastePilot**. The app window opens with the text filled.

Do not expect a signed or notarized binary. There are no signing secrets in this repository. Never put `TYPESAFE_API_KEY` in a release asset.

### Dry-run the workflow

**Actions → Mac release → Run workflow**. Leave **publish** unchecked. That builds and uploads a workflow artifact without creating or changing a Release. Pull requests that touch `macos/`, the workflow file, or the bundled web/server sources also dry-run (build + zip only).

## What the app ships

| Piece | Role |
| --- | --- |
| WKWebView main window | The same PastePilot UI as the web prototype |
| Bundled Node + `server.mjs` | Localhost-only server: static UI, `POST /api/decide`, `POST /api/save`, `/share` |
| Settings (`⌘,`) | Keychain API key, provider, model |
| Services + `pastepilot://ingest` | Open/focus the app window with `?text=` |

The zip contains an official Node binary and a production Vite build. It does not contain `TYPESAFE_API_KEY`, `.env`, or signing secrets.

## Settings (TypeSafe key)

Open **PastePilot → Settings…** (`⌘,`).

Fields:

- **API key** — secure field. Saved to the **macOS Keychain** only (`service` `local.pastepilot.typesafe`, account `TYPESAFE_API_KEY`). Masked. Never written to git, README, `.env` in the repo, or logs. Injected into the bundled server as `TYPESAFE_API_KEY` when the app launches (or after Save).
- **Model** — optional (`jev-latest` by default). UserDefaults suite `local.pastepilot.settings`.
- **Provider** — `mock` | `local` | `jev`. Same suite. The main window adds `?provider=` when you chose `jev` or `local`.
- **Server URL** — used by the CLI share helper only. The app window always uses the bundled localhost server (`127.0.0.1`, default port `18763`).

The WKWebView never sees the key. Saving Settings restarts the bundled server so a new key or model is picked up.

Layout preview (this VM cannot render SwiftUI): [settings-preview.html](settings-preview.html). Source: [`PastePilotService/SettingsView.swift`](PastePilotService/SettingsView.swift).

Web developers who still run Vite can load the Keychain key with:

```sh
./macos/run-dev-with-keychain.sh
```

On Linux that script skips Keychain and runs `npm run dev` (optional gitignored `.env`). Do not commit `TYPESAFE_API_KEY`. Do not run the helper with `bash -x`.

## 1. Normal use (Release .app)

Download the zip, right-click → Open, paste or Share. That is the whole loop.

## 2. Install the Quick Action (optional)

The Release `.app` already registers **Services → Send to PastePilot**. If you want the Automator Quick Action as well:

- **Double-click** [`install.command`](install.command), or
- Copy [`Send to PastePilot.workflow`](Send to PastePilot.workflow) into `~/Library/Services/`

Then select text in any app → **Services → Send to PastePilot**. That opens `pastepilot://ingest?text=…` (the app window). Launch PastePilot once first so macOS registers the URL scheme.

If the item is missing: **System Settings → Keyboard → Keyboard Shortcuts → Services**. Enable **Send to PastePilot** under Text.

## 3. Or make a Shortcut (Share Sheet)

1. Open **Shortcuts** → **+** → name it `Send to PastePilot`.
2. Shortcut details (ⓘ): enable **Use as Quick Action**, **Services Menu**, and **Share Sheet**. Receive **Text**.
3. Add **URL Encode** (or **Encode** the shortcut input).
4. Add **Open URLs** with:

   ```
   pastepilot://ingest?text=
   ```

   plus the encoded text.

Select text → **Services → Send to PastePilot**, or share text into the shortcut.

## 4. Prove the loop (any OS)

The CLI still prints the HTTP ingest URL the web prototype uses:

```sh
./macos/share-to-pastepilot.sh --print-url "Service failed: connection refused on the database socket."
```

Prints:

```
http://localhost:5173/?text=Service%20failed%3A%20connection%20refused%20on%20the%20database%20socket.
```

With Settings/provider `jev` (or `PASTEPILOT_PROVIDER=jev`):

```
http://localhost:5173/?provider=jev&text=…
```

On a Mac, omit `--print-url` to open `pastepilot://ingest` (the app). Pass `--web` to open the HTTP URL in a browser instead. On Linux, the script uses `xdg-open` when present.

Longer text can POST instead of using a query string (web / bundled server):

```sh
curl -sS -o /dev/null -D - -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "text=Lass uns morgen über das Projekt sprechen." \
  http://127.0.0.1:18763/share
```

The 303 `Location` is the same `/?text=` ingest. Confirm is still required.

## 5. Build the app (Mac + Xcode tools)

Prefer the [Release zip](#download-github-releases) unless you are changing sources.

Local build (not notarized):

```sh
npm ci
./macos/bundle-web.sh
./macos/PastePilotService/bundle-runtime.sh
./macos/PastePilotService/build.sh
```

or, on a Mac with Node and `swiftc` already installed:

```sh
./macos/PastePilotService/build.sh
```

Copy `macos/PastePilotService/dist/PastePilot.app` to `~/Applications` and open it. The main window is PastePilot. **PastePilot → Settings…** (`⌘,`) stores the key. **Services → Send to PastePilot** focuses the app window. The Service never puts the key on a URL.

`bundle-web.sh` also works on Linux (Vite production build + standalone `server.mjs`). `bundle-runtime.sh` and `swiftc` require macOS.

AppleScript-only source: [`PastePilot.applescript`](PastePilot.applescript).

## Web prototype (Linux / development)

This replaces the “web must be started separately” flow **for Mac users**. Developers and Linux still run:

```sh
npm install
npm run dev
```

Leave it at `http://localhost:5173`. Override the base with `PASTEPILOT_URL` if Vite picked another port.

## Clipboard

`--clipboard` on `share-to-pastepilot.sh` reads `pbpaste` only when you pass that flag. The Service / Quick Action uses the current selection. There is no background poller.

## Windows

Not in this slice. A later tray / Share target can open the same `/?text=` URL. Do not build it here.
