export type Block = LeafBlock | ContainerBlock;

export type ContainerBlock = BlockQuote | OrderedList | ListItem | BulletList;

interface BlockQuote {
  type: "block-quote";
  children: Block[];
}

interface OrderedList {
  type: "ordered-list";
  start: number;
  delimiter: "period";
  children: Block[];
}

interface BulletList {
  type: "bullet-list";
  children: Block[];
}

export interface ListItem {
  type: "list-item";
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
