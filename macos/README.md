# Share from a Mac

Select text → send it to the local PastePilot page → pick one action → Confirm.

The destination is always a local ingest URL:

```
http://localhost:5173/?text=…
```

If Settings chose provider `jev` or `local`, the helper adds `?provider=…`. The TypeSafe API key is **never** put on that URL.

PastePilot must already be running. Nothing runs until Confirm. There is no clipboard watcher.

This folder ships **source, an importable Quick Action, and a SwiftUI Settings window**. A Linux machine cannot produce a signed or notarized `.app`. Do not expect one here.

Windows share / tray is later work. It can open the same `/?text=` URL when it exists.

## Settings (TypeSafe key)

The Mac app is a small Settings window. Open it after you build (below), or use **PastePilot → Settings…** (`⌘,`).

Fields:

- **API key** — secure field. Saved to the **macOS Keychain** only (`service` `local.pastepilot.typesafe`, account `TYPESAFE_API_KEY`). Masked. Never written to git, README, `.env` in the repo, or logs.
- **Model** — optional (`jev-latest` by default). UserDefaults suite `local.pastepilot.settings`.
- **Provider** — `mock` | `local` | `jev`. Same suite. Share uses this as `?provider=` only.
- **Server URL** — default `http://localhost:5173`.

The browser still never sees the key. To start the local web server with the Keychain key in the **process environment** (not printed):

```sh
./macos/run-dev-with-keychain.sh
```

On Linux that script skips Keychain and runs `npm run dev` (optional gitignored `.env`). Do not commit `TYPESAFE_API_KEY`. Do not run the helper with `bash -x`.

Layout preview (this VM cannot render SwiftUI): [settings-preview.html](settings-preview.html). Source: [`PastePilotService/SettingsView.swift`](PastePilotService/SettingsView.swift).

## 1. Start PastePilot

```sh
npm install
npm run dev
```

On a Mac, prefer `./macos/run-dev-with-keychain.sh` after you have saved a key in Settings.

Leave it at `http://localhost:5173`. Override the base with `PASTEPILOT_URL` if Vite picked another port.

## 2. Install the Quick Action (recommended)

On a Mac, either:

- **Double-click** [`install.command`](install.command), or
- Copy [`Send to PastePilot.workflow`](Send to PastePilot.workflow) into `~/Library/Services/`

Then select text in any app → **Services → Send to PastePilot**.

If the item is missing: **System Settings → Keyboard → Keyboard Shortcuts → Services**. Enable **Send to PastePilot** under Text. The first run may ask to allow Automator to control the browser.

That is the whole install. The workflow embeds the AppleScript; it does not need a path to this repo.

## 3. Or make a Shortcut (Share Sheet)

No repo path required.

1. Open **Shortcuts** → **+** → name it `Send to PastePilot`.
2. Shortcut details (ⓘ): enable **Use as Quick Action**, **Services Menu**, and **Share Sheet**. Receive **Text**.
3. Add **URL Encode** (or **Encode** the shortcut input).
4. Add **Open URLs** with:

   ```
   http://localhost:5173/?text=
   ```

   plus the encoded text.

Select text → **Services → Send to PastePilot**, or share text into the shortcut.

## 4. Prove the loop (any OS)

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

Open that URL. The paste field fills, at most three actions appear, and nothing runs until Confirm.

On a Mac, omit `--print-url` to open the browser. On Linux, the script uses `xdg-open` when present.

Longer text can POST instead of using a query string:

```sh
curl -sS -o /dev/null -D - -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "text=Lass uns morgen über das Projekt sprechen." \
  http://localhost:5173/share
```

The 303 `Location` is the same `/?text=` ingest.

## 5. Build the Settings app (Mac + Xcode tools)

Not notarized. Build it yourself:

```sh
./macos/PastePilotService/build.sh
```

or:

```sh
cd macos/PastePilotService && swift build -c release
```

Copy `dist/PastePilot.app` to `~/Applications` and open it. The Settings window **is** the app. Then **Services → Send to PastePilot** uses the saved server URL and provider. The Service reads Keychain only when you start the server with `run-dev-with-keychain.sh` — never to put the key in the share URL.

AppleScript-only source: [`PastePilot.applescript`](PastePilot.applescript).

## Clipboard

`--clipboard` on `share-to-pastepilot.sh` reads `pbpaste` only when you pass that flag. The Service / Quick Action uses the current selection. There is no background poller.

## Windows

Not in this slice. A later tray / Share target can open the same `/?text=` URL. Do not build it here.
