import * as React from "react";
import type { RawDraftContentState, RawDraftContentBlock } from "draft-js";

export function RichText({
  config = defaultConfig,
  json,
}: {
  config?: RTConfig;
  json: RawDraftContentState;
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

    if (typeof BlockComponent === "string")
      return <BlockComponent key={block.key}>{children}</BlockComponent>;

    return (
      <BlockComponent key={block.key} block={block}>
        {children}
      </BlockComponent>
    );
  });
}

type BlockComponent =
  | keyof JSX.IntrinsicElements
  | ((
      props: React.PropsWithChildren<{ block: RawDraftContentBlock }>
    ) => React.ReactNode);
type InlineComponent =
  | keyof JSX.IntrinsicElements
  | ((props: React.PropsWithChildren) => React.ReactNode);

export type RTConfig = {
  blockComponents: { [type: string]: BlockComponent };
  defaultBlockComponent: BlockComponent;
  inlineStyleComponents: { [type: string]: InlineComponent };
  defaultInlineStyleComponent: InlineComponent;
};

export const defaultConfig = {
  blockComponents: {
    unstyled: "p",
  },
  defaultBlockComponent: "p",
  inlineStyleComponents: {
    BOLD: "strong",
  },
  defaultInlineStyleComponent: ({ children }) => <>{children}</>,
} satisfies RTConfig;
