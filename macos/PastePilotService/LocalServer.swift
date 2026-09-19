import Combine
import Foundation

/// Starts the bundled localhost Node server when the app launches and stops it on quit.
/// Injects the Keychain API key into the child environment only — never a URL, never logs.
final class LocalServer: ObservableObject {
    static let shared = LocalServer()

    enum State: Equatable {
        case idle
        case starting
        case ready
        case failed(String)
    }

    @Published private(set) var state: State = .idle
    @Published private(set) var baseURL: URL?

    private var process: Process?
    private var readyObserver: NSObjectProtocol?
    private let lock = NSLock()

    private init() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(settingsChanged),
            name: .pastePilotSettingsDidChange,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc private func settingsChanged() {
        restart()
    }

    func start() {
        lock.lock()
        if process?.isRunning == true, state == .ready {
            lock.unlock()
            return
        }
        lock.unlock()
        stopProcess()
        DispatchQueue.main.async {
            self.state = .starting
            self.baseURL = nil
        }
        launch()
    }

    func stop() {
        stopProcess()
        DispatchQueue.main.async {
            self.state = .idle
            self.baseURL = nil
        }
    }

    func restart() {
        start()
    }

    private func stopProcess() {
        lock.lock()
        let running = process
        process = nil
        lock.unlock()
        if let running, running.isRunning {
            running.terminate()
            running.waitUntilExit()
        }
    }

    private func launch() {
        guard
            let node = Bundle.main.url(forResource: "node", withExtension: nil, subdirectory: "runtime"),
            let script = Bundle.main.url(forResource: "server", withExtension: "mjs", subdirectory: "server"),
            let web = Bundle.main.resourceURL?.appendingPathComponent("web", isDirectory: true)
        else {
            fail("PastePilot could not find its bundled server.")
            return
        }

        let stdout = Pipe()
        let child = Process()
        child.executableURL = node
        child.arguments = [script.path]
        child.environment = serverEnvironment(webRoot: web)
        child.currentDirectoryURL = script.deletingLastPathComponent()
        child.standardOutput = stdout
        child.standardError = Pipe()

        do {
            try child.run()
        } catch {
            fail("Could not start the local PastePilot server.")
            return
        }

        lock.lock()
        process = child
        lock.unlock()

        let handle = stdout.fileHandleForReading
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.awaitReady(handle: handle, child: child)
        }
    }

    private func awaitReady(handle: FileHandle, child: Process) {
        let deadline = Date().addingTimeInterval(20)
        var buffer = Data()
        while Date() < deadline {
            if !child.isRunning {
                fail("The local PastePilot server exited.")
                return
            }
            let chunk = handle.availableData
            if !chunk.isEmpty {
                buffer.append(chunk)
                if let line = firstReadyLine(in: buffer), let url = URL(string: line) {
                    DispatchQueue.main.async {
                        self.baseURL = url
                        self.state = .ready
                    }
                    return
                }
            }
            Thread.sleep(forTimeInterval: 0.05)
        }
        fail("The local PastePilot server did not become ready.")
    }

    private func firstReadyLine(in data: Data) -> String? {
        guard let text = String(data: data, encoding: .utf8) else {
            return nil
        }
        for raw in text.split(whereSeparator: \.isNewline) {
            let line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard line.hasPrefix("PASTEPILOT_READY ") else { continue }
            let url = line.dropFirst("PASTEPILOT_READY ".count).trimmingCharacters(in: .whitespacesAndNewlines)
            if url.hasPrefix("http://127.0.0.1:") || url.hasPrefix("http://localhost:") {
                return url
            }
        }
        return nil
    }

    private func fail(_ message: String) {
        stopProcess()
        DispatchQueue.main.async {
            self.state = .failed(message)
            self.baseURL = nil
        }
    }

    private func serverEnvironment(webRoot: URL) -> [String: String] {
        var env: [String: String] = [:]
        let inherit = ["PATH", "HOME", "TMPDIR", "USER", "LOGNAME", "LANG", "LC_ALL"]
        let current = ProcessInfo.processInfo.environment
        for key in inherit {
            if let value = current[key] {
                env[key] = value
            }
        }
        env["PASTEPILOT_WEB_ROOT"] = webRoot.path
        env["PASTEPILOT_HOST"] = "127.0.0.1"
        env["PASTEPILOT_PORT"] = String(AppSettings.bundledPort)
        env["PASTEPILOT_DATA_DIR"] = AppSettings.dataDirectory.path
        env["DECISION_PROVIDER"] = AppSettings.provider
        env["PASTEPILOT_PROVIDER"] = AppSettings.provider
        env["TYPESAFE_MODEL"] = AppSettings.model
        env["PASTEPILOT_PREFERRED_BROWSER"] = AppSettings.preferredBrowser
        env["PASTEPILOT_SHORTCUT_NAME"] = AppSettings.shortcutName
        env["PASTEPILOT_NATIVE_MAC"] = "1"
        if let key = KeychainStore.readAPIKey(), !key.isEmpty {
            env["TYPESAFE_API_KEY"] = key
        }
        return env
    }
}
