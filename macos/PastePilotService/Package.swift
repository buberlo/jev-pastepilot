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
            exclude: ["build.sh", "bundle-runtime.sh", "Info.plist", "bundled", "dist"],
            sources: [
                "AppSettings.swift",
                "IngestStore.swift",
                "KeychainStore.swift",
                "LocalServer.swift",
                "MacActions.swift",
                "MainWebView.swift",
                "PastePilotApp.swift",
                "ServiceProvider.swift",
                "SettingsView.swift",
                "ShareURLBuilder.swift",
            ],
            linkerSettings: [
                .linkedFramework("AppKit"),
                .linkedFramework("Combine"),
                .linkedFramework("SwiftUI"),
                .linkedFramework("Security"),
                .linkedFramework("WebKit"),
            ]
        ),
    ]
)
