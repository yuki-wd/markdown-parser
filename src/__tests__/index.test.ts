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
    const r = parse(text);
    expect(r).toEqual(block);
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
    const text = "  aaa\n bbb";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "aaa\nbbb",
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

describe("Thematic breaks", () => {
  test("basic", () => {
    const text = "***\n---\n___";
    const block: Block[] = [
      {
        type: "thematic-break",
      },
      {
        type: "thematic-break",
      },
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Wrong characters", () => {
    const text = "+++";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "+++",
      },
    ];
    expect(parse(text)).toEqual(block);
    const text2 = "===";
    const block2: Block[] = [{ type: "paragraph", text: "===" }];
    expect(parse(text2)).toEqual(block2);
  });
  test("Not enough characters", () => {
    const text = "--\n**\n__";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "--\n**\n__",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("One to three spaces indent are allowed", () => {
    const text = " ***\n  ***\n   ***";
    const block: Block[] = [
      {
        type: "thematic-break",
      },
      {
        type: "thematic-break",
      },
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Four spaces is too many", () => {
    const text = "Foo\n    ***";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "Foo\n***",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("More than three characters may be used", () => {
    const text = "_____________________________________";
    const block: Block[] = [
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Spaces are allowed between the characters", () => {
    const text = " - - -";
    const block: Block[] = [
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text)).toEqual(block);
    const text2 = " **  * ** * ** * **";
    const block2: Block[] = [
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text2)).toEqual(block2);
    const text3 = "-     -      -      -";
    const block3: Block[] = [
      {
        type: "thematic-break",
      },
    ];
    expect(parse(text3)).toEqual(block3);
  });
  test("Spaces are allowed at the end", () => {
    const text = "- - - -    ";
    const block: Block[] = [{ type: "thematic-break" }];
    expect(parse(text)).toEqual(block);
  });
  test("No other characters may occur in the line", () => {
    const text = "_ _ _ _ a\n\na------\n\n---a---";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "_ _ _ _ a",
      },
      {
        type: "paragraph",
        text: "a------",
      },
      {
        type: "paragraph",
        text: "---a---",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
  test("Thematic breaks can interrupt a paragraph", () => {
    const text = "Foo\n***\nbar";
    const block: Block[] = [
      {
        type: "paragraph",
        text: "Foo",
      },
      {
        type: "thematic-break",
      },
      {
        type: "paragraph",
        text: "bar",
      },
    ];
    expect(parse(text)).toEqual(block);
  });
});
