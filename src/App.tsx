import { useEffect, useRef, useState, type ClipboardEvent } from "react";
import "./App.css";
import {
  buildPreview,
  confirmExecution,
  copyConfirmedText,
  newStateVersion,
  openConfirmedUrl,
  isLocalSaveTool,
  persistDownload,
  persistLocalSave,
  persistMacAction,
  readDemoOptions,
  readSharedText,
  routePaste,
  type ActionPreview,
  type ActionSuggestion,
  type ExecutionResult,
  type MacActionFallback,
  type RouteOutcome,
} from "./domain";

const PASTE_HINT = "⌘V or Ctrl+V, or use Paste. Nothing runs until you confirm.";
const SHARE_HINT = "Opened from Share. Nothing runs until you confirm.";

async function applyFallback(fallback: MacActionFallback | undefined): Promise<ExecutionResult | null> {
  if (!fallback || fallback.type === "stub") {
    return null;
  }
  if (fallback.type === "open_url" && fallback.url) {
    const opened = openConfirmedUrl(fallback.url);
    if (!opened) {
      return {
        ok: false,
        reason: "open_blocked",
        message: "The browser blocked the new tab. Allow pop-ups, then Confirm again.",
      };
    }
    return { ok: true, message: "Opened the link.", effect: { type: "open_url", url: fallback.url } };
  }
  if (fallback.type === "copy" && fallback.text !== undefined) {
    const copied = await copyConfirmedText(fallback.text);
    if (!copied) {
      return { ok: false, reason: "copy_failed", message: "Could not copy. Confirm was ignored." };
    }
    return { ok: true, message: "Copied.", effect: { type: "copy", text: fallback.text } };
  }
  if (fallback.type === "download" && fallback.filename && fallback.content !== undefined && fallback.mime) {
    const persisted = await persistDownload({
      filename: fallback.filename,
      content: fallback.content,
      mime: fallback.mime,
    });
    if (!persisted.ok) {
      return { ok: false, reason: "download_failed", message: persisted.message };
    }
    return {
      ok: true,
      message: persisted.message,
      effect: {
        type: "download",
        filename: fallback.filename,
        content: fallback.content,
        mime: fallback.mime,
        path: persisted.path,
        downloaded: persisted.downloaded,
      },
    };
  }
  if (fallback.type === "save_local" && fallback.entry && isLocalSaveTool(fallback.entry.toolId)) {
    const persisted = await persistLocalSave({
      toolId: fallback.entry.toolId,
      text: fallback.entry.text,
      savedAt: fallback.entry.savedAt,
    });
    if (!persisted.ok) {
      return { ok: false, reason: "save_failed", message: persisted.message };
    }
    return {
      ok: true,
      message: persisted.message,
      effect: {
        type: "save_local",
        entry: fallback.entry,
        path: persisted.path,
        count: persisted.count,
        downloaded: persisted.downloaded,
      },
    };
  }
  return null;
}

function sharedTextOnLoad(): string | null {
  return readSharedText(window.location.search);
}

