import { Block, ContainerBlock } from "./types";

const FENCED_CODE_BLOCK_REGEX = /^(?<marker> {0,3}(?:`{3,}|~{3,})) {0,}(?<info>.+)?$/;

interface State {
  ast: Block[];
  openBlock?: Block;
  childrenState?: State;
  /**
   * list-itemのchildrenになるために必要なindent数
   */
  listItemRequiredIndentLength?: number;
}

class Parser {
  private state: State = {
    ast: [],
  };

  public parse(markdown: string): Block[] {
    const lines = markdown.split(/[\r\n]/);
    for (const line of lines) {
      const state = this.parseLine(line, this.state);
      this.state = state;
    }
    const result = this.close(this.state);
    return result.ast;
  }

  private parseLine(
    line: string,
    state: State | undefined = {
      ast: [],
      openBlock: undefined,
    }
  ): State {
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
      if (
        state.openBlock?.type === "bullet-list" &&
        state.childrenState?.childrenState != null
      ) {
        const a = this.close(state.childrenState.childrenState);
        return {
          ...state,
          childrenState: {
            ...state.childrenState,
            childrenState: a,
          },
        };
      }
      return this.close(state);
    }

    // Setext headings
    const setextHeadingMatch = line.match(/^ {0,3}(?<level>-{1,}|={1,}) {0,}$/);
    if (
      setextHeadingMatch?.groups != null &&
      state.openBlock?.type === "paragraph"
    ) {
      return {
        ...state,
        openBlock: {
          type: "heading",
          level: setextHeadingMatch.groups.level[0] === "-" ? 2 : 1,
          text: state.openBlock.text,
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
      state.childrenState?.openBlock?.type !== "paragraph" &&
      state.openBlock?.type !== "fenced-code-block" &&
      !isListItem(line, state.listItemRequiredIndentLength)
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

    // Block quotes
    const blockQuotesMatch = line.match(/^ {0,3}> {0,1}(?<text>.*)$/);
    if (
      blockQuotesMatch?.groups != null &&
      state.openBlock?.type !== "fenced-code-block"
    ) {
      if (state.openBlock?.type !== "block-quote") {
        const childrenState = this.parseLine(blockQuotesMatch.groups.text, {
          ast: [],
        });
        return {
          ...this.close(state),
          openBlock: {
            type: "block-quote",
            children: childrenState.ast,
          },
          childrenState: childrenState,
        };
      }
      const childrenState = this.parseLine(
        blockQuotesMatch.groups.text,
        state.childrenState
      );
      return {
        ...state,
        openBlock: {
          ...state.openBlock,
          children: childrenState.ast,
        },
        childrenState: childrenState,
      };
    }

    // Ordered lists
    const orderdListMatch = line.match(
      /^(?<start>[0-9]{1,9})(?<delimiter>[.]) (?<text>.+)$/
    );
    if (orderdListMatch?.groups != null) {
      if (
        state.openBlock?.type === "ordered-list" &&
        state.childrenState != null
      ) {
        const closedChildrenState = this.close(state.childrenState);
        return {
          ...state,
          childrenState: {
            ...closedChildrenState,
            openBlock: {
              type: "list-item",
              children: [],
            },
            childrenState: this.parseLine(orderdListMatch.groups.text),
          },
        };
      }
      return {
        ...this.close(state),
        openBlock: {
          type: "ordered-list",
          delimiter: "period",
          start: Number(orderdListMatch.groups.start),
          children: [],
        },
        childrenState: {
          ast: [],
          openBlock: {
            type: "list-item",
            children: [],
          },
          childrenState: this.parseLine(orderdListMatch.groups.text),
        },
      };
    }

    // BulletList
    const bulletListMatch = line.match(
      /^(?<beforeSpace> {0,3})(?<marker>[-+*])(?<afterSpace> )(?<text>(?<space> {0,})?.+)$/
    );
    if (bulletListMatch?.groups != null) {
      const text = bulletListMatch.groups.text;
      const requiredIndentLength =
        (bulletListMatch.groups.beforeSpace?.length ?? 0) +
        bulletListMatch.groups.marker.length +
        bulletListMatch.groups.afterSpace.length +
        (bulletListMatch.groups.space?.length ?? 0);
      if (
        state.openBlock?.type === "bullet-list" &&
        state.childrenState != null
      ) {
        // 子itemを追加
        if (
          state.listItemRequiredIndentLength != null &&
          isListSubItem(line, state.listItemRequiredIndentLength)
        ) {
          return {
            ...state,
            childrenState: {
              ...state.childrenState,
              childrenState: this.parseLine(
                line.replace(
                  new RegExp(`^ {${state.listItemRequiredIndentLength}}`),
                  ""
                ),
                state.childrenState.childrenState
              ),
            },
          };
        }
        // 新しくlist itemを追加
        return {
          ...state,
          childrenState: {
            ...this.close(state.childrenState),
            openBlock: {
              type: "list-item",
              children: [],
            },
            childrenState: this.parseLine(text),
          },
        };
      }
      return {
        ...this.close(state),
        openBlock: {
          type: "bullet-list",
          children: [],
        },
        childrenState: {
          ast: [],
          openBlock: {
            type: "list-item",
            children: [],
          },
          childrenState: this.parseLine(text),
        },
        listItemRequiredIndentLength: requiredIndentLength,
      };
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
    if (state.openBlock?.type === "block-quote" && this.isLaziness(state)) {
      const childrenState = this.parseLine(line, state.childrenState);
      return {
        ...state,
        openBlock: {
          ...state.openBlock,
          children: childrenState.ast,
        },
        childrenState: childrenState,
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
    /**
     * list markerの後ろのwhite spaceの数+1のインデントがあれば
     * open状態のlist itemのchildrenに追加できる
     *
     * - white spaceの数を記録しておく必要がある
     */
    const indentRegex = new RegExp(
      `^ {${state.listItemRequiredIndentLength},}`
    );
    if (
      state.openBlock?.type === "bullet-list" &&
      state.listItemRequiredIndentLength != null &&
      state.childrenState?.childrenState != null &&
      line.match(indentRegex)
    ) {
      return {
        ...state,
        childrenState: {
          ...state.childrenState,
          childrenState: this.parseLine(
            line.replace(
              new RegExp(`^ {${state.listItemRequiredIndentLength}}`),
              ""
            ),
            state.childrenState.childrenState
          ),
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

  private isLaziness(state: State): boolean {
    if (state.childrenState == null) {
      return state.openBlock?.type === "paragraph";
    }
    return this.isLaziness(state.childrenState);
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
        childrenState: undefined,
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
        childrenState: undefined,
      };
    }
    if (state.childrenState != null && isContainer(state.openBlock)) {
      const closedChildren = this.close(state.childrenState);
      return {
        ast: state.ast.concat({
          ...state.openBlock,
          children: closedChildren.ast,
        }),
        openBlock: undefined,
        childrenState: undefined,
      };
    }
    return {
      ast: state.ast.concat(state.openBlock),
      openBlock: undefined,
      childrenState: undefined,
    };
  }
}

function isContainer(block: Block): block is ContainerBlock {
  return (
    block.type === "block-quote" ||
    block.type === "ordered-list" ||
    block.type === "list-item" ||
    block.type === "bullet-list"
  );
}

/**
 * openBlockがListのとき、必要数インデントがある場合はリストアイテムになる
 * @param line
 * @param requiredIndent 必要インデント数
 */
function isListItem(line: string, requiredIndent?: number): boolean {
  if (requiredIndent == null) {
    return false;
  }
  const match = line.match(new RegExp(`^ {${requiredIndent},}`));
  return match != null;
}

function isListSubItem(line: string, requiredIndent: number) {
  const match = line.match(/^(?<spaces> {0,})- /);
  if (match == null || match.groups == null) {
    return false;
  }
  return match.groups.spaces.length >= requiredIndent;
}

export default Parser;
