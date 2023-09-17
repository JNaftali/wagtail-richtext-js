import * as React from "react";
import type {
	RawDraftContentState,
	RawDraftContentBlock,
	RawDraftInlineStyleRange,
} from "draft-js";
import { isObject, mergeDeep, takeUntil } from "./utils";

function RenderBlockComponent({
	block,
	config: blockConfig,
	children,
}: React.PropsWithChildren<{
	block: RawDraftContentBlock;
	config: BlockComponent;
}>) {
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

function NestedBlocks({
	group = [] as RawDraftContentBlock[],
	config = defaultConfig,
}) {
	group = [...group];
	const { type, depth: rootDepth } = group[0];
	const rootConfig =
		config.blockComponents[type] ?? config.defaultBlockComponent;
	const WrapperComponent =
		isObject(rootConfig) && "wrapper" in rootConfig
			? rootConfig.wrapper
			: React.Fragment;
	let children = [] as React.ReactNode[];

	while (group.length) {
		const subgroup = takeUntil((x) => x.depth > rootDepth, group);
		let nestingParent: RawDraftContentBlock | undefined = undefined;
		if (group.length) {
			// If there are elements with greater depth, they're nested under the last element of the subgroup
			nestingParent = subgroup.pop();
		}
		children = children.concat(
			subgroup.map((block) => (
				<RenderBlockComponent
					key={block.key}
					block={block}
					config={rootConfig}
				/>
			)),
		);

		if (nestingParent) {
			// nest everything until we get back to the rootDepth
			const subgroup = takeUntil((x) => x.depth === rootDepth, group);

			children.push(
				<RenderBlockComponent
					key={nestingParent.key}
					block={nestingParent}
					config={rootConfig}
				>
					<NestedBlocks group={subgroup} config={config} />
				</RenderBlockComponent>,
			);
		}
	}

	if (typeof WrapperComponent === "string") {
		return <WrapperComponent>{children}</WrapperComponent>;
	} else {
		return <WrapperComponent depth={rootDepth}>{children}</WrapperComponent>;
	}
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

	return groupBlocks(json.blocks).flatMap((blocksOfType) => {
		if (blocksOfType.some((x) => x.depth > 0))
			return <NestedBlocks group={blocksOfType} />;

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
				<WrapperComponent depth={0} key={blocksOfType[0].key}>
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

function groupBlocks<T extends { type: string; depth: number }>(
	arr: Array<T>,
): Array<Array<T>> {
	arr = [...arr]; // Should I write my code without mutation? I dunno
	const result: Array<Array<T>> = [];
	while (arr.length) {
		// Type is always a string because the array isn't empty
		const type = arr[0].type;
		result.push(takeUntil((x) => x.type !== type && x.depth === 0, arr));
	}
	return result;
}
