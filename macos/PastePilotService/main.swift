import AppKit

/// Tiny macOS Service: selected text → local PastePilot URL.
/// Build on a Mac (see README). This VM cannot produce a signed .app.
/// Explicit Services invoke only — no clipboard watcher.

final class ServiceProvider: NSObject {
    @objc func handlePastePilot(
        _ pboard: NSPasteboard,
        userData: String,
        error: AutoreleasingUnsafeMutablePointer<NSString>
    ) {
        guard let text = pboard.string(forType: .string)?.trimmingCharacters(in: .whitespacesAndNewlines),
              !text.isEmpty
        else {
            error.pointee = "Select text first, then choose PastePilot."
            return
        }
        var allowed = CharacterSet.urlQueryAllowed
        allowed.remove(charactersIn: ":/?#[]@!$&'()*+,;=")
        let encoded = text.addingPercentEncoding(withAllowedCharacters: allowed) ?? ""
        let raw = "http://localhost:5173/?text=\(encoded)"
        guard let url = URL(string: raw) else {
            error.pointee = "Could not build PastePilot URL."
            return
        }
        NSWorkspace.shared.open(url)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    let provider = ServiceProvider()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.servicesProvider = provider
        NSUpdateDynamicServices()
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.accessory)
app.run()
