import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    let provider = ServiceProvider()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.servicesProvider = provider
        NSUpdateDynamicServices()
        LocalServer.shared.start()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationWillTerminate(_ notification: Notification) {
        LocalServer.shared.stop()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        for url in urls {
            if let text = ShareURLBuilder.text(fromAppURL: url) {
                IngestStore.shared.ingest(text)
            }
        }
    }
}

@main
struct PastePilotApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("PastePilot") {
            PastePilotWindow()
        }
        .defaultSize(width: 720, height: 800)

        Settings {
            SettingsView()
        }
    }
}
