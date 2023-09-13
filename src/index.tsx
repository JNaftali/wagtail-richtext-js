import * as React from "react";
import type {
  RawDraftContentState,
  RawDraftContentBlock,
  RawDraftInlineStyleRange,
} from "draft-js";

export function RichText({
  config = defaultConfig,
  json,
}: {
  config?: RTConfig;
  json: RawDraftContentState;
}) {
  return json.blocks.map((block) => {
    const children = renderStyledText(block.text, 0, block.inlineStyleRanges);
    const BlockComponent =
      config.blockComponents[block.type] ?? config.defaultBlockComponent;
    if (typeof BlockComponent === "string")
      return <BlockComponent key={block.key}>{children}</BlockComponent>;

    return (
      <BlockComponent key={block.key} block={block}>
        {children}
      </BlockComponent>
    );
  });

  function renderStyledText(
    text: string,
    offset: number,
    [activeRange, ...ranges]: RawDraftInlineStyleRange[]
  ) {
    const result: Array<React.ReactNode> = [];
    while (text.length && activeRange) {
      // If there is unstyled text before the range starts, chop it off
      if (offset < activeRange.offset) {
        const takeUntil = activeRange.offset - offset;
        const t = text.slice(0, takeUntil);
        result.push(<React.Fragment key={t + text.length}>{t}</React.Fragment>);
        text = text.slice(takeUntil);
        offset = activeRange.offset;
      }

      // render the text in the range and any additional styles that should be wrapped around it
      const styledText = renderStyledText(
        text.slice(0, activeRange.length),
        offset,
        ranges
      );
      const InlineComponent =
        config.inlineStyleComponents[activeRange.style] ??
        config.defaultInlineStyleComponent;
      result.push(
        <InlineComponent key={text.length}>{styledText}</InlineComponent>
      );
      offset += activeRange.length;
      text = text.slice(activeRange.length);
      [activeRange, ...ranges] = ranges;
    }
    if (text) result.push(<React.Fragment key={text}>{text}</React.Fragment>);
    return result;
  }
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
