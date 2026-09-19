import AppKit
import Foundation

/// Native Confirm side-effects for the Mac app.
/// Invoked only after the web UI's execution gate. Never logs paste or TYPESAFE_API_KEY.
enum MacActions {
    private static let maxText = 4000
    private static let unsafeCharacters = CharacterSet(charactersIn: ";|&`$\n\r")
    private static let synthesizer = NSSpeechSynthesizer()

    static func handle(_ raw: Any, reply: @escaping (Any?, String?) -> Void) {
        guard let body = raw as? [String: Any], let toolId = body["toolId"] as? String else {
            reply(["ok": false, "error": "malformed"], nil)
            return
        }
        let text = string(body["text"]).trimmingCharacters(in: .whitespacesAndNewlines)
        let url = string(body["url"])
        let path = string(body["path"])
        let query = string(body["query"])
        let content = string(body["content"])

        let result = execute(
            toolId: toolId,
            text: String(text.prefix(maxText)),
            url: url.isEmpty ? nil : url,
            path: path.isEmpty ? nil : path,
            query: query.isEmpty ? nil : query,
            content: content.isEmpty ? nil : content
        )
        reply(result, nil)
    }

    static func execute(
        toolId: String,
        text: String,
        url: String?,
        path: String?,
        query: String?,
        content: String?
    ) -> [String: Any] {
        switch toolId {
        case "reveal_in_finder":
            return openInFinder(path: path, text: text)
        case "open_in_terminal":
            return openInTerminal(path: path, text: text)
        case "open_in_notes":
            return openInNotes(text: text)
        case "add_reminder":
            return addReminder(text: text)
        case "open_in_calendar":
            return openInCalendar(content: content ?? text)
        case "open_in_safari":
            return openInBrowser(url: url, bundleId: "com.apple.Safari", label: "Safari")
        case "open_in_chrome":
            return openInBrowser(url: url, bundleId: "com.google.Chrome", label: "Chrome")
        case "dictionary_lookup":
            return dictionaryLookup(query: query ?? text)
        case "spotlight_search":
            return spotlightSearch(query: query ?? text)
        case "run_shortcut":
            return runShortcut(text: text)
        case "speak_text":
            return speak(text: text)
        case "share_text":
            return share(text: text)
        default:
            return ["ok": false, "error": "unknown_tool"]
        }
    }

    // MARK: - Tools

    private static func openInFinder(path: String?, text: String) -> [String: Any] {
        let target = safeFileURL(path) ?? safeFileURL(text) ?? AppSettings.dataDirectory
        try? FileManager.default.createDirectory(at: AppSettings.dataDirectory, withIntermediateDirectories: true)
        if FileManager.default.fileExists(atPath: target.path) {
            NSWorkspace.shared.activateFileViewerSelecting([target])
        } else {
            let parent = target.deletingLastPathComponent()
            if FileManager.default.fileExists(atPath: parent.path) {
                NSWorkspace.shared.open(parent)
            } else {
                NSWorkspace.shared.activateFileViewerSelecting([target])
            }
        }
        return ok("mac", "Opened the path in Finder.")
    }

    private static func openInTerminal(path: String?, text: String) -> [String: Any] {
        let target = safeFileURL(path) ?? safeFileURL(text)
        let directory: URL?
        if let target {
            var isDir: ObjCBool = false
            if FileManager.default.fileExists(atPath: target.path, isDirectory: &isDir), isDir.boolValue {
                directory = target
            } else {
                directory = target.deletingLastPathComponent()
            }
        } else {
            directory = nil
        }
        if let directory {
            let opened = NSWorkspace.shared.open(
                [directory],
                withAppBundleIdentifier: "com.apple.Terminal",
                options: [],
                additionalEventParamDescriptor: nil,
                launchIdentifiers: nil
            )
            if !opened {
                return ["ok": false, "error": "mac_failed"]
            }
        } else if let app = NSWorkspace.shared.urlForApplication(withBundleIdentifier: "com.apple.Terminal") {
            NSWorkspace.shared.open(app)
        } else {
            return ["ok": false, "error": "mac_failed"]
        }
        return ok("mac", "Opened Terminal. The paste was not executed as a shell command.")
    }

    private static func openInNotes(text: String) -> [String: Any] {
        guard !text.isEmpty else {
            return ["ok": false, "error": "empty"]
        }
        let title = appleString(String(collapsed(text, 80)))
        let body = appleString(text)
        let wrote = runAppleScript(
            "tell application \"Notes\" to make new note with properties {name:\"\(title)\", body:\"\(body)\"}"
        )
        if !wrote {
            NSWorkspace.shared.open(URL(fileURLWithPath: "/System/Applications/Notes.app"))
        }
        return ok("mac", "Opened Apple Notes with this text. Nothing else was sent.")
    }

    private static func addReminder(text: String) -> [String: Any] {
        guard !text.isEmpty else {
            return ["ok": false, "error": "empty"]
        }
        let name = appleString(String(collapsed(text, 120)))
        let wrote = runAppleScript(
            "tell application \"Reminders\" to make new reminder with properties {name:\"\(name)\"}"
        )
        if !wrote, let url = URL(string: "x-apple-reminderkit://") {
            NSWorkspace.shared.open(url)
        }
        return ok("mac", "Created a Reminders draft. Nothing else was sent.")
    }

