export type Block = LeafBlock | ContainerBlock;

type ContainerBlock = BlockQuote;

interface BlockQuote {
  type: "block-quote";
  children: Block[];
}

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

interface FencedCodeBlock {
  type: "fenced-code-block";
  text: string;
  marker: string;
  info?: string;
}
