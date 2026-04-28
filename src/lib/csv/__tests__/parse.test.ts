import { describe, it, expect } from "vitest";
import { parseCsv } from "@/lib/csv/parse";

describe("parseCsv", () => {
  it("parses a simple grid", () => {
    expect(parseCsv("a,b,c\n1,2,3\n")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respects quoted commas and quoted quotes", () => {
    expect(parseCsv('name,note\n"Doe, J.","said ""hi"""\n')).toEqual([
      ["name", "note"],
      ["Doe, J.", 'said "hi"'],
    ]);
  });

  it("skips blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns trailing row without newline", () => {
    expect(parseCsv("a,b\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});
