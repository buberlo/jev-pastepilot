import { confirmExecution } from "../domain/execute";
import { allowlistedHttpUrl, firstAllowlistedUrl } from "../domain/openUrl";
import { buildPreview } from "../domain/preview";

describe("http(s) URL allowlist", () => {
  it("accepts http and https and normalizes href", () => {
    expect(allowlistedHttpUrl("https://example.com/docs")).toBe("https://example.com/docs");
    expect(allowlistedHttpUrl("http://localhost:5173/opened.html")).toBe(
      "http://localhost:5173/opened.html",
    );
    expect(allowlistedHttpUrl("  HTTPS://Example.COM/path  ")).toBe("https://example.com/path");
  });

  it("rejects non-http schemes, credentials, and junk", () => {
    expect(allowlistedHttpUrl("javascript:alert(1)")).toBeNull();
    expect(allowlistedHttpUrl("data:text/html,<h1>x</h1>")).toBeNull();
    expect(allowlistedHttpUrl("file:///etc/passwd")).toBeNull();
    expect(allowlistedHttpUrl("ftp://example.com/file")).toBeNull();
    expect(allowlistedHttpUrl("https://user:pass@example.com/secret")).toBeNull();
    expect(allowlistedHttpUrl("https://example.com/\u0000evil")).toBeNull();
    expect(allowlistedHttpUrl("not a url")).toBeNull();
    expect(allowlistedHttpUrl("")).toBeNull();
  });

  it("picks the first allowlisted candidate and skips blocked ones", () => {
    expect(
      firstAllowlistedUrl([
        "javascript:alert(1)",
        "https://user:pass@evil.example",
        "https://example.com/ok",
      ]),
    ).toBe("https://example.com/ok");
    expect(firstAllowlistedUrl(["file:///tmp", "data:text/plain,hi"])).toBeNull();
  });
});

describe("open_url execution gate", () => {
  const input = "See https://example.com/docs for notes.";

  it("does not open without Confirm or on a stale version", () => {
    const preview = buildPreview("open_url", input, "v1");
    expect(
      confirmExecution({ preview, currentStateVersion: "v1", confirmed: false, input }).ok,
    ).toBe(false);
    expect(
      confirmExecution({ preview, currentStateVersion: "v2", confirmed: true, input }).reason,
    ).toBe("stale");
  });

  it("returns an open_url effect for the first allowlisted parser URL", () => {
    const preview = buildPreview("open_url", input, "v1");
    const result = confirmExecution({
      preview,
      currentStateVersion: "v1",
      confirmed: true,
      input,
    });
    expect(result.ok).toBe(true);
    expect(result.effect).toEqual({ type: "open_url", url: "https://example.com/docs" });
    expect(result.message).toMatch(/Opened https:\/\/example.com\/docs/);
  });

  it("refuses when no URL was parsed", () => {
    const preview = buildPreview("open_url", "no link here", "v1");
    const result = confirmExecution({
      preview,
      currentStateVersion: "v1",
      confirmed: true,
      input: "no link here",
    });
    expect(result).toMatchObject({ ok: false, reason: "no_url" });
  });

  it("refuses credentialed or non-http URLs even after Confirm", () => {
    const blocked = "https://user:pass@example.com/secret";
    const preview = buildPreview("open_url", blocked, "v1");
    const result = confirmExecution({
      preview,
      currentStateVersion: "v1",
      confirmed: true,
      input: blocked,
    });
    expect(result).toMatchObject({ ok: false, reason: "blocked_url" });
  });
});
