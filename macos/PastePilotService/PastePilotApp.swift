import AppKit
import SwiftUI

final class AppDelegate: NSObject, NSApplicationDelegate {
    let provider = ServiceProvider()

    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.servicesProvider = provider
        NSUpdateDynamicServices()
        NSApp.activate(ignoringOtherApps: true)
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}

@main
struct PastePilotApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("PastePilot Settings") {
            SettingsView()
        }
        .defaultSize(width: 480, height: 540)

        Settings {
            SettingsView()
        }
    }
}
