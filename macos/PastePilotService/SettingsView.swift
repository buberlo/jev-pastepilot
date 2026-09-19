import SwiftUI

/// Settings window (⌘,). The API key uses a secure field and Keychain only.
struct SettingsView: View {
    @State private var apiKey = ""
    @State private var keyStored = false
    @State private var model = AppSettings.model
    @State private var provider = AppSettings.provider
    @State private var serverURL = AppSettings.serverURL
    @State private var status = "The main window is PastePilot. Confirm is required. The key is never put on a URL."

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("PastePilot Settings")
                .font(.title2.weight(.semibold))
            Text("Store the TypeSafe key on this Mac. The bundled local server reads it from Keychain on launch. Share opens the app window with /?text= — Confirm is required.")
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)

            GroupBox("TypeSafe") {
                VStack(alignment: .leading, spacing: 10) {
                    LabeledContent("API key") {
                        SecureField(keyStored ? "••••••••  (enter a new key to replace)" : "TYPESAFE_API_KEY", text: $apiKey)
                            .textFieldStyle(.roundedBorder)
                            .frame(minWidth: 240)
                    }
                    Text(keyStored ? "A key is in the macOS Keychain." : "No key in Keychain yet.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                    LabeledContent("Model") {
                        TextField("jev-latest", text: $model)
                            .textFieldStyle(.roundedBorder)
                            .frame(minWidth: 240)
                    }
                    LabeledContent("Provider") {
                        Picker("Provider", selection: $provider) {
                            Text("mock").tag("mock")
                            Text("local").tag("local")
                            Text("jev").tag("jev")
                        }
                        .pickerStyle(.segmented)
                        .labelsHidden()
                        .frame(minWidth: 240)
                    }
                }
                .padding(6)
            }

            GroupBox("PastePilot") {
                VStack(alignment: .leading, spacing: 10) {
                    LabeledContent("Server URL") {
                        TextField(AppSettings.defaultServerURL, text: $serverURL)
                            .textFieldStyle(.roundedBorder)
                            .frame(minWidth: 240)
                    }
                    Text("Used by the CLI share helper. The app window always uses the bundled localhost server.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .padding(6)
            }

            HStack {
                Button("Save") { save() }
                    .keyboardShortcut(.defaultAction)
                Button("Remove key") { removeKey() }
                Spacer()
            }

            Text(status)
                .font(.callout)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
        .padding(20)
        .frame(minWidth: 440, minHeight: 460)
        .onAppear { keyStored = KeychainStore.hasAPIKey() }
    }

    private func save() {
        AppSettings.serverURL = serverURL
        AppSettings.provider = provider
        AppSettings.model = model
        do {
            if !apiKey.isEmpty {
                try KeychainStore.saveAPIKey(apiKey)
                apiKey = ""
            }
            keyStored = KeychainStore.hasAPIKey()
            status = "Saved. The key stays in Keychain (service \(KeychainStore.service)). It is not in git, the share URL, or logs."
            NotificationCenter.default.post(name: .pastePilotSettingsDidChange, object: nil)
        } catch {
            status = "Could not write Keychain. Server URL and provider were still saved."
            NotificationCenter.default.post(name: .pastePilotSettingsDidChange, object: nil)
        }
    }

    private func removeKey() {
        do {
            try KeychainStore.deleteAPIKey()
            apiKey = ""
            keyStored = false
            status = "Key removed from Keychain. Other settings are unchanged."
            NotificationCenter.default.post(name: .pastePilotSettingsDidChange, object: nil)
        } catch {
            status = "Could not remove the Keychain item."
        }
    }
}

#Preview("Settings") {
    SettingsView()
}
