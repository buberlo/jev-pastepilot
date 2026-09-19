# Share from a Mac

Select text → send it to the local PastePilot page → pick one action → Confirm.

The destination is always:

```
http://localhost:5173/?text=…
```

PastePilot must already be running (`npm run dev` from the repo root). Nothing runs until Confirm. There is no clipboard watcher.

This folder ships **source and an importable Quick Action**. A Linux machine cannot produce a signed or notarized `.app`. Do not expect one here.

Windows share / tray is later work. It can open the same `/?text=` URL when it exists.

## 1. Start PastePilot

```sh
npm install
npm run dev
```

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

## 5. Optional Swift Service (Mac + Xcode tools)

Not notarized. Build it yourself:

```sh
./macos/PastePilotService/build.sh
```

or:

```sh
cd macos/PastePilotService && swift build -c release
```

Then wrap the binary with [`Info.plist`](PastePilotService/Info.plist) (the `build.sh` script does this) and copy `dist/PastePilot.app` to `~/Applications`. Launch it once, then **Services → Send to PastePilot**.

Source: [`PastePilotService/main.swift`](PastePilotService/main.swift). AppleScript-only source: [`PastePilot.applescript`](PastePilot.applescript).

## Clipboard

`--clipboard` on `share-to-pastepilot.sh` reads `pbpaste` only when you pass that flag. The Service / Quick Action uses the current selection. There is no background poller.

## Windows

Not in this slice. A later tray / Share target can open the same `/?text=` URL. Do not build it here.