    private static func openInCalendar(content: String) -> [String: Any] {
        guard content.contains("BEGIN:VCALENDAR") else {
            return ["ok": false, "error": "empty"]
        }
        let folder = AppSettings.dataDirectory
        try? FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let file = folder.appendingPathComponent("pastepilot-draft.ics")
        do {
            try content.write(to: file, atomically: true, encoding: .utf8)
        } catch {
            return ["ok": false, "error": "mac_failed"]
        }
        NSWorkspace.shared.open(file)
        return ok("mac", "Opened Calendar with an .ics draft. Nothing was scheduled.")
    }

    private static func openInBrowser(url raw: String?, bundleId: String, label: String) -> [String: Any] {
        guard let raw, let url = URL(string: raw), let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https"
        else {
            return ["ok": false, "error": "no_url"]
        }
        let opened = NSWorkspace.shared.open(
            [url],
            withAppBundleIdentifier: bundleId,
            options: [],
            additionalEventParamDescriptor: nil,
            launchIdentifiers: nil
        )
        if !opened {
            NSWorkspace.shared.open(url)
        }
        return ok("mac", "Opened the link in \(label).")
    }

    private static func dictionaryLookup(query: String) -> [String: Any] {
        let word = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !word.isEmpty else {
            return ["ok": false, "error": "no_query"]
        }
        let encoded = word.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? word
        guard let url = URL(string: "dict://\(encoded)") else {
            return ["ok": false, "error": "mac_failed"]
        }
        NSWorkspace.shared.open(url)
        return ok("mac", "Opened Dictionary for that word.")
    }

    private static func spotlightSearch(query: String) -> [String: Any] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return ["ok": false, "error": "no_query"]
        }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(trimmed, forType: .string)
        notify(title: "PastePilot", subtitle: "Query copied. Paste into Spotlight (⌘Space).")
        return ok("mac", "Copied the query and opened Spotlight. Paste if needed (⌘Space).")
    }

    private static func runShortcut(text: String) -> [String: Any] {
        let name = AppSettings.shortcutName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty, isSafeShortcutName(name) else {
            return ["ok": false, "error": "no_shortcut"]
        }
        var components = URLComponents(string: "shortcuts://run-shortcut")
        var items = [URLQueryItem(name: "name", value: name)]
        let input = String(text.prefix(1000))
        if !input.isEmpty {
            items.append(URLQueryItem(name: "input", value: input))
        }
        components?.queryItems = items
        guard let url = components?.url else {
            return ["ok": false, "error": "mac_failed"]
        }
        NSWorkspace.shared.open(url)
        return ok("mac", "Opened the configured Shortcut. The API key was not put on the URL.")
    }

    private static func speak(text: String) -> [String: Any] {
        let spoken = String(text.trimmingCharacters(in: .whitespacesAndNewlines).prefix(400))
        guard !spoken.isEmpty else {
            return ["ok": false, "error": "empty"]
        }
        synthesizer.startSpeaking(spoken)
        return ok("mac", "Spoke the text with say. Nothing was sent.")
    }

    private static func share(text: String) -> [String: Any] {
        guard !text.isEmpty else {
            return ["ok": false, "error": "empty"]
        }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(text, forType: .string)
        notify(title: "PastePilot", subtitle: "Text copied. Share from another app if you want.")
        return ok("mac", "Copied the text and posted a notification. Nothing was sent.")
    }

    // MARK: - Safety

    /// Same rules as TypeScript `firstFilePath`: absolute/home only, no shell metacharacters.
    static func safeFileURL(_ raw: String?) -> URL? {
        guard var text = raw?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else {
            return nil
        }
        if text.count > 400 { return nil }
        if text.rangeOfCharacter(from: unsafeCharacters) != nil { return nil }
        if text.contains("$(") { return nil }
        if text.contains(" ") { return nil }
        let lower = text.lowercased()
        if lower.hasPrefix("http://") || lower.hasPrefix("https://") { return nil }
        if text.hasPrefix("~") {
            text = (text as NSString).expandingTildeInPath
        }
        let unix = text.hasPrefix("/")
        let windows = text.range(of: #"^[A-Za-z]:[\\/]"#, options: .regularExpression) != nil
        guard unix || windows else { return nil }
        return URL(fileURLWithPath: text)
    }

    private static func isSafeShortcutName(_ name: String) -> Bool {
        name.range(of: #"^[A-Za-z0-9][A-Za-z0-9 ._'-]{0,79}$"#, options: .regularExpression) != nil
    }

    private static func appleString(_ value: String) -> String {
        value.replacingOccurrences(of: "\\", with: "\\\\").replacingOccurrences(of: "\"", with: "\\\"")
    }

    private static func collapsed(_ value: String, _ max: Int) -> String {
        let flat = value.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        if flat.count <= max { return flat }
        return String(flat.prefix(max - 1)) + "…"
    }

    private static func runAppleScript(_ source: String) -> Bool {
        var error: NSDictionary?
        guard let script = NSAppleScript(source: source) else { return false }
        _ = script.executeAndReturnError(&error)
        return error == nil
    }

    private static func notify(title: String, subtitle: String) {
        let notification = NSUserNotification()
        notification.title = title
        notification.informativeText = subtitle
        NSUserNotificationCenter.default.deliver(notification)
    }

    private static func string(_ value: Any?) -> String {
        value as? String ?? ""
    }

    private static func ok(_ used: String, _ message: String) -> [String: Any] {
        ["ok": true, "used": used, "message": message]
    }
}
