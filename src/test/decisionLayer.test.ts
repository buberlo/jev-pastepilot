import {
  applyConfidenceGate,
  combineParallelDecision,
  confidenceBand,
  DEFAULT_GATE_THRESHOLDS,
  readGateThresholds,
} from "../domain/decisionLayer";

describe("confidence gates", () => {
  it("splits high / mid / low bands at the documented defaults", () => {
    expect(confidenceBand(0.75)).toBe("high");
    expect(confidenceBand(0.81)).toBe("high");
    expect(confidenceBand(0.45)).toBe("mid");
    expect(confidenceBand(0.55)).toBe("mid");
    expect(confidenceBand(0.44)).toBe("low");
    expect(confidenceBand(0.2)).toBe("low");
    expect(confidenceBand(undefined)).toBe("unknown");
  });

  it("keeps a high-confidence select and never upgrades abstain", () => {
    expect(applyConfidenceGate("select", 0.81)).toBe("select");
    expect(applyConfidenceGate("abstain", 0.99)).toBe("abstain");
    expect(applyConfidenceGate("clarify", 0.99)).toBe("clarify");
  });

  it("downgrades mid select to clarify and low select to abstain", () => {
    expect(applyConfidenceGate("select", 0.55)).toBe("clarify");
    expect(applyConfidenceGate("select", 0.2)).toBe("abstain");
    expect(applyConfidenceGate("select", undefined)).toBe("clarify");
    expect(applyConfidenceGate("clarify", 0.2)).toBe("abstain");
  });

  it("reads thresholds from env and rejects inverted or out-of-range values", () => {
    const custom = readGateThresholds({
      JEV_CONFIDENCE_HIGH: "0.9",
      JEV_CONFIDENCE_LOW: "0.3",
      JEV_SUSPICIOUS_YES: "0.8",
    });
    expect(custom.confidenceHigh).toBe(0.9);
    expect(custom.confidenceLow).toBe(0.3);
    expect(custom.suspiciousYes).toBe(0.8);
    expect(applyConfidenceGate("select", 0.81, custom)).toBe("clarify");
    expect(applyConfidenceGate("select", 0.91, custom)).toBe("select");

    expect(readGateThresholds({ JEV_CONFIDENCE_HIGH: "0.2", JEV_CONFIDENCE_LOW: "0.8" })).toEqual(
      DEFAULT_GATE_THRESHOLDS,
    );
    expect(readGateThresholds({ JEV_CONFIDENCE_HIGH: "not-a-number" }).confidenceHigh).toBe(
      DEFAULT_GATE_THRESHOLDS.confidenceHigh,
    );
    expect(readGateThresholds({ JEV_SUSPICIOUS_YES: "1.4" }).suspiciousYes).toBe(
      DEFAULT_GATE_THRESHOLDS.suspiciousYes,
    );
  });
});

describe("parallel answer combining", () => {
  const select = {
    actionStatus: "select" as const,
    actionId: "open_log_viewer",
    confidence: 0.84,
  };

  it("keeps a high-confidence select when extra signals are clean", () => {
    expect(
      combineParallelDecision({
        ...select,
        signals: { suspicious: 0.04, unclear: 0.08, fit: 1.82 },
      }),
    ).toEqual({ status: "select", actionId: "open_log_viewer" });
  });

  it("abstains on a suspicious Noul even when Choice selected a tool", () => {
    expect(
      combineParallelDecision({
        ...select,
        signals: { suspicious: 0.91, unclear: 0.1, fit: 1.9 },
      }),
    ).toEqual({ status: "abstain", actionId: null });
  });

  it("clarifies when the unclear Noul is high or fit is only weak", () => {
    expect(
      combineParallelDecision({
        ...select,
        signals: { suspicious: 0.05, unclear: 0.82, fit: 1.8 },
      }),
    ).toEqual({ status: "clarify", actionId: null });
    expect(
      combineParallelDecision({
        ...select,
        signals: { suspicious: 0.05, unclear: 0.1, fit: 1.1 },
      }),
    ).toEqual({ status: "clarify", actionId: null });
  });

  it("abstains when the fit Score is below the no-fit threshold", () => {
    expect(
      combineParallelDecision({
        ...select,
        signals: { suspicious: 0.05, unclear: 0.1, fit: 0.4 },
      }),
    ).toEqual({ status: "abstain", actionId: null });
  });

  it("applies the confidence gate after parallel signals", () => {
    expect(
      combineParallelDecision({
        actionStatus: "select",
        actionId: "open_log_viewer",
        confidence: 0.22,
        signals: { suspicious: 0.05, unclear: 0.1, fit: 1.8 },
      }),
    ).toEqual({ status: "abstain", actionId: null });
    expect(
      combineParallelDecision({
        actionStatus: "select",
        actionId: "open_log_viewer",
        confidence: 0.55,
        signals: { suspicious: 0.05, unclear: 0.1, fit: 1.8 },
      }),
    ).toEqual({ status: "clarify", actionId: null });
  });

  it("never upgrades an action abstain or clarify to select", () => {
    expect(
      combineParallelDecision({
        actionStatus: "abstain",
        actionId: null,
        confidence: 0.99,
        signals: { suspicious: 0.01, unclear: 0.01, fit: 1.9 },
      }),
    ).toEqual({ status: "abstain", actionId: null });
    expect(
      combineParallelDecision({
        actionStatus: "clarify",
        actionId: null,
        confidence: 0.99,
        signals: { suspicious: 0.01, unclear: 0.01, fit: 1.9 },
      }),
    ).toEqual({ status: "clarify", actionId: null });
  });

  it("skips fit/unclear/confidence downgrades when the selected id was not offered", () => {
    expect(
      combineParallelDecision({
        actionStatus: "select",
        actionId: "send_email",
        confidence: 0.2,
        signals: { unclear: 0.9, fit: 0.1 },
        selectOffered: false,
      }),
    ).toEqual({ status: "select", actionId: "send_email" });
  });

  it("still abstains on a suspicious Noul when the selected id was not offered", () => {
    expect(
      combineParallelDecision({
        actionStatus: "select",
        actionId: "send_email",
        confidence: 0.9,
        signals: { suspicious: 0.95 },
        selectOffered: false,
      }),
    ).toEqual({ status: "abstain", actionId: null });
  });

  it("treats missing extra answers as unused signals", () => {
    expect(combineParallelDecision(select)).toEqual({
      status: "select",
      actionId: "open_log_viewer",
    });
  });
});
