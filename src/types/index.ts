export type Block = LeafBlock;

type LeafBlock =
  | Paragraph
  | ThematicBreak
  | Heading
  | IndentedCodeBlock
  | FencedCodeBlock;

interface Paragraph {
  type: "paragraph";
  text: string;
}

interface ThematicBreak {
  type: "thematic-break";
}

interface Heading {
  type: "heading";
  text: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

interface IndentedCodeBlock {
  type: "indented-code-block";
  text: string;
}

export interface FencedCodeBlock extends BlockBase {
  type: "fenced-code-block";
  text: string;
  info?: string;
}

interface BlockBase {
  raw: string;
}
