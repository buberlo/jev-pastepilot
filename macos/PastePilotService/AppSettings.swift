import Foundation

/// Non-secret Mac prefs. The API key is not stored here — see KeychainStore.
enum AppSettings {
    static let suiteName = "local.pastepilot.settings"
    static let defaultServerURL = "http://localhost:5173"
    static let bundledPort = 18763
    static let defaultModel = "jev-latest"
    static let defaultProvider = "mock"
    static let providers = ["mock", "local", "jev"]
    static let defaultPreferredBrowser = "default"
    static let browsers = ["default", "safari", "chrome"]
    static let defaultShortcutName = ""

    static var dataDirectory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? URL(fileURLWithPath: NSTemporaryDirectory(), isDirectory: true)
        return base.appendingPathComponent("PastePilot", isDirectory: true)
    }

    private static var defaults: UserDefaults {
        UserDefaults(suiteName: suiteName) ?? .standard
    }

    static var serverURL: String {
        get {
            let value = defaults.string(forKey: "serverURL")?
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return (value?.isEmpty == false) ? value! : defaultServerURL
        }
        set {
            defaults.set(newValue.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "serverURL")
        }
    }

    static var provider: String {
        get {
            let value = defaults.string(forKey: "provider")?.lowercased()
            return providers.contains(value ?? "") ? value! : defaultProvider
        }
        set {
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            defaults.set(providers.contains(trimmed) ? trimmed : defaultProvider, forKey: "provider")
        }
    }

    static var preferredBrowser: String {
        get {
            let value = defaults.string(forKey: "preferredBrowser")?.lowercased()
            return browsers.contains(value ?? "") ? value! : defaultPreferredBrowser
        }
        set {
            let trimmed = newValue.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            defaults.set(browsers.contains(trimmed) ? trimmed : defaultPreferredBrowser, forKey: "preferredBrowser")
        }
    }

    static var shortcutName: String {
        get {
            defaults.string(forKey: "shortcutName")?
                .trimmingCharacters(in: .whitespacesAndNewlines) ?? defaultShortcutName
        }
        set {
            defaults.set(newValue.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "shortcutName")
        }
    }

    static var model: String {
        get {
            let value = defaults.string(forKey: "model")?.trimmingCharacters(in: .whitespacesAndNewlines)
            return (value?.isEmpty == false) ? value! : defaultModel
        }
        set {
            defaults.set(newValue.trimmingCharacters(in: .whitespacesAndNewlines), forKey: "model")
        }
    }
}

extension Notification.Name {
    static let pastePilotSettingsDidChange = Notification.Name("local.pastepilot.settingsDidChange")
}
