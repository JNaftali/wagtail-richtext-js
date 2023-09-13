import * as React from "react";

type InlineStyleRange = {
  offset: number;
  length: number;
  style: string;
};

type ContentStateBlock = {
  key: string;
  text: string;
  type: string;
  depth: number;
  inlineStyleRanges: Array<InlineStyleRange>;
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
    let text = block.text;
    const children: Array<React.ReactNode> = [];
    let [activeRange, ...ranges] = block.inlineStyleRanges;
    while (activeRange) {
      // push unstyled text preceding current offset
      children.push(
        <React.Fragment key={text}>
          {text.slice(0, activeRange.offset)}
        </React.Fragment>
      );
      text = text.slice(activeRange.offset);
      const InlineStyleComponent =
        config.inlineStyleComponents[activeRange.style] ??
        config.defaultInlineStyleComponent;
      children.push(
        <InlineStyleComponent key={text}>
          {text.slice(0, activeRange.length)}
        </InlineStyleComponent>
      );
      text = text.slice(activeRange.length);
      [activeRange, ...ranges] = ranges;
    }
    children.push(<React.Fragment key={text}>{text}</React.Fragment>);

    return <BlockComponent {...block}>{children}</BlockComponent>;
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
