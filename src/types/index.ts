export interface Block {
  type: "paragraph";
  raw: string;
  text: string;
  tokens: Token[];
}

interface Token {
  type: "text",
  raw: string;
  text: string;
}