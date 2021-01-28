import parse from "..";
import { Block } from "../types";

test("empty", () => {
  expect(parse("")).toEqual([]);
});

describe("Paragraphs", () => {
  test("A simple example with two paragraphs", () => {
    const text = "aaa\n\nbbb";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa",
      },
      {
        type: "paragraph",
        text: "bbb",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Paragraphs can contain multiple lines, but no blank lines", () => {
    const text = "aaa\nbbb\n\nccc\nddd";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa\nbbb",
      },
      {
        type: "paragraph",
        text: "ccc\nddd",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Multiple blank lines between paragraph have no effect", () => {
    const text = "aaa\n\n\nbbb";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa",
      },
      {
        type: "paragraph",
        text: "bbb",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Leading spaces are skipped", () => {
    const text = "  aaa\r bbb";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa\rbbb",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Lines after the first may be indented any amount, since indented code blocks cannot interrupt paragraphs", () => {
    const text =
      "aaa\n             bbb\n                                       ccc";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa\nbbb\nccc",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
});
