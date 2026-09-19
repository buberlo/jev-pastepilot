import Foundation

/// Builds the local PastePilot ingest URL or pastepilot:// scheme.
/// Never puts TYPESAFE_API_KEY (or any secret) on the query string.
enum ShareURLBuilder {
    static let appScheme = "pastepilot"

    static func pageURL(base: String, provider: String, text: String? = nil) -> URL? {
        guard var components = URLComponents(string: base.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            return nil
        }
        var items: [URLQueryItem] = []
        let mode = provider.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if mode == "jev" || mode == "local" {
            items.append(URLQueryItem(name: "provider", value: mode))
        }
        if let text {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            if !trimmed.isEmpty {
                items.append(URLQueryItem(name: "text", value: trimmed))
            }
        }
        components.queryItems = items.isEmpty ? nil : items
        return components.url
    }

    static func ingestURL(text: String, base: String, provider: String) -> URL? {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            return nil
        }
        return pageURL(base: base, provider: provider, text: trimmed)
    }

    static func appIngestURL(text: String, provider: String) -> URL? {
        ingestURL(text: text, base: "\(appScheme)://ingest", provider: provider)
    }

    static func text(fromAppURL url: URL) -> String? {
        guard url.scheme?.lowercased() == appScheme else {
            return nil
        }
        let items = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems ?? []
        for key in ["text", "q"] {
            if let value = items.first(where: { $0.name == key })?.value {
                let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
                if !trimmed.isEmpty {
                    return trimmed
                }
            }
        }
        return nil
    }
}
