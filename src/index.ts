import { Block } from "./types";

export default function parse(text: string): Block[] {
  const lines = text.split('\n');
  let blocks: Block[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.length === 0) {
      continue;
    }
    blocks.push({
      type: "paragraph",
      raw: line,
      text: line,
      tokens: [
        {
          type: "text",
          raw: line,
          text: line,
        }
      ]
    })
  }
  return blocks;
}