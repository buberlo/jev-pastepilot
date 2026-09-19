import { catalogueCandidates, expandSuggestions, familyFor, TOOLS } from "../domain/tools";
import { MAX_SUGGESTIONS, TOOL_IDS } from "../domain/types";

describe("tool catalogue", () => {
  it("allowlists about 20–30 tools with labels and Jev descriptions", () => {
    expect(TOOL_IDS.length).toBeGreaterThanOrEqual(20);
    expect(TOOL_IDS.length).toBeLessThanOrEqual(30);
    expect(catalogueCandidates()).toHaveLength(TOOL_IDS.length);
    for (const id of TOOL_IDS) {
      expect(TOOLS[id].id).toBe(id);
      expect(TOOLS[id].label.length).toBeGreaterThan(2);
      expect(TOOLS[id].description.length).toBeGreaterThan(16);
    }
  });

  it("never expands UI suggestions past three buttons", () => {
    const offered = [...TOOL_IDS];
    for (const id of TOOL_IDS) {
      const buttons = expandSuggestions(id, offered);
      expect(buttons.length).toBeGreaterThan(0);
      expect(buttons.length).toBeLessThanOrEqual(MAX_SUGGESTIONS);
      expect(buttons[0]).toBe(id);
      expect(familyFor(id).length).toBeGreaterThan(0);
    }
  });
});
