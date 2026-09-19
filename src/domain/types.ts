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
  "open_url",
  "search_web",
  "search_docs",
  "search_wikipedia",
  "search_error",
  "search_stack_overflow",
  "open_log_viewer",
  "open_maps",
  "open_github",
  "draft_email",
  "draft_message",
  "draft_event",
  "copy_to_clipboard",
  "extract_urls",
  "format_json",
  "summarize_locally",
  "capture_task",
  "capture_idea",
  "save_note",
  "save_markdown",
  "save_code_snippet",
  "save_quote",
  "save_link",
  "create_checklist",
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
  | "not_configured"
  | "quota";

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

export type ExecutionReason =
  | "stale"
  | "unconfirmed"
  | "unknown_tool"
  | "blocked_url"
  | "no_url"
  | "empty"
  | "save_failed"
  | "open_blocked"
  | "no_query"
  | "invalid_json"
  | "copy_failed"
  | "download_failed";

export type ExecutionEffect = {
  type: "open_url" | "save_local" | "copy" | "download" | "stub";
  url?: string;
  path?: string;
  count?: number;
  downloaded?: boolean;
  toolId?: string;
  text?: string;
  filename?: string;
  content?: string;
  mime?: string;
  entry?: { toolId: string; text: string; savedAt: string };
};

export type ExecutionResult = {
  ok: boolean;
  reason?: ExecutionReason;
  message: string;
  effect?: ExecutionEffect;
};

export const MAX_SUGGESTIONS = 3;

export const PROVIDER_TIMEOUT_MS = 800;

/** Bounded live-provider budget. Mock/local stay on PROVIDER_TIMEOUT_MS. */
export const JEV_TIMEOUT_MS = 5000;
