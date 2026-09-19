import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
  handleShareRequest,
  parseShareBody,
  readSharedText,
  shareAppUrl,
  shareRedirectPath,
} from "../domain/share";

describe("URL share ingest", () => {
  it("reads ?text= and decodes it", () => {
    expect(readSharedText("?text=hello%20world")).toBe("hello world");
    expect(readSharedText("text=Service%20failed")).toBe("Service failed");
  });

  it("falls back to ?q= when text is absent", () => {
    expect(readSharedText("?q=Handle%20this.")).toBe("Handle this.");
  });

  it("prefers text over q", () => {
    expect(readSharedText("?q=ignored&text=keep")).toBe("keep");
  });

  it("treats a present empty text as a share, not as missing", () => {
    expect(readSharedText("?text=")).toBe("");
    expect(readSharedText("?scenario=timeout")).toBeNull();
    expect(readSharedText("")).toBeNull();
  });

  it("keeps demo flags when building the app URL path", () => {
    expect(shareRedirectPath("hi", "?scenario=timeout&q=old")).toBe(
      "/?scenario=timeout&text=hi",
    );
  });

  it("builds the local app URL the Mac wrapper opens", () => {
    expect(shareAppUrl("hello world")).toBe("http://localhost:5173/?text=hello+world");
  });
});

describe("share-target body", () => {
  it("reads form fields used by Share Target / Shortcuts POST", () => {
    expect(parseShareBody("text=hello+world", "application/x-www-form-urlencoded")).toBe(
      "hello world",
    );
    expect(parseShareBody("q=later", "application/x-www-form-urlencoded")).toBe("later");
    expect(parseShareBody("url=https%3A%2F%2Fexample.com", "application/x-www-form-urlencoded")).toBe(
      "https://example.com",
    );
  });

  it("reads plain text and JSON bodies", () => {
    expect(parseShareBody("raw paste", "text/plain")).toBe("raw paste");
    expect(parseShareBody('{"text":"from json"}', "application/json")).toBe("from json");
    expect(parseShareBody("{", "application/json")).toBeNull();
    expect(parseShareBody("nope", "multipart/form-data")).toBeNull();
  });
});

describe("POST /share endpoint mapping", () => {
  it("redirects GET /share?text= onto the app ingest URL", () => {
    expect(
      handleShareRequest({
        method: "GET",
        url: "/share?text=Service%20failed&scenario=none",
      }),
    ).toEqual({
      status: 302,
      location: "/?scenario=none&text=Service+failed",
    });
  });

  it("redirects POST form bodies with 303", () => {
    expect(
      handleShareRequest({
        method: "POST",
        url: "/share",
        contentType: "application/x-www-form-urlencoded",
        body: "text=Lass+uns+morgen+sprechen",
      }),
    ).toEqual({
      status: 303,
      location: "/?text=Lass+uns+morgen+sprechen",
    });
  });

  it("ignores other paths", () => {
    expect(handleShareRequest({ method: "GET", url: "/" })).toBeNull();
  });

  it("rejects an unreadable POST body", () => {
    expect(
      handleShareRequest({
        method: "POST",
        url: "/share",
        contentType: "application/json",
        body: "{",
      }),
    ).toEqual({ status: 400, location: "" });
  });
});

describe("macos share wrapper", () => {
  it("prints the same ingest URL the web app accepts", () => {
    const script = resolve("macos/share-to-pastepilot.sh");
    const out = execFileSync(script, ["--print-url", "Service failed: connection refused"], {
      encoding: "utf8",
    });
    expect(out.trim()).toBe(
      "http://localhost:5173/?text=Service%20failed%3A%20connection%20refused",
    );
  });
});
