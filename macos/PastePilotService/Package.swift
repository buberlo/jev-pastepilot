// swift-tools-version: 5.9
// Optional helper. Build on a Mac. This is not a signed or notarized .app.
import PackageDescription

let package = Package(
    name: "PastePilotService",
    platforms: [
        .macOS(.v13),
    ],
    targets: [
        .executableTarget(
            name: "PastePilotService",
            path: ".",
            exclude: ["build.sh", "Info.plist"],
            sources: [
                "AppSettings.swift",
                "KeychainStore.swift",
                "PastePilotApp.swift",
                "ServiceProvider.swift",
                "SettingsView.swift",
                "ShareURLBuilder.swift",
            ],
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("SwiftUI"),
                .linkedFramework("Security"),
            ]
        ),
    ]
)
