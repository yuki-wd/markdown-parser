import { Block, FencedCodeBlock } from "./types";

const FENCED_CODE_BLOCK_REGEX = /^ {0,3}(?<marker>`{3,}|~{3,}) {0,}(?<info>.+)?$/;

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
        if (openBlock.type === "indented-code-block") {
          openBlock = {
            type: "indented-code-block",
            text: [openBlock.text, line.replace(/^ {0,4}/, "")].join("\n"),
          };
          continue;
        } else if (openBlock.type === "fenced-code-block") {
          openBlock = {
            ...(openBlock as FencedCodeBlock),
            raw: [openBlock.raw, line].join("\n"),
            text: [openBlock.text, line].join("\n"),
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

    // indented code blocks
    if (line.match(/^ {4,}.+/)) {
      const text = line.replace(/^ {0,4}/, "");
      if (
        openBlock != null &&
        openBlock.type !== "paragraph" &&
        openBlock.type !== "indented-code-block" &&
        openBlock.type !== "fenced-code-block"
      ) {
        blocks.push(closeBlock(openBlock));
        openBlock = undefined;
      }

      if (openBlock == null) {
        openBlock = {
          type: "indented-code-block",
          text: text,
        };
        continue;
      }
      if (openBlock.type === "indented-code-block") {
        openBlock = {
          type: "indented-code-block",
          text: [openBlock.text, text].join("\n"),
        };
        continue;
      }
    }

    // fenced code blocks
    const fencedCodeBlockMatch = line.match(FENCED_CODE_BLOCK_REGEX);
    if (fencedCodeBlockMatch) {
      if (openBlock != null) {
        if (openBlock.type === "fenced-code-block") {
          const endMarker = fencedCodeBlockMatch.groups?.marker;
          const startMarker = openBlock.raw
            .split("\n")[0]
            .match(FENCED_CODE_BLOCK_REGEX)?.groups?.marker;
          if (
            endMarker != null &&
            startMarker != null &&
            fencedCodeBlockMatch.groups?.info == null &&
            endMarker[0] === startMarker[0] &&
            endMarker.length >= startMarker.length
          ) {
            blocks.push(closeBlock(openBlock, line));
            openBlock = undefined;
            continue;
          }
        } else {
          blocks.push(closeBlock(openBlock));
          openBlock = undefined;
        }
      }

      if (openBlock == null) {
        openBlock = {
          type: "fenced-code-block",
          raw: line,
          text: "",
          info: fencedCodeBlockMatch.groups?.info,
        };
        continue;
      }
    }

    // paragraphs
    if (openBlock != null && openBlock.type !== "paragraph") {
      if (openBlock.type === "fenced-code-block") {
        const indent = openBlock.raw.match(/^(?<indent> {1,3})/);
        const indentLength =
          indent !== null && indent.groups != null
            ? indent.groups.indent.length
            : 0;
        const newOpenBlock: FencedCodeBlock = {
          ...openBlock,
          raw: [openBlock.raw, line].join("\n"),
          text: [
            openBlock.text,
            line.replace(new RegExp(`^ {0,${indentLength}}`), ""),
          ].join("\n"),
        };
        openBlock = newOpenBlock;
        continue;
      }
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
function closeBlock(block: Block, line?: string): Block {
  if (block.type === "indented-code-block") {
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
  if (block.type === "fenced-code-block") {
    const newText = block.text
      .split("\n")
      .filter((v, i) => {
        return i !== 0;
      })
      .join("\n");
    return {
      ...block,
      raw: line ? [block.raw, line].join("\n") : block.raw,
      text: newText,
    };
  }
  return block;
}
