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
    if (line.trim().length === 0) {
      if (openBlock != null) {
        if (openBlock.type === "code-block") {
          openBlock = {
            type: "code-block",
            text: [openBlock.text, line.replace(/^ {0,4}/, "")].join("\n"),
          };
          continue;
        } else {
          blocks.push(closeBlock(openBlock));
          openBlock = undefined;
        }
      }
      continue;
    }

    // setext headings
    const setextHeadingMatch = line.match(/^ {0,3}(?<level>-{1,}|={1,}) {0,}$/);
    if (
      openBlock != null &&
      openBlock.type === "paragraph" &&
      setextHeadingMatch?.groups != null
    ) {
      openBlock = {
        type: "heading",
        level: setextHeadingMatch.groups.level[0] === "-" ? 2 : 1,
        text: openBlock.text,
      };
      continue;
    }

    // thematic breaks
    if (line.match(/^ {0,3}([-_*] {0,}){3,}$/)) {
      if (openBlock != null) {
        blocks.push(closeBlock(openBlock));
        openBlock = undefined;
      }
      openBlock = {
        type: "thematic-break",
      };
      continue;
    }

    // atx headings
    const atxHeadingsMatch = line.match(/^ {0,3}(?<atx>#{1,6})(?<text> .*|$)/);
    if (atxHeadingsMatch?.groups != null) {
      if (openBlock != null) {
        blocks.push(closeBlock(openBlock));
        openBlock = undefined;
      }
      openBlock = {
        type: "heading",
        level: atxHeadingsMatch.groups.atx.length as 1 | 2 | 3 | 4 | 5 | 6,
        text: atxHeadingsMatch.groups.text.replace(/ #{1,} {0,}$/, "").trim(),
      };
      continue;
    }

    // code blocks
    if (line.match(/^ {4,}.+/)) {
      const text = line.replace(/^ {0,4}/, "");
      if (
        openBlock != null &&
        openBlock.type !== "paragraph" &&
        openBlock.type !== "code-block"
      ) {
        blocks.push(closeBlock(openBlock));
        openBlock = undefined;
      }

      if (openBlock == null) {
        openBlock = {
          type: "code-block",
          text: text,
        };
        continue;
      }
      if (openBlock.type === "code-block") {
        openBlock = {
          type: "code-block",
          text: [openBlock.text, text].join("\n"),
        };
        continue;
      }
    }

    // paragraphs
    if (openBlock != null && openBlock.type !== "paragraph") {
      blocks.push(closeBlock(openBlock));
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
    blocks.push(closeBlock(openBlock));
  }
  return blocks;
}

/**
 * close状態にする
 * @param block open状態のblock
 */
function closeBlock(block: Block): Block {
  if (block.type === "code-block") {
    const newText = block.text
      .split("\n")
      .filter((v, i, array) => {
        if ((i === 0 || i === array.length - 1) && v.trim().length < 1) {
          return false;
        }
        return true;
      })
      .join("\n");
    return {
      ...block,
      text: newText,
    };
  }
  return block;
}
