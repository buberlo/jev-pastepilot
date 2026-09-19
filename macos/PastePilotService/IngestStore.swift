import AppKit
import Combine
import Foundation

/// Shared text from Services / pastepilot://ingest. Not a clipboard watcher.
final class IngestStore: ObservableObject {
    static let shared = IngestStore()

    @Published private(set) var pendingText: String?
    @Published private(set) var generation = 0

    private init() {}

    func ingest(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        pendingText = trimmed
        generation += 1
        NSApp.activate(ignoringOtherApps: true)
    }
}
