import { Block } from "./types";

export default function parse(text: string): Block[] {
  let blocks: Block[] = [];

  if (text.length === 0) {
    return blocks;
  }

  const lines = text.split(/[\r\n]{2,}/);
  if (lines.length < 1) {
    return blocks;
  }

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.length === 0) {
      continue;
    }

    // paragraphs
    const splittedBySoftBreak = line.split(/(\r|\n)/);
    blocks.push({
      type: "paragraph",
      text: splittedBySoftBreak
        .map((t) => {
          if (t.match(/\r|\n/) !== null) {
            return t;
          }
          return t.trim();
        })
        .join(""),
    });
  }

  return blocks;
}
