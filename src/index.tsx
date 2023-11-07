import * as React from "react";
import type {
	RawDraftContentState,
	RawDraftContentBlock,
	RawDraftInlineStyleRange,
	RawDraftEntity,
	RawDraftEntityRange,
} from "draft-js";
import { isObject, takeUntil } from "./utils";
import mergeDeep from "lodash/fp/merge";

interface ConfiguredEntityRange extends RawDraftEntityRange {
	data: any;
	component: EntityComponent;
}

interface ConfiguredInlineStyleRange extends RawDraftInlineStyleRange {
	component: InlineComponent;
}

function RenderBlockComponent({
	block,
	config,
	children,
	entityMap,
	decorators,
}: React.PropsWithChildren<{
	block: RawDraftContentBlock;
	config: RTConfig;
	entityMap: { [key: string]: RawDraftEntity };
	decorators: Array<Decorator>;
}>) {
	const blockConfig =
		config.blockComponents[block.type] ?? config.defaultBlockComponent;
	const Component =
		isObject(blockConfig) && "element" in blockConfig
			? blockConfig.element
			: blockConfig;

	const configuredEntityRanges = block.entityRanges
		.map((range) => {
			const { data, type } = entityMap[range.key];
			return {
				...range,
				data,
				component: config.entityComponents[type],
			};
		})
		.filter((x) => !!x.component);
	const configuredInlineStyleRanges = block.inlineStyleRanges.map((range) => ({
		...range,
		component:
			config.inlineStyleComponents[range.style] ??
			config.defaultInlineStyleComponent,
	}));

	const contents = renderStyledText(
		block.text,
		0,
		[...configuredInlineStyleRanges, ...configuredEntityRanges],
		block,
		decorators,
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

function DecoratedText({
	text,
	block,
	decorators,
}: {
	text: string;
	block: RawDraftContentBlock;
	decorators: Array<Decorator>;
}) {
	const occupied: number[] = [];
	const decorations: Array<Decoration> = [];
	for (let decorator of decorators) {
		const regexp = RegExp(decorator.strategy, "g");
		for (let match of text.matchAll(regexp)) {
			const begin = match.index ?? 0;
			const end = begin + match[0].length;
			if (
				!occupied.some((i) => (match?.index ?? 0) <= i && i < regexp.lastIndex)
			) {
				for (let i = match.index ?? 0; i < regexp.lastIndex; i++) {
					occupied.push(i);
				}
				decorations.push({ begin, end, match, decorator });
			}
		}
	}

	const result = [];
	let pointer = 0;
	for (let { begin, end, match, decorator } of decorations) {
		if (pointer < begin) {
			result.push(text.slice(pointer, begin));
		}

		result.push(
			<decorator.Component match={match} block={block}>
				{match[0]}
			</decorator.Component>,
		);
		pointer = end;
	}
	if (pointer < text.length) {
		result.push(text.slice(pointer));
	}
	return result;
}

function renderStyledText(
	text: string,
	offset: number,
	ranges: Array<ConfiguredInlineStyleRange | ConfiguredEntityRange>,
	block: RawDraftContentBlock,
	decorators: Array<Decorator>,
) {
	ranges = ranges.toSorted((a, b) => {
		if (a.offset !== b.offset) return a.offset - b.offset;
		if (a.length !== b.length) return b.length - a.length;
		if ("style" in a && !("style" in b)) return 1;
		if ("style" in b && !("style" in a)) return -1;
		return 0;
	});
	let activeRange;
	[activeRange, ...ranges] = ranges;
	const result: Array<React.ReactNode> = [];
	while (text.length && activeRange) {
		// If there is unstyled text before the range starts, chop it off
		if (offset < activeRange.offset) {
			const takeUntil = activeRange.offset - offset;
			const t = text.slice(0, takeUntil);
			result.push(
				<DecoratedText
					key={t + text.length}
					text={t}
					block={block}
					decorators={decorators}
				/>,
			);
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
			block,
			decorators,
		);
		if ("style" in activeRange) {
			const InlineComponent = activeRange.component;
			result.push(
				<InlineComponent key={text.length}>{styledText}</InlineComponent>,
			);
		} else {
			const EntityComponent = activeRange.component;
			result.push(
				<EntityComponent key={activeRange.key} data={activeRange.data}>
					{styledText}
				</EntityComponent>,
			);
		}
		offset += length;
		text = text.slice(length);
		[activeRange, ...ranges] = ranges;
	}
	if (text)
		result.push(
			<DecoratedText
				key={text}
				text={text}
				block={block}
				decorators={decorators}
			/>,
		);
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
				entityMap={json.entityMap}
				decorators={config.decorators}
			/>,
		);
	}
	return result;
}

function BlockGroup({
	blocks,
	config,
	entityMap,
	decorators,
}: {
	blocks: RawDraftContentBlock[];
	config: RTConfig;
	entityMap: { [key: string]: RawDraftEntity };
	decorators: Array<Decorator>;
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
			children = (
				<BlockGroup
					blocks={nestedBlocks}
					config={config}
					entityMap={entityMap}
					decorators={decorators}
				/>
			);
		}
		result.push(
			<RenderBlockComponent
				key={currentBlock.key}
				block={currentBlock}
				config={config}
				entityMap={entityMap}
				decorators={decorators}
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

type EntityComponent = (
	props: React.PropsWithChildren<{ data: any }>,
) => React.ReactNode;

interface Decorator {
	strategy: string | RegExp;
	Component: (
		props: React.PropsWithChildren<{
			match: RegExpMatchArray;
			block: RawDraftContentBlock;
		}>,
	) => React.ReactNode;
}
interface Decoration {
	begin: number;
	end: number;
	match: RegExpMatchArray;
	decorator: Decorator;
}

export type RTConfig = {
	blockComponents: { [type: string]: BlockComponent };
	defaultBlockComponent: BlockComponent;
	inlineStyleComponents: { [type: string]: InlineComponent };
	defaultInlineStyleComponent: InlineComponent;
	entityComponents: {
		[type: string]: EntityComponent;
	};
	decorators: Array<Decorator>;
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
	entityComponents: {
		IMAGE: ({ data }: { data: React.HTMLProps<HTMLImageElement> }) => (
			<img {...data} />
		),
		LINK: ({
			children,
			data: { url, ...rest },
		}: React.PropsWithChildren<{
			data: { url: string };
		}>) => (
			<a href={url} {...rest}>
				{children}
			</a>
		),
		HORIZONTAL_RULE: () => <hr />,
	},
	decorators: [
		{
			strategy: "\n",
			Component: () => <br />,
		},
	],
};
