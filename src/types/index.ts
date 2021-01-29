export type Block = LeafBlock;

type LeafBlock = Paragraph | ThematicBreak;

interface Paragraph {
  type: "paragraph";
  text: string;
}

interface ThematicBreak {
  type: "thematic-break";
}
