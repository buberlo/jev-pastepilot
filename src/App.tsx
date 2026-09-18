import { useRef, useState, type ClipboardEvent } from "react";
import "./App.css";
import {
  buildPreview,
  confirmExecution,
  newStateVersion,
  routePaste,
  type ActionPreview,
  type ActionSuggestion,
  type ExecutionResult,
  type RouteOutcome,
} from "./domain";

const PASTE_HINT = "⌘V or Ctrl+V, or use Paste. Nothing runs until you confirm.";

export default function App() {
  const [text, setText] = useState("");
  const [stateVersion, setStateVersion] = useState(() => newStateVersion());
  const [outcome, setOutcome] = useState<RouteOutcome | null>(null);
  const [preview, setPreview] = useState<ActionPreview | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  function applyText(next: string, routed: RouteOutcome) {
    setText(next);
    setStateVersion(routed.stateVersion);
    setOutcome(routed);
    setPreview(null);
    setResult(null);
    setPasteError(null);
  }

  function handleTextChange(next: string) {
    const version = newStateVersion();
    applyText(next, routePaste(next, { stateVersion: version }));
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
    if (!outcome) {
      return;
    }
    setPreview(buildPreview(suggestion.toolId, text, stateVersion));
    setResult(null);
  }

  function handleConfirm() {
    if (!preview) {
      return;
    }
    const execution = confirmExecution({
      preview,
      currentStateVersion: stateVersion,
      confirmed: true,
    });
    setResult(execution);
    if (execution.ok) {
      setPreview(null);
    }
  }

  const showRouted = outcome !== null;
  const showSuggestions = showRouted && preview === null && outcome.suggestions.length > 0;
  const showEmpty =
    showRouted &&
    preview === null &&
    outcome.status === "abstain" &&
    outcome.suggestions.length === 0;

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
          <p className="hint">{pasteError ?? PASTE_HINT}</p>
          <button type="button" className="paste-button" onClick={() => void handlePasteButton()}>
            Paste
          </button>
        </div>
      </section>

      {showSuggestions ? (
        <section className="results" aria-label="Suggested actions">
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

      {showEmpty ? (
        <section className="empty" aria-label="Nothing fitting">
          <p>Nothing fitting.</p>
          {outcome.fallbackTools.length > 0 ? (
            <div className="fallback-list">
              <p>Pick a safe tool instead:</p>
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
            <button type="button" className="confirm-button" onClick={handleConfirm}>
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
          <strong>Local preview</strong>
          The action stayed on this page. No email, calendar, or external API was used.
        </aside>
      ) : null}
    </main>
  );
}
