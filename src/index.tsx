import * as React from "react";
import type {
	RawDraftContentState,
	RawDraftContentBlock,
	RawDraftInlineStyleRange,
} from "draft-js";
import { extend } from "./utils";

export function RichText({
	config: propsConfig,
	extendConfig,
	json,
}: {
	config?: RTConfig;
	extendConfig?: Partial<RTConfig>;
	json: RawDraftContentState;
}) {
	let config: RTConfig;
	if (propsConfig) {
		config = propsConfig;
	} else {
		config = extend(defaultConfig, extendConfig ?? {});
	}

	return groupByType(json.blocks).flatMap((blocksOfType) => {
		const blockConfig =
			config.blockComponents[blocksOfType[0].type] ??
			config.defaultBlockComponent;
		if (typeof blockConfig === "string") {
			const BlockComponent = blockConfig;
			return blocksOfType.map((block) => {
				const children = renderStyledText(
					block.text,
					0,
					block.inlineStyleRanges,
				);
				return <BlockComponent key={block.key}>{children}</BlockComponent>;
			});
		} else if ("wrapper" in blockConfig) {
			const WrapperComponent = blockConfig.wrapper;
			const BlockComponent = blockConfig.element;
			return (
				<WrapperComponent key={blocksOfType[0].key}>
					{blocksOfType.map((block) => {
						const children = renderStyledText(
							block.text,
							0,
							block.inlineStyleRanges,
						);
						if (typeof BlockComponent === "string")
							return (
								<BlockComponent key={block.key}>{children}</BlockComponent>
							);
						else
							return (
								<BlockComponent key={block.key} block={block}>
									{children}
								</BlockComponent>
							);
					})}
				</WrapperComponent>
			);
		} else {
			const BlockComponent = blockConfig;
			return blocksOfType.map((block) => {
				const children = renderStyledText(
					block.text,
					0,
					block.inlineStyleRanges,
				);
				return (
					<BlockComponent key={block.key} block={block}>
						{children}
					</BlockComponent>
				);
			});
		}
	});

	function renderStyledText(
		text: string,
		offset: number,
		[activeRange, ...ranges]: RawDraftInlineStyleRange[],
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
			if (!text) return result;

			// render the text in the range and any additional styles that should be wrapped around it
			const length = activeRange.length ?? 1; // y no length if length is 1, that's not what types say :(
			const styledText = renderStyledText(
				text.slice(0, length),
				offset,
				ranges,
			);
			const InlineComponent =
				config.inlineStyleComponents[activeRange.style] ??
				config.defaultInlineStyleComponent;
			result.push(
				<InlineComponent key={text.length}>{styledText}</InlineComponent>,
			);
			offset += length;
			text = text.slice(length);
			[activeRange, ...ranges] = ranges;
		}
		if (text) result.push(<React.Fragment key={text}>{text}</React.Fragment>);
		return result;
	}
}

type RenderedBlockComponent =
	| keyof JSX.IntrinsicElements
	| ((
			props: React.PropsWithChildren<{ block: RawDraftContentBlock }>,
	  ) => React.ReactNode);

type BlockComponent =
	| {
			element: RenderedBlockComponent;
			wrapper:
				| keyof JSX.IntrinsicElements
				| ((props: React.PropsWithChildren) => React.ReactNode);
	  }
	| RenderedBlockComponent;

type InlineComponent =
	| keyof JSX.IntrinsicElements
	| ((props: React.PropsWithChildren) => React.ReactNode);

export type RTConfig = {
	blockComponents: { [type: string]: BlockComponent };
	defaultBlockComponent: BlockComponent;
	inlineStyleComponents: { [type: string]: InlineComponent };
	defaultInlineStyleComponent: InlineComponent;
};

export const defaultConfig: RTConfig = {
	blockComponents: {
		unstyled: "p",
		header_one: "h1",
		header_two: "h2",
		header_three: "h3",
		header_four: "h4",
		header_five: "h5",
		header_six: "h6",
		"unordered-list-item": {
			element: "li",
			wrapper: "ul",
		},
		"ordered-list-item": {
			element: "li",
			wrapper: ({ children }) => <ol>{children}</ol>, // could just be 'ol', here for
		},
		blockquote: "blockquote",
		pre: "pre",
		code: ({ children }) => (
			<pre>
				<code>{children}</code>
			</pre>
		),
		atomic: ({ children }) => children,
	},
	defaultBlockComponent: "p",
	inlineStyleComponents: {
		BOLD: "strong",
		CODE: "code",
		ITALIC: "em",
		UNDERLINE: "u",
		STRIKETHROUGH: "s",
		SUPERSCRIPT: "sup",
		SUBSCRIPT: "sub",
		MARK: "mark",
		QUOTATION: "q",
		SMALL: "small",
		SAMPLE: "samp",
		INSERT: "ins",
		DELETE: "del",
		KEYBOARD: "kbd",
	},
	defaultInlineStyleComponent: ({ children }) => <>{children}</>,
};

function groupByType<T extends { type: string }>(
	arr: Array<T>,
): Array<Array<T>> {
	arr = [...arr]; // Should I write my code without mutation? I dunno
	const result: Array<Array<T>> = [];
	while (arr.length) {
		// Type is always a string because the array isn't empty
		const type = arr[0].type;
		const group: Array<T> = [];
		while (type === arr[0]?.type) {
			// because type is always a string, if we're here the first element in the array
			// can't be undefined so the ! is ok
			group.push(arr.shift()!);
		}
		result.push(group);
	}
	return result;
}
