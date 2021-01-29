export type Block = LeafBlock;

type LeafBlock = Paragraph | ThematicBreak | Heading;

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
