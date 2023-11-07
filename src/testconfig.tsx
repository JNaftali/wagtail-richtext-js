import { RTConfig } from ".";

export const testConfig: Partial<RTConfig> = {
	blockComponents: {
		"unordered-list-item": {
			element: "li",
			wrapper: ({ children }) => <ul className="bullet-list">{children}</ul>,
		},
		"code-block": ({ children }) => (
			<pre>
				<code>{children}</code>
			</pre>
		),
	},
	inlineStyleComponents: {
		KBD: "kbd",
	},
	decorators: [
		{
			strategy: "\n",
			Component: (props) => {
				if (props.block.type === "code-block") {
					return props.children;
				} else {
					return <br />;
				}
			},
		},
		{
			strategy: /#\w+/,
			Component: (props) => {
				if (props.block.type === "code-block") {
					return props.children;
				} else {
					return <span className="hashtag">{props.children}</span>;
				}
			},
		},
		{
			strategy:
				/(http:\/\/|https:\/\/|www\.)([a-zA-Z0-9\.\-%/\?&_=\+#:~!,\'\*\^$]+)/,
			Component: (props) => {
				const match = props.match;
				const protocol = match[1];
				const url = match[2];
				const href = protocol + url;
				if (props.block.type === "code-block") {
					return href;
				} else {
					return (
						<a href={href.startsWith("www") ? `http://${href}` : href}>
							{href}
						</a>
					);
				}
			},
		},
	],
};
