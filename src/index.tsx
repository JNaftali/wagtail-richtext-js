type ContentStateBlock = {
  key: string;
  text: string;
  type: string;
  depth: number;
  inlineStyleRanges: [];
  entityRanges: [];
};

type ContentState = {
  entityMap: {};
  blocks: Array<ContentStateBlock>;
};

export function RichText({
  config = defaultConfig,
  json,
}: {
  config?: RTConfig;
  json: ContentState;
}) {
  return json.blocks.map((block) => {
    const BlockComponent =
      config.blockComponents[block.type] ?? config.defaultBlockComponent;
    return <BlockComponent {...block}>{block.text}</BlockComponent>;
  });
}

type BlockComponent = (
  props: React.PropsWithChildren<ContentStateBlock>
) => React.ReactNode;
type InlineComponent = (props: React.PropsWithChildren) => React.ReactNode;

export type RTConfig = {
  blockComponents: { [type: string]: BlockComponent };
  defaultBlockComponent: BlockComponent;
  inlineStyleComponents: { [type: string]: InlineComponent };
  defaultInlineStyleComponent: InlineComponent;
};

export const defaultConfig = {
  blockComponents: {
    unstyled: ({ children }) => <p>{children}</p>,
  },
  defaultBlockComponent: ({ children }) => <p>{children}</p>,
  inlineStyleComponents: {
    BOLD: ({ children }) => <strong>{children}</strong>,
  },
  defaultInlineStyleComponent: ({ children }) => <>{children}</>,
} satisfies RTConfig;
