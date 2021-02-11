import { Block } from "./types";

const FENCED_CODE_BLOCK_REGEX = /^(?<marker> {0,3}(?:`{3,}|~{3,})) {0,}(?<info>.+)?$/;

interface State {
  ast: Block[];
  openBlock: Block | undefined;
}

class Parser {
  private blocks: Block[] = [];
  private openBlock: Block | undefined;
  public parse(markdown: string): Block[] {
    const lines = markdown.split(/[\r\n]/);
    for (const line of lines) {
      const state = this.parseLine(line, {
        ast: this.blocks,
        openBlock: this.openBlock,
      });
      this.blocks = state.ast;
      this.openBlock = state.openBlock;
    }
    const result = this.close({
      ast: this.blocks,
      openBlock: this.openBlock,
    });
    return result.ast;
  }

  private parseLine(line: string, state: State): State {
    if (line.trim().length === 0) {
      if (state.openBlock?.type === "indented-code-block") {
        return {
          ...state,
          openBlock: {
            ...state.openBlock,
            text: [state.openBlock.text, line.replace(/^ {0,4}/, "")].join(
              "\n"
            ),
          },
        };
      }
      if (state.openBlock?.type === "fenced-code-block") {
        return {
          ...state,
          openBlock: {
            ...state.openBlock,
            text: [state.openBlock.text, line].join("\n"),
          },
        };
      }
      return this.close(state);
    }

    // Setext headings
    const setextHeadingMatch = line.match(/^ {0,3}(?<level>-{1,}|={1,}) {0,}$/);
    if (
      setextHeadingMatch?.groups != null &&
      this.openBlock?.type === "paragraph"
    ) {
      return {
        ...state,
        openBlock: {
          type: "heading",
          level: setextHeadingMatch.groups.level[0] === "-" ? 2 : 1,
          text: this.openBlock.text,
        },
      };
    }

    // Thematic breaks
    if (line.match(/^ {0,3}([-_*] {0,}){3,}$/)) {
      return {
        ...this.close(state),
        openBlock: {
          type: "thematic-break",
        },
      };
    }

    // ATX headings
    const atxHeadingsMatch = line.match(/^ {0,3}(?<atx>#{1,6})(?<text> .*|$)/);
    if (atxHeadingsMatch?.groups != null) {
      if (state.openBlock != null) {
        return {
          ...this.close(state),
          openBlock: {
            type: "heading",
            level: atxHeadingsMatch.groups.atx.length as 1 | 2 | 3 | 4 | 5 | 6,
            text: atxHeadingsMatch.groups.text
              .replace(/ #{1,} {0,}$/, "")
              .trim(),
          },
        };
      }
      return {
        ...state,
        openBlock: {
          type: "heading",
          level: atxHeadingsMatch.groups.atx.length as 1 | 2 | 3 | 4 | 5 | 6,
          text: atxHeadingsMatch.groups.text.replace(/ #{1,} {0,}$/, "").trim(),
        },
      };
    }

    // Indented code blocks
    if (
      line.match(/^ {4,}.+/) &&
      state.openBlock?.type !== "paragraph" &&
      state.openBlock?.type !== "fenced-code-block"
    ) {
      const text = line.replace(/^ {0,4}/, "");
      if (state.openBlock?.type === "indented-code-block") {
        return {
          ...state,
          openBlock: {
            type: "indented-code-block",
            text: [state.openBlock.text, text].join("\n"),
          },
        };
      }
      return {
        ...this.close(state),
        openBlock: {
          type: "indented-code-block",
          text: text,
        },
      };
    }

    const fencedCodeBlockMatch = line.match(FENCED_CODE_BLOCK_REGEX);
    if (fencedCodeBlockMatch && fencedCodeBlockMatch.groups) {
      // fenced code block終了
      if (state.openBlock?.type === "fenced-code-block") {
        const endMarker = fencedCodeBlockMatch.groups.marker.replace(
          /^ {0,3}/,
          ""
        );
        const startMarker = state.openBlock.marker.replace(/^ {0,3}/, "");
        // markerが同じとき終了
        if (
          fencedCodeBlockMatch.groups.info == null &&
          endMarker[0] === startMarker[0] &&
          endMarker.length >= startMarker.length
        ) {
          return this.close(state);
        }
      } else {
        return {
          ...this.close(state),
          openBlock: {
            type: "fenced-code-block",
            marker: fencedCodeBlockMatch.groups.marker,
            text: "",
            info: fencedCodeBlockMatch.groups.info,
          },
        };
      }
    }

    // Paragraphs
    if (state.openBlock?.type === "paragraph") {
      return {
        ...state,
        openBlock: {
          type: "paragraph",
          text: [state.openBlock.text, line.trim()].join("\n"),
        },
      };
    }
    if (state.openBlock?.type === "fenced-code-block") {
      const indent = state.openBlock.marker.match(/^(?<indent> {1,3})/);
      const indentLength =
        indent !== null && indent.groups != null
          ? indent.groups.indent.length
          : 0;
      return {
        ...state,
        openBlock: {
          ...state.openBlock,
          text: [
            state.openBlock.text,
            line.replace(new RegExp(`^ {0,${indentLength}}`), ""),
          ].join("\n"),
        },
      };
    }
    return {
      ...this.close(state),
      openBlock: {
        type: "paragraph",
        text: line.trim(),
      },
    };
  }

  private close(state: State): State {
    if (state.openBlock == null) {
      return state;
    }
    if (state.openBlock.type === "indented-code-block") {
      const newText = state.openBlock.text
        .split("\n")
        .filter((v, i, array) => {
          if ((i === 0 || i === array.length - 1) && v.trim().length < 1) {
            return false;
          }
          return true;
        })
        .join("\n");
      return {
        ast: state.ast.concat({
          ...state.openBlock,
          text: newText,
        }),
        openBlock: undefined,
      };
    }
    if (state.openBlock.type === "fenced-code-block") {
      const newText = state.openBlock.text
        .split("\n")
        .filter((v, i) => {
          return i !== 0;
        })
        .join("\n");
      return {
        ast: state.ast.concat({
          ...state.openBlock,
          text: newText,
        }),
        openBlock: undefined,
      };
    }
    return {
      ast: state.ast.concat(state.openBlock),
      openBlock: undefined,
    };
  }
}

export default Parser;
