# macOS Share path

Thin wrapper around the existing web app. Selected text becomes `http://localhost:5173/?text=…`. The MS2 mock router, preview, and Confirm are unchanged. No clipboard watcher.

The Linux CI / cloud VM cannot build a signed `.app`. Use the URL ingest to prove the loop; build the optional Swift service on a Mac.

## 0. Start the web app

From the repository root:

```sh
npm install
npm run dev
```

Leave it at `http://localhost:5173`. Override the base with `PASTEPILOT_URL` if Vite picked another port.

## 1. Prove the loop (any OS)

```sh
./macos/share-to-pastepilot.sh --print-url "Service failed: connection refused on the database socket."
```

That prints:

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

## 2. Services menu via Automator (smallest Mac install)

1. Open **Automator**.
2. **New Document** → **Quick Action**.
3. At the top: **Workflow receives** `text` **in** `any application`.
4. From the action library, drag **Run AppleScript** into the workflow.
5. Replace the stub with the contents of [`PastePilot.applescript`](PastePilot.applescript).
6. **File → Save**. Name it `Send to PastePilot`.
7. In any app, select text → right-click or the app **Services** menu → **Send to PastePilot**.
8. If it is missing: **System Settings → Keyboard → Keyboard Shortcuts → Services**. Enable **Send to PastePilot** (under Text).
9. First run may ask to allow Automator / the script to control the browser. Allow it.

The Quick Action lives in `~/Library/Services/Send to PastePilot.workflow`.

## 3. Shortcuts / Share Sheet

1. Open **Shortcuts**.
2. **+** → name it `Send to PastePilot`.
3. Open shortcut details (ⓘ). Enable **Use as Quick Action**, **Services Menu**, and **Share Sheet**. Receive **Text**.
4. Add **Run Shell Script**. Pass input as **stdin**. Script:

   ```sh
   /bin/bash "/ABSOLUTE/PATH/TO/repo/macos/share-to-pastepilot.sh"
   ```

   Replace the path with this repository. The script reads stdin.

5. Alternatively, without the repo script: **URL Encode** the shortcut input, then **Open URLs** with `http://localhost:5173/?text=` plus the encoded text.
6. Select text in another app → **Services → Send to PastePilot**, or share text into the shortcut from the Share Sheet.

## 4. Optional Swift Service (.app)

On a Mac with Xcode Command Line Tools:

```sh
./macos/PastePilotService/build.sh
```

Copy `macos/PastePilotService/dist/PastePilot.app` to `~/Applications`, launch it once, then use **Services → Send to PastePilot**. Details: [`PastePilotService/main.swift`](PastePilotService/main.swift) and [`PastePilotService/Info.plist`](PastePilotService/Info.plist).

This is optional. Automator + the shell script is enough.

## Clipboard

`--clipboard` on `share-to-pastepilot.sh` reads `pbpaste` only when you pass that flag. The Service / Quick Action uses the current selection. There is no background poller.

## Windows

Not in this slice. A later tray / Share target can open the same `/?text=` URL. Do not build it here.