export default function App() {
  const [text, setText] = useState(() => sharedTextOnLoad() ?? "");
  const [fromShare, setFromShare] = useState(() => sharedTextOnLoad() !== null);
  const [stateVersion, setStateVersion] = useState(() => newStateVersion());
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null);
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const routeGen = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  async function routeAndApply(next: string, version: string) {
    const gen = ++routeGen.current;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const demo = readDemoOptions(window.location.search);
    const routed = await routePaste(next, {
      stateVersion: version,
      provider: demo.provider,
      scenario: demo.scenario,
      signal: ac.signal,
    });
    if (gen !== routeGen.current) {
      return;
    }
    setOutcome(routed);
  }

  useEffect(() => {
    const shared = sharedTextOnLoad();
    if (!shared) {
      return;
    }
    void routeAndApply(shared, stateVersion);
    // Share ingest runs once on load. Later edits go through handleTextChange.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleTextChange(next: string) {
    const version = newStateVersion();
    setText(next);
    setFromShare(false);
    setStateVersion(version);
    setPreview(null);
    setResult(null);
    setPasteError(null);
    void routeAndApply(next, version);
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    event.preventDefault();
    const next = event.clipboardData.getData("text");
    handleTextChange(next);
  }

  async function handlePasteButton() {
    if (!navigator.clipboard?.readText) {
      fieldRef.current?.focus();
      setPasteError("Clipboard read is unavailable. Use Ctrl+V or Cmd+V in the field.");
      return;
    }
    try {
      const next = await navigator.clipboard.readText();
      handleTextChange(next);
    } catch {
      fieldRef.current?.focus();
      setPasteError("Clipboard permission was denied. Use Ctrl+V or Cmd+V in the field.");
    }
  }

  function openPreview(suggestion: ActionSuggestion) {
    setPreview(buildPreview(suggestion.toolId, text, stateVersion));
    setResult(null);
  }

  async function handleConfirm() {
    if (!preview) {
      return;
    }
    const gated = confirmExecution({
      preview,
      currentStateVersion: stateVersion,
      confirmed: true,
      input: text,
    });
    if (!gated.ok || !gated.effect) {
      setResult(gated);
      return;
    }

    if (gated.effect.type === "mac_action" && gated.effect.toolId) {
      const mac = await persistMacAction({
        toolId: gated.effect.toolId,
        text: gated.effect.text ?? text,
        url: gated.effect.url,
        path: gated.effect.path,
        query: gated.effect.query,
        content: gated.effect.fallback?.content,
        filename: gated.effect.filename,
        folder: gated.effect.folder,
      });
      if (!mac.ok) {
        setResult({
          ok: false,
          reason: mac.reason ?? "mac_failed",
          message: mac.message,
        });
        return;
      }
      if (mac.used === "mac") {
        setResult({
          ...gated,
          message: mac.message,
        });
        setPreview(null);
        return;
      }
      const applied = await applyFallback(gated.effect.fallback);
      if (applied) {
        setResult({
          ...applied,
          message: mac.message,
        });
        if (applied.ok) {
          setPreview(null);
        }
        return;
      }
      setResult({
        ...gated,
        message: mac.message,
      });
      setPreview(null);
      return;
    }

    if (gated.effect.type === "screen" && gated.effect.summary) {
      setResult(gated);
      setPreview(null);
      return;
    }

    if (gated.effect.type === "open_url" && gated.effect.url) {
      const opened = openConfirmedUrl(gated.effect.url);
      if (!opened) {
        setResult({
          ok: false,
          reason: "open_blocked",
          message: "The browser blocked the new tab. Allow pop-ups, then Confirm again.",
        });
        return;
      }
      setResult(gated);
      setPreview(null);
      return;
    }

    if (gated.effect.type === "copy" && gated.effect.text !== undefined) {
      const copied = await copyConfirmedText(gated.effect.text);
      if (!copied) {
        setResult({
          ok: false,
          reason: "copy_failed",
          message: "Could not copy. Confirm was ignored.",
        });
        return;
      }
      setResult(gated);
      setPreview(null);
      return;
    }

    if (
      gated.effect.type === "download" &&
      gated.effect.filename &&
      gated.effect.content !== undefined &&
      gated.effect.mime
    ) {
      const persisted = await persistDownload({
        filename: gated.effect.filename,
        content: gated.effect.content,
        mime: gated.effect.mime,
      });
      if (!persisted.ok) {
        setResult({
          ok: false,
          reason: "download_failed",
          message: persisted.message,
        });
        return;
      }
      setResult({
        ...gated,
        message: persisted.message,
        effect: {
          ...gated.effect,
          path: persisted.path,
          downloaded: persisted.downloaded,
        },
      });
      setPreview(null);
      return;
    }

    if (
      gated.effect.type === "save_local" &&
      gated.effect.entry &&
      isLocalSaveTool(gated.effect.entry.toolId)
    ) {
      const persisted = await persistLocalSave({
        toolId: gated.effect.entry.toolId,
        text: gated.effect.entry.text,
        savedAt: gated.effect.entry.savedAt,
      });
      if (!persisted.ok) {
        setResult({
          ok: false,
          reason: "save_failed",
          message: persisted.message,
        });
        return;
      }
      setResult({
        ...gated,
        message: persisted.message,
        effect: {
          ...gated.effect,
          path: persisted.path,
          count: persisted.count,
          downloaded: persisted.downloaded,
        },
      });
      setPreview(null);
      return;
    }

    setResult(gated);
    setPreview(null);
  }

  const showRouted = outcome !== null;
  const showSuggestions =
    showRouted && preview === null && !result?.ok && outcome.suggestions.length > 0;
  const showManual =
    showRouted &&
    preview === null &&
    !result?.ok &&
    (outcome.status === "abstain" || outcome.status === "failed");
  const emptyCopy =
    outcome?.status === "failed"
      ? outcome.failure === "timeout"
        ? "Couldn't decide in time. Your text is still here — pick a safe tool."
        : "Couldn't decide. Your text is still here — pick a safe tool."
      : "Nothing fitting this paste. Pick a safe local tool, or try a clearer snippet.";

  return (
    <main className="page">
      <h1 className="brand">PastePilot</h1>
      <p className="lede">Paste text. Pick one action. Confirm before anything happens.</p>

      <section className="paste-block">
        <label className="visually-hidden" htmlFor="paste-field">
          Paste field
        </label>
        <textarea
          id="paste-field"
          ref={fieldRef}
          className="paste-field"
          value={text}
          placeholder="Paste something you want to act on"
          spellCheck={false}
          onChange={(event) => handleTextChange(event.target.value)}
          onPaste={handlePaste}
        />
        <div className="paste-toolbar">
          <p className="hint">{pasteError ?? (fromShare ? SHARE_HINT : PASTE_HINT)}</p>
          <button type="button" className="paste-button" onClick={() => void handlePasteButton()}>
            Paste
          </button>
        </div>
      </section>

      {showSuggestions ? (
        <section className="results" aria-label="Suggested actions">
          {outcome.status === "clarify" ? (
            <p className="hint">Not sure which one. Pick an action — nothing runs until Confirm.</p>
          ) : null}
          {outcome.suggestions.map((suggestion) => (
            <button
              key={suggestion.toolId}
              type="button"
              className="action-button"
              onClick={() => openPreview(suggestion)}
            >
              {suggestion.label}
            </button>
          ))}
        </section>
      ) : null}

      {showManual ? (
        <section className="empty" aria-label={emptyCopy}>
          <p>{emptyCopy}</p>
          {outcome.fallbackTools.length > 0 ? (
            <div className="fallback-list">
              <p>Nothing ran. Pick a safe tool:</p>
              {outcome.fallbackTools.map((tool) => (
                <button
                  key={tool.toolId}
                  type="button"
                  className="action-button"
                  onClick={() => openPreview(tool)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {preview ? (
        <section className="preview" aria-label="Action preview">
          <h2>{preview.title}</h2>
          <p>{preview.summary}</p>
          {preview.facts.length > 0 ? (
            <ul>
              {preview.facts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          ) : null}
          <div className="preview-actions">
            <button type="button" className="confirm-button" onClick={() => void handleConfirm()}>
              Confirm
            </button>
            <button type="button" className="quiet-button" onClick={() => setPreview(null)}>
              Back
            </button>
          </div>
        </section>
      ) : null}

      {result ? (
        <div className={result.ok ? "toast" : "toast stub"} role="status">
          {result.message}
        </div>
      ) : null}

      {result?.ok ? (
        <aside className="stub" aria-label="Local preview">
          <strong>{resultAsideTitle(result)}</strong>
          {resultAsideBody(result)}
        </aside>
      ) : null}
    </main>
  );
}

function resultAsideTitle(result: ExecutionResult): string {
  if (result.effect?.type === "open_url") {
    return result.effect.url?.startsWith("mailto:") ? "Opened mail draft" : "Opened link";
  }
  if (result.effect?.type === "save_local") {
    return "Saved locally";
  }
  if (result.effect?.type === "copy") {
    return "Copied";
  }
  if (result.effect?.type === "download") {
    return "Saved locally";
  }
  if (result.effect?.type === "mac_action") {
    return "Mac action";
  }
  if (result.effect?.type === "screen") {
    return "Screened locally";
  }
  return "Local preview";
}

function resultAsideBody(result: ExecutionResult): string {
  if (result.effect?.type === "open_url") {
    if (result.effect.url?.startsWith("mailto:")) {
      return "Opened a mailto: draft. No email was sent.";
    }
    return "Only the confirmed http(s) link was opened. No email, calendar, or other network write.";
  }
  if (result.effect?.type === "save_local") {
    return "Appended to a local file. No email, calendar, or network.";
  }
  if (result.effect?.type === "copy") {
    return "Copied locally. No email, calendar, or network.";
  }
  if (result.effect?.type === "download") {
    return "Saved a local file. No email, calendar, or network.";
  }
  if (result.effect?.type === "mac_action") {
    return "Ran only after Confirm. No email send, no silent shell, no API key on the URL.";
  }
  if (result.effect?.type === "screen") {
    return result.effect.summary ?? "Local screen only. Nothing was sent.";
  }
  return "The action stayed on this page. No email, calendar, or external API was used.";
}
