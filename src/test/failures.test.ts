import { logOperational } from "../domain/log";
import { createProvider, wrapProvider } from "../domain/providers";
import { routePaste } from "../domain/route";
import { SAFE_FALLBACK_IDS } from "../domain/tools";

describe("provider failure paths", () => {
  it("treats a timeout as an operational failure with manual fallbacks", async () => {
    const outcome = await routePaste("Service failed: connection refused on the database socket.", {
      scenario: "timeout",
      timeoutMs: 25,
    });
    expect(outcome.status).toBe("failed");
    expect(outcome.failure).toBe("timeout");
    expect(outcome.decision).toBeNull();
    expect(outcome.primaryActionId).toBeNull();
    expect(outcome.suggestions).toEqual([]);
    expect(outcome.fallbackTools.map((item) => item.toolId)).toEqual([...SAFE_FALLBACK_IDS]);
  });

  it("treats malformed provider output as a failure, not a semantic decision", async () => {
    const outcome = await routePaste("An app that lets me assemble virtual model kits.", {
      scenario: "malformed",
    });
    expect(outcome.status).toBe("failed");
    expect(outcome.failure).toBe("malformed");
    expect(outcome.decision).toBeNull();
    expect(outcome.fallbackTools.length).toBeGreaterThan(0);
  });

  it("rejects a stale provider stateVersion", async () => {
    const outcome = await routePaste("Lass uns morgen über das Projekt sprechen.", {
      scenario: "stale",
      stateVersion: "v-current",
    });
    expect(outcome.status).toBe("failed");
    expect(outcome.failure).toBe("stale");
    expect(outcome.decision).toBeNull();
  });

  it("rejects a select that invents an unknown action", async () => {
    const outcome = await routePaste("Handle this.", { scenario: "unknown_action" });
    expect(outcome.status).toBe("failed");
    expect(outcome.failure).toBe("invalid_contract");
    expect(outcome.primaryActionId).toBeNull();
  });

  it("rejects a select without an action id", async () => {
    const outcome = await routePaste("Handle this.", { scenario: "select_without_id" });
    expect(outcome.status).toBe("failed");
    expect(outcome.failure).toBe("invalid_contract");
  });
});

describe("provider adapter", () => {
  it("exposes replaceable mock, local and jev adapters", async () => {
    const request = {
      requestId: "r",
      stateVersion: "v",
      input: "Service failed: connection refused.",
      context: {},
      candidates: [{ id: "open_log_viewer", description: "log" }],
    };
    const mock = await createProvider("mock").decide(request);
    const local = await createProvider("local").decide(request);
    expect(mock).toMatchObject({ provider: "mock", actionId: "open_log_viewer" });
    expect(local).toMatchObject({ provider: "local", actionId: "open_log_viewer" });
    await expect(createProvider("jev").decide(request)).rejects.toThrow(/Milestone 2/);
  });

  it("wraps the mock for deterministic malformed output", async () => {
    const raw = await wrapProvider(createProvider("mock"), "malformed").decide({
      requestId: "r",
      stateVersion: "v",
      input: "x",
      context: {},
      candidates: [],
    });
    expect(raw).toEqual({ not: "a decision" });
  });
});

describe("operational logging", () => {
  it("never logs pasted text or TYPESAFE_API_KEY", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logOperational("decision", {
      requestId: "r1",
      input: "secret clipboard",
      TYPESAFE_API_KEY: "sk-should-never-appear",
      typesafeApiKey: "also-secret",
      status: "select",
    });
    const payload = JSON.stringify(spy.mock.calls[0]);
    expect(payload).toContain("r1");
    expect(payload).toContain("select");
    expect(payload).not.toContain("secret clipboard");
    expect(payload).not.toContain("sk-should-never-appear");
    expect(payload).not.toContain("also-secret");
    expect(payload).not.toContain("TYPESAFE_API_KEY");
    spy.mockRestore();
  });
});
