import type { DecisionStatus } from "./types";

export type EnvMap = Record<string, string | undefined>;

export type GateThresholds = {
  /** Choice confidence at or above this may keep a contract-valid select. */
  confidenceHigh: number;
  /** Choice confidence below this becomes abstain (manual tools). */
  confidenceLow: number;
  /** Noul at or above this treats the paste as injection/suspicious. */
  suspiciousYes: number;
  /** Noul at or above this forces clarify, even when Choice confidence is high. */
  unclearYes: number;
  /** Score at or above this is a clear single-action fit. */
  fitClear: number;
  /** Score below this is no fit (abstain). Between this and fitClear → clarify. */
  fitNone: number;
  /**
   * Top-minus-second Choice probability below this prefers clarify.
   * Set 0 to disable. Local policy, not a vendor accuracy claim.
   */
  choiceMargin: number;
};

/** Conservative defaults. Not a vendor accuracy claim. Override with JEV_* env. */
export const DEFAULT_GATE_THRESHOLDS: GateThresholds = {
  confidenceHigh: 0.75,
  confidenceLow: 0.45,
  suspiciousYes: 0.7,
  unclearYes: 0.7,
  fitClear: 1.5,
  fitNone: 0.75,
  choiceMargin: 0.15,
};

export type ConfidenceBand = "high" | "mid" | "low" | "unknown";

export type ParallelSignals = {
  suspicious?: number;
  unclear?: number;
  fit?: number;
  /** Local ambiguous paste (or equivalent). Forces clarify on a select. */
  ambiguous?: boolean;
  /** Choice option probabilities. Used only for a weak-margin downgrade. */
  choiceProbabilities?: Record<string, number>;
};

function readNumber(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (typeof raw !== "string" || !raw.trim()) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    return fallback;
  }
  return value;
}

/**
 * Read gate thresholds from the server environment.
 * Invalid or inverted values fall back to the documented defaults.
 */
export function readGateThresholds(env: EnvMap = {}): GateThresholds {
  const confidenceHigh = readNumber(env.JEV_CONFIDENCE_HIGH, DEFAULT_GATE_THRESHOLDS.confidenceHigh, 0, 1);
  const confidenceLow = readNumber(env.JEV_CONFIDENCE_LOW, DEFAULT_GATE_THRESHOLDS.confidenceLow, 0, 1);
  const swapped = confidenceHigh <= confidenceLow;
  return {
    confidenceHigh: swapped ? DEFAULT_GATE_THRESHOLDS.confidenceHigh : confidenceHigh,
    confidenceLow: swapped ? DEFAULT_GATE_THRESHOLDS.confidenceLow : confidenceLow,
    suspiciousYes: readNumber(env.JEV_SUSPICIOUS_YES, DEFAULT_GATE_THRESHOLDS.suspiciousYes, 0, 1),
    unclearYes: readNumber(env.JEV_UNCLEAR_YES, DEFAULT_GATE_THRESHOLDS.unclearYes, 0, 1),
    fitClear: readNumber(env.JEV_FIT_CLEAR, DEFAULT_GATE_THRESHOLDS.fitClear, 0, 2),
    fitNone: readNumber(env.JEV_FIT_NONE, DEFAULT_GATE_THRESHOLDS.fitNone, 0, 2),
    choiceMargin: readNumber(env.JEV_CHOICE_MARGIN, DEFAULT_GATE_THRESHOLDS.choiceMargin, 0, 1),
  };
}

export function confidenceBand(
  confidence: number | undefined,
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS,
): ConfidenceBand {
  if (confidence === undefined || !Number.isFinite(confidence)) {
    return "unknown";
  }
  if (confidence >= thresholds.confidenceHigh) {
    return "high";
  }
  if (confidence >= thresholds.confidenceLow) {
    return "mid";
  }
  return "low";
}

/**
 * Gap between the top two Choice probabilities.
 * Undefined when fewer than two finite options are present.
 */
export function choiceMargin(probabilities?: Record<string, number>): number | undefined {
  if (!probabilities) {
    return undefined;
  }
  const ranked = Object.values(probabilities)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => b - a);
  if (ranked.length < 2) {
    return undefined;
  }
  return ranked[0] - ranked[1];
}

/**
 * Confidence is a routing hint, not proof of correctness.
 * Never upgrades: high keeps select, mid prefers clarify, low abstains.
 * Missing confidence on a select is treated as mid (safer fallback).
 * Ambiguity override may still downgrade a high-confidence select afterward.
 */
export function applyConfidenceGate(
  status: DecisionStatus,
  confidence: number | undefined,
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS,
): DecisionStatus {
  if (status === "abstain") {
    return "abstain";
  }
  const band = confidenceBand(confidence, thresholds);
  if (status === "select") {
    if (band === "high") {
      return "select";
    }
    if (band === "low") {
      return "abstain";
    }
    return "clarify";
  }
  if (band === "low") {
    return "abstain";
  }
  return "clarify";
}

/**
 * Unclear / ambiguous / flat Choice mass wins over raw Choice confidence.
 * Never upgrades: only downgrades a select to clarify.
 */
export function applyAmbiguityOverride(
  status: DecisionStatus,
  signals: ParallelSignals = {},
  thresholds: GateThresholds = DEFAULT_GATE_THRESHOLDS,
): DecisionStatus {
  if (status !== "select") {
    return status;
  }
  if (signals.ambiguous) {
    return "clarify";
  }
  if (signals.unclear !== undefined && signals.unclear >= thresholds.unclearYes) {
    return "clarify";
  }
  const margin = choiceMargin(signals.choiceProbabilities);
  if (margin !== undefined && thresholds.choiceMargin > 0 && margin < thresholds.choiceMargin) {
    return "clarify";
  }
  return status;
}

export type CombinedDecision = {
  status: DecisionStatus;
  actionId: string | null;
};

/**
 * Combine independent System One answers in code.
 * Choice picks the tool; Noul/Score/local ambiguity can only downgrade. Never invents an action.
 */
export function combineParallelDecision(args: {
  actionStatus: DecisionStatus;
  actionId: string | null;
  confidence?: number;
  signals?: ParallelSignals;
  thresholds?: GateThresholds;
  /** When false, skip fit/unclear/confidence downgrades so the contract can reject a bad id. */
  selectOffered?: boolean;
}): CombinedDecision {
  const thresholds = args.thresholds ?? DEFAULT_GATE_THRESHOLDS;
  const signals = args.signals ?? {};
  const selectOffered = args.selectOffered ?? true;

  if (signals.suspicious !== undefined && signals.suspicious >= thresholds.suspiciousYes) {
    return { status: "abstain", actionId: null };
  }

  let status = args.actionStatus;

  if (status === "select" && selectOffered) {
    if (signals.fit !== undefined) {
      if (signals.fit < thresholds.fitNone) {
        status = "abstain";
      } else if (signals.fit < thresholds.fitClear) {
        status = "clarify";
      }
    }
    status = applyConfidenceGate(status, args.confidence, thresholds);
    // Ambiguity wins after the confidence gate so a high Choice score cannot keep a vague select.
    status = applyAmbiguityOverride(status, signals, thresholds);
  } else if (status === "clarify") {
    status = applyConfidenceGate(status, args.confidence, thresholds);
  }

  return {
    status,
    actionId: status === "select" ? args.actionId : null,
  };
}
