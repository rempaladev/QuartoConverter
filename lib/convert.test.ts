import { describe, it, expect } from "vitest";
import { stripStrayCodeFence } from "./convert";

describe("stripStrayCodeFence", () => {
  it("strips a fenced block with a language tag", () => {
    const input = "```qmd\n---\ntitle: Test\n---\n\nHello\n```";
    expect(stripStrayCodeFence(input)).toBe("---\ntitle: Test\n---\n\nHello");
  });

  it("strips a fence with no language tag", () => {
    const input = "```\ncontent here\n```";
    expect(stripStrayCodeFence(input)).toBe("content here");
  });

  it("leaves unfenced text untouched", () => {
    const input = "---\ntitle: Test\n---\n\nHello";
    expect(stripStrayCodeFence(input)).toBe(input);
  });

  it("trims surrounding whitespace", () => {
    const input = "\n\n---\ntitle: Test\n---\n\n  \n";
    expect(stripStrayCodeFence(input)).toBe("---\ntitle: Test\n---");
  });
});
