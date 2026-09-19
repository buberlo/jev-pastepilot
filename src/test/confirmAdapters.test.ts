import { confirmExecution } from "../domain/execute";
import { buildMailtoUrl, buildIcsDraft } from "../domain/drafts";
import { parseFacts } from "../domain/parsers";
import { buildPreview } from "../domain/preview";
import { urlForSearchTool } from "../domain/searchLinks";
import { asChecklist, looksLikeJson, prettyJson } from "../domain/signals";

function confirm(toolId: Parameters<typeof buildPreview>[0], input: string) {
  const preview = buildPreview(toolId, input, "v1");
  return confirmExecution({
    preview,
    currentStateVersion: "v1",
    confirmed: true,
    input,
  });
}

describe("search and maps adapters", () => {
  it("builds allowlisted DuckDuckGo, Stack Overflow, maps, and GitHub URLs", () => {
    const error = "Service failed: connection refused on the database socket.";
    const parsed = parseFacts(error);
    expect(urlForSearchTool("search_web", error, parsed)).toMatch(
      /^https:\/\/duckduckgo\.com\/\?q=/,
    );
    expect(urlForSearchTool("search_error", error, parsed)).toMatch(
      /^https:\/\/duckduckgo\.com\/\?q=/,
    );
    expect(urlForSearchTool("search_stack_overflow", error, parsed)).toMatch(
      /^https:\/\/stackoverflow\.com\/search\?q=/,
    );
    expect(urlForSearchTool("open_maps", "221B Baker Street, London", parseFacts(""))).toMatch(
      /^https:\/\/www\.google\.com\/maps\/search\//,
    );
    expect(
      urlForSearchTool(
        "open_github",
        "https://github.com/buberlo/jev-pastepilot",
        parseFacts("https://github.com/buberlo/jev-pastepilot"),
      ),
    ).toBe("https://github.com/buberlo/jev-pastepilot");
  });

  it("opens a search URL only after Confirm", () => {
    const input = "Service failed: connection refused on the database socket.";
    const preview = buildPreview("search_error", input, "v1");
    expect(
      confirmExecution({ preview, currentStateVersion: "v1", confirmed: false, input }).ok,
    ).toBe(false);
    const result = confirm( "search_error", input);
    expect(result.ok).toBe(true);
    expect(result.effect?.type).toBe("open_url");
    expect(result.effect?.url).toMatch(/^https:\/\/duckduckgo\.com\//);
  });
});

describe("draft adapters", () => {
  it("builds a mailto draft and never treats Confirm as send", () => {
    const input = "Please send this to ada@example.com tomorrow";
    const url = buildMailtoUrl(input, parseFacts(input));
    expect(url).toMatch(/^mailto:ada@example\.com\?/);
    expect(url).toContain("body=");
    const result = confirm("draft_email", input);
    expect(result.ok).toBe(true);
    expect(result.effect?.type).toBe("open_url");
    expect(result.effect?.url).toMatch(/^mailto:/);
    expect(result.message).toMatch(/nothing was sent/i);
  });

  it("builds an ICS draft without inventing a scheduled time from 'tomorrow'", () => {
    const input = "Lass uns morgen um 15:00 über das Projekt sprechen.";
    const ics = buildIcsDraft(input, parseFacts(input), new Date("2026-09-19T21:00:00.000Z"));
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("not scheduled");
    expect(ics).toContain("Date hint: morgen");
    expect(ics).not.toMatch(/20260920T150000/);
    const result = confirm("draft_event", input);
    expect(result.effect?.type).toBe("download");
    expect(result.effect?.filename).toBe("pastepilot-draft.ics");
  });
});

describe("transform adapters", () => {
  it("pretty-prints JSON and rejects junk", () => {
    expect(looksLikeJson('{"ok":true}')).toBe(true);
    expect(prettyJson('{"ok":true}')).toBe('{\n  "ok": true\n}');
    const ok = confirm("format_json", '{"ok":true}');
    expect(ok.effect?.type).toBe("download");
    expect(ok.effect?.filename).toBe("pastepilot.json");
    expect(ok.effect?.content).toContain('"ok": true');
    expect(confirm("format_json", "not json").reason).toBe("invalid_json");
  });

  it("copies text and extracted URLs after Confirm", () => {
    const copied = confirm("copy_to_clipboard", "The garden is quieter after rain.");
    expect(copied.effect).toEqual({
      type: "copy",
      text: "The garden is quieter after rain.",
    });
    const extracted = confirm(
      "extract_urls",
      "See https://example.com/docs and https://example.org/a.",
    );
    expect(extracted.effect?.type).toBe("copy");
    expect(extracted.effect?.text).toContain("https://example.com/docs");
    expect(confirm("extract_urls", "no links").reason).toBe("no_url");
  });

  it("turns lines into a checklist before a local save", () => {
    expect(asChecklist("milk\neggs")).toBe("- [ ] milk\n- [ ] eggs");
    const result = confirm("create_checklist", "milk\neggs");
    expect(result.effect?.type).toBe("save_local");
    expect(result.effect?.entry?.text).toContain("- [ ] milk");
  });
});
