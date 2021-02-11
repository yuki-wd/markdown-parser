import { Block } from "./types";

const FENCED_CODE_BLOCK_REGEX = /^(?<marker> {0,3}(?:`{3,}|~{3,})) {0,}(?<info>.+)?$/;

class Parser {
  private blocks: Block[] = [];
  private openBlock: Block | undefined;
  public parse(markdown: string): Block[] {
    const lines = markdown.split(/[\r\n]/);
    for (const line of lines) {
      const block = this.parseLine(line);
      if (block != null) {
        this.openBlock = block;
      }
    }
    this.closeBlock();
    return this.blocks;
  }

  private parseLine(line: string): Block | undefined {
    if (line.trim().length === 0) {
      if (this.openBlock?.type === "indented-code-block") {
        return {
          ...this.openBlock,
          text: [this.openBlock.text, line.replace(/^ {0,4}/, "")].join("\n"),
        };
      }
      if (this.openBlock?.type === "fenced-code-block") {
        return {
          ...this.openBlock,
          text: [this.openBlock.text, line].join("\n"),
        };
      }
      this.closeBlock();
      return undefined;
    }

    // Setext headings
    const setextHeadingMatch = line.match(/^ {0,3}(?<level>-{1,}|={1,}) {0,}$/);
    if (
      setextHeadingMatch?.groups != null &&
      this.openBlock?.type === "paragraph"
    ) {
      return {
        type: "heading",
        level: setextHeadingMatch.groups.level[0] === "-" ? 2 : 1,
        text: this.openBlock.text,
      };
    }

    // Thematic breaks
    if (line.match(/^ {0,3}([-_*] {0,}){3,}$/)) {
      this.closeBlock();
      return {
        type: "thematic-break",
      };
    }

    // ATX headings
    const atxHeadingsMatch = line.match(/^ {0,3}(?<atx>#{1,6})(?<text> .*|$)/);
    if (atxHeadingsMatch?.groups != null) {
      this.closeBlock();
      return {
        type: "heading",
        level: atxHeadingsMatch.groups.atx.length as 1 | 2 | 3 | 4 | 5 | 6,
        text: atxHeadingsMatch.groups.text.replace(/ #{1,} {0,}$/, "").trim(),
      };
    }

    // Indented code blocks
    if (
      line.match(/^ {4,}.+/) &&
      this.openBlock?.type !== "paragraph" &&
      this.openBlock?.type !== "fenced-code-block"
    ) {
      const text = line.replace(/^ {0,4}/, "");
      if (this.openBlock?.type === "indented-code-block") {
        return {
          type: "indented-code-block",
          text: [this.openBlock.text, text].join("\n"),
        };
      }
      this.closeBlock();
      return {
        type: "indented-code-block",
        text: text,
      };
    }

    const fencedCodeBlockMatch = line.match(FENCED_CODE_BLOCK_REGEX);
    if (fencedCodeBlockMatch && fencedCodeBlockMatch.groups) {
      // fenced code block終了
      if (this.openBlock?.type === "fenced-code-block") {
        const endMarker = fencedCodeBlockMatch.groups.marker.replace(
          /^ {0,3}/,
          ""
        );
        const startMarker = this.openBlock.marker.replace(/^ {0,3}/, "");
        // markerが同じとき終了
        if (
          fencedCodeBlockMatch.groups.info == null &&
          endMarker[0] === startMarker[0] &&
          endMarker.length >= startMarker.length
        ) {
          this.closeBlock();
          return undefined;
        }
      } else {
        this.closeBlock();
        return {
          type: "fenced-code-block",
          marker: fencedCodeBlockMatch.groups.marker,
          text: "",
          info: fencedCodeBlockMatch.groups.info,
        };
      }
    }

    // Paragraphs
    if (this.openBlock?.type === "paragraph") {
      return {
        type: "paragraph",
        text: [this.openBlock.text, line.trim()].join("\n"),
      };
    }
    if (this.openBlock?.type === "fenced-code-block") {
      const indent = this.openBlock.marker.match(/^(?<indent> {1,3})/);
      const indentLength =
        indent !== null && indent.groups != null
          ? indent.groups.indent.length
          : 0;
      return {
        ...this.openBlock,
        text: [
          this.openBlock.text,
          line.replace(new RegExp(`^ {0,${indentLength}}`), ""),
        ].join("\n"),
      };
    }
    this.closeBlock();
    return {
      type: "paragraph",
      text: line.trim(),
    };
  }

  private closeBlock() {
    if (this.openBlock) {
      if (this.openBlock.type === "indented-code-block") {
        const newText = this.openBlock.text
          .split("\n")
          .filter((v, i, array) => {
            if ((i === 0 || i === array.length - 1) && v.trim().length < 1) {
              return false;
            }
            return true;
          })
          .join("\n");
        this.blocks = this.blocks.concat({
          ...this.openBlock,
          text: newText,
        });
      } else if (this.openBlock.type === "fenced-code-block") {
        const newText = this.openBlock.text
          .split("\n")
          .filter((v, i) => {
            return i !== 0;
          })
          .join("\n");
        this.blocks = this.blocks.concat({
          ...this.openBlock,
          text: newText,
        });
      } else {
        this.blocks = this.blocks.concat(this.openBlock);
      }
      this.openBlock = undefined;
    }
  }
}

export default Parser;
