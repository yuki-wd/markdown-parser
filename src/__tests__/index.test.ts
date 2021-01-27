import parse from "..";
import { Block } from "../types";

test("empty", () => {
  expect(parse("")).toEqual([]);
});

test("paragraph", () => {
  const text = `hello, world`;
  const expected: Block[] = [
    {
      type: "paragraph",
      raw: "hello, world",
      text: "hello, world",
      tokens: [
        {
          type: "text",
          raw: "hello, world",
          text: "hello, world",
        },
      ],
    },
  ];
  expect(parse(text)).toEqual(expected);
});
