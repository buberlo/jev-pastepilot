import AppKit

/// Selected text → local PastePilot URL. Reads server URL + provider from Settings.
/// Does not read or send the API key. No clipboard watcher.
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
        guard let url = ShareURLBuilder.ingestURL(
            text: text,
            base: AppSettings.serverURL,
            provider: AppSettings.provider
        ) else {
            error.pointee = "Could not build PastePilot URL."
            return
        }
        NSWorkspace.shared.open(url)
    }
}
