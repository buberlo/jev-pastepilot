import AppKit

/// Selected text → in-app PastePilot window (`/?text=`).
/// Does not open a browser. Does not read or send the API key. No clipboard watcher.
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
        IngestStore.shared.ingest(text)
    }
}
