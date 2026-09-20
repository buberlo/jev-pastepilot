import { parseFacts } from "../domain/parsers";

describe("exact local parsers", () => {
  it("extracts http(s) URLs and strips trailing punctuation", () => {
    const facts = parseFacts("See https://example.com/docs, and http://localhost:5173/app.");
    expect(facts.urls).toEqual(["https://example.com/docs", "http://localhost:5173/app"]);
  });

  it("extracts date hints and times without inventing a schedule", () => {
    const facts = parseFacts("Lass uns morgen um 15:00 über https://example.com sprechen.");
    expect(facts.dateHints.map((hint) => hint.toLowerCase())).toContain("morgen");
    expect(facts.times).toEqual(["15:00"]);
    expect(facts.urls).toEqual(["https://example.com"]);
    expect(facts).not.toHaveProperty("scheduledAt");
    expect(facts).not.toHaveProperty("send");
    expect(JSON.stringify(facts)).not.toMatch(/2026-09-19T15:00/);
  });

  it("extracts ISO dates, numeric dates, English weekdays and clock times", () => {
    const facts = parseFacts("Meet Friday 2026-09-20 at 3pm or 09/21/26.");
    expect(facts.dateHints).toEqual(expect.arrayContaining(["Friday", "2026-09-20", "09/21/26"]));
    expect(facts.times.map((time) => time.toLowerCase())).toContain("3pm");
  });

  it("extracts emails as parameters without granting send permission", () => {
    const facts = parseFacts("please send this to ada@example.com tomorrow");
    expect(facts.emails).toEqual(["ada@example.com"]);
    expect(facts.dateHints.map((hint) => hint.toLowerCase())).toContain("tomorrow");
    expect(Object.keys(facts).sort()).toEqual(["dateHints", "emails", "phones", "times", "urls"]);
  });

  it("extracts phone numbers without granting a call or send", () => {
    expect(parseFacts("+1 415 555 2671").phones).toEqual(["+1 415 555 2671"]);
    expect(parseFacts("(415) 555-2671").phones[0]).toMatch(/415/);
    expect(parseFacts("Meet 2026-09-20 at 15:00").phones).toEqual([]);
  });

  it("returns empty collections for ordinary text with no exact tokens", () => {
    expect(parseFacts("The garden is quieter after rain.")).toEqual({
      urls: [],
      dateHints: [],
      times: [],
      emails: [],
      phones: [],
    });
  });
});
