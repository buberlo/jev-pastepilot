import Foundation

/// Builds the local PastePilot ingest URL.
/// Never puts TYPESAFE_API_KEY (or any secret) on the query string.
enum ShareURLBuilder {
    static func ingestURL(text: String, base: String, provider: String) -> URL? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return nil
        }
        guard var components = URLComponents(string: base.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return nil
        }
        var items: [URLQueryItem] = []
        let mode = provider.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if mode == "jev" || mode == "local" {
            items.append(URLQueryItem(name: "provider", value: mode))
        }
        items.append(URLQueryItem(name: "text", value: trimmed))
        components.queryItems = items
        return components.url
    }
}
