import AppKit
import SwiftUI
import WebKit

/// Main PastePilot window: the same Vite UI, served by the bundled localhost server.
struct PastePilotWindow: View {
    @ObservedObject private var server = LocalServer.shared
    @ObservedObject private var ingest = IngestStore.shared

    var body: some View {
        ZStack {
            switch server.state {
            case .ready:
                if let url = pageURL {
                    PastePilotWebView(url: url, generation: ingest.generation)
                } else {
                    statusPane("PastePilot is ready.")
                }
            case .failed(let message):
                VStack(spacing: 12) {
                    Text(message)
                        .multilineTextAlignment(.center)
                    Button("Retry") { server.start() }
                }
                .padding(24)
            case .idle, .starting:
                statusPane("Starting PastePilot…")
            }
        }
        .frame(minWidth: 560, minHeight: 640)
        .onAppear { server.start() }
        .onOpenURL { url in
            if let text = ShareURLBuilder.text(fromAppURL: url) {
                ingest.ingest(text)
            }
        }
    }

    private var pageURL: URL? {
        guard let base = server.baseURL?.absoluteString else { return nil }
        return ShareURLBuilder.pageURL(
            base: base,
            provider: AppSettings.provider,
            text: ingest.pendingText
        )
    }

    private func statusPane(_ title: String) -> some View {
        VStack(spacing: 12) {
            ProgressView()
            Text(title)
                .foregroundStyle(.secondary)
        }
        .padding(24)
    }
}

struct PastePilotWebView: NSViewRepresentable {
    let url: URL
    let generation: Int

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeNSView(context: Context) -> WKWebView {
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences = preferences
        let view = WKWebView(frame: .zero, configuration: config)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        context.coordinator.loadedURL = url
        view.load(URLRequest(url: url))
        return view
    }

    func updateNSView(_ view: WKWebView, context: Context) {
        if context.coordinator.loadedURL != url {
            context.coordinator.loadedURL = url
            view.load(URLRequest(url: url))
        }
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKUIDelegate {
        var loadedURL: URL?

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            guard let target = navigationAction.request.url else {
                decisionHandler(.cancel)
                return
            }
            if isBundledOrigin(target) {
                decisionHandler(.allow)
                return
            }
            if isExternalConfirmURL(target) {
                NSWorkspace.shared.open(target)
            }
            decisionHandler(.cancel)
        }

        func webView(
            _ webView: WKWebView,
            createWebViewWith configuration: WKWebViewConfiguration,
            for navigationAction: WKNavigationAction,
            windowFeatures: WKWindowFeatures
        ) -> WKWebView? {
            if let target = navigationAction.request.url, isExternalConfirmURL(target) {
                NSWorkspace.shared.open(target)
            }
            return nil
        }

        private func isExternalConfirmURL(_ url: URL) -> Bool {
            let scheme = url.scheme?.lowercased() ?? ""
            let allowed = [
                "http", "https", "mailto",
                "dict", "notes", "mobilenotes", "shortcuts",
                "x-apple-reminder", "x-apple-reminderkit", "ical",
            ]
            return allowed.contains(scheme)
        }

        private func isBundledOrigin(_ url: URL) -> Bool {
            let host = url.host?.lowercased()
            let local = host == "127.0.0.1" || host == "localhost"
            let http = url.scheme == "http" || url.scheme == "https"
            return local && http
        }
    }
}
