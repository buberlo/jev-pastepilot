export const CONTENT_KINDS = [
  "error_log",
  "url",
  "meeting",
  "task",
  "idea",
  "ordinary",
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export type DecisionStatus = "select" | "clarify" | "abstain";

export type DecisionProviderId = "mock" | "local" | "jev";

export const TOOL_IDS = [
  "open_log_viewer",
  "search_docs",
  "open_url",
  "draft_event",
  "capture_task",
  "capture_idea",
  "save_note",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolDefinition = {
  id: ToolId;
  label: string;
  description: string;
  safeFallback: boolean;
};

/** Exact tokens extracted from text. Parsers never invent send/schedule fields. */
export type ParsedFacts = {
  urls: string[];
  dateHints: string[];
  times: string[];
  emails: string[];
};

export type DecisionRequest = {
  requestId: string;
  stateVersion: string;
  input: string;
  context: Record<string, unknown>;
  candidates: Array<{ id: string; description: string }>;
};

export type DecisionResult = {
  requestId: string;
  stateVersion: string;
  status: DecisionStatus;
  actionId: string | null;
  provider: DecisionProviderId;
  confidence?: number;
};

export type ActionSuggestion = {
  toolId: ToolId;
  label: string;
};

export type OperationalFailure =
  | "timeout"
  | "malformed"
  | "stale"
  | "invalid_contract"
  | "not_configured";

export type RouteStatus = DecisionStatus | "failed";

export type RouteOutcome = {
  requestId: string;
  stateVersion: string;
  status: RouteStatus;
  /** Internal only — never render this in the UI. */
  contentKind: ContentKind | null;
  suggestions: ActionSuggestion[];
  fallbackTools: ActionSuggestion[];
  parsed: ParsedFacts;
  primaryActionId: string | null;
  decision: DecisionResult | null;
  failure: OperationalFailure | null;
};

export type ActionPreview = {
  toolId: ToolId;
  title: string;
  summary: string;
  facts: string[];
  stateVersion: string;
};

export type ExecutionResult = {
  ok: boolean;
  reason?: "stale" | "unconfirmed" | "unknown_tool";
  message: string;
};

export const MAX_SUGGESTIONS = 3;

export const PROVIDER_TIMEOUT_MS = 800;
