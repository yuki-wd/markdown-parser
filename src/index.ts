import { Block } from "./types";

export default function parse(text: string): Block[] {
  const blocks: Block[] = [];
  let openBlock: Block | undefined = undefined;

  if (text.length === 0) {
    return blocks;
  }

  const lines = text.split(/[\r\n]/);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.length === 0) {
      if (openBlock != null) {
        blocks.push(openBlock);
        openBlock = undefined;
      }
      continue;
    }

    // thematic breaks
    if (line.match(/^ {0,3}([-_*] {0,}){3,}$/)) {
      if (openBlock != null) {
        blocks.push(openBlock);
        openBlock = undefined;
      }
      openBlock = {
        type: "thematic-break",
      };
      continue;
    }

    // paragraphs
    if (openBlock != null && openBlock.type !== "paragraph") {
      blocks.push(openBlock);
      openBlock = undefined;
    }
    openBlock =
      openBlock == null
        ? {
            type: "paragraph",
            text: line.trim(),
          }
        : {
            type: "paragraph",
            text: [openBlock.text, line.trim()].join("\n"),
          };
  }

  if (openBlock != null) {
    blocks.push(openBlock);
  }
  return blocks;
}
