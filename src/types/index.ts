export type Block = LeafBlock;

type LeafBlock = Paragraph;

interface Paragraph {
  type: "paragraph";
  text: string;
}
