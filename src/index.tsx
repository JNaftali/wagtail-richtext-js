import * as React from "react";
import type {
	RawDraftContentState,
	RawDraftContentBlock,
	RawDraftInlineStyleRange,
} from "draft-js";
import { isObject, mergeDeep, takeUntil } from "./utils";

function RenderBlockComponent({
	block,
	config,
	children,
}: React.PropsWithChildren<{
	block: RawDraftContentBlock;
	config: RTConfig;
}>) {
	const blockConfig =
		config.blockComponents[block.type] ?? config.defaultBlockComponent;
	const Component =
		isObject(blockConfig) && "element" in blockConfig
			? blockConfig.element
			: blockConfig;
	const contents = renderStyledText(
		defaultConfig,
		block.text,
		0,
		block.inlineStyleRanges,
	);
	if (typeof Component === "string") {
		return (
			<Component>
				{contents}
				{children}
			</Component>
		);
	} else {
		return (
			<Component block={block}>
				{contents}
				{children}
			</Component>
		);
	}
}

function renderStyledText(
	config = defaultConfig,
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
			config,
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
		config = mergeDeep(defaultConfig, extendConfig ?? {});
	}

	const blocks = [...json.blocks];
	const result: React.ReactNode[] = [];
	while (blocks.length) {
		const matchingBlock = blocks[0];
		// grab all blocks like this or anything nested under blocks like this
		const blocksOfType = takeUntil(
			(x) => x.type !== matchingBlock.type || x.depth < matchingBlock.depth,
			blocks,
		);
		result.push(
			<BlockGroup
				//Other react elements will use this key but not in this array
				key={matchingBlock.key}
				blocks={blocksOfType}
				config={config}
			/>,
		);
	}
	return result;
}

function BlockGroup({
	blocks,
	config,
}: {
	blocks: RawDraftContentBlock[];
	config: RTConfig;
}) {
	blocks = [...blocks];
	const groupDepth = blocks[0].depth;
	const groupConfig =
		config.blockComponents[blocks[0].type] ?? config.defaultBlockComponent;
	const GroupWrapper =
		isObject(groupConfig) && "wrapper" in groupConfig
			? groupConfig.wrapper
			: React.Fragment;
	const result: React.ReactNode[] = [];
	while (blocks.length) {
		const currentBlock = blocks.shift();
		if (!currentBlock) throw new Error("this should be impossible :)");
		let children: React.ReactNode = null;
		if (blocks[0]?.depth > currentBlock.depth) {
			const nestedBlocks = takeUntil(
				(x) => x.depth <= currentBlock.depth,
				blocks,
			);
			children = <BlockGroup blocks={nestedBlocks} config={config} />;
		}
		result.push(
			<RenderBlockComponent
				key={currentBlock.key}
				block={currentBlock}
				config={config}
			>
				{children}
			</RenderBlockComponent>,
		);
	}
	if (typeof GroupWrapper === "string" || GroupWrapper === React.Fragment)
		// @ts-expect-error
		return <GroupWrapper>{result}</GroupWrapper>;
	else return <GroupWrapper depth={groupDepth}>{result}</GroupWrapper>;
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
				| ((
						props: React.PropsWithChildren<{ depth: number }>,
				  ) => React.ReactNode);
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
		"header-one": "h1",
		"header-two": "h2",
		"header-three": "h3",
		"header-four": "h4",
		"header-five": "h5",
		"header-six": "h6",
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
