export type DocHeading = {
  depth: number;
  text: string;
  slug: string;
  path: string[];
};

export type DocSection = {
  heading: DocHeading | null;
  content: string;
};
