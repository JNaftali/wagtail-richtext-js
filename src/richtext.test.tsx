import { expect, test } from "bun:test";
import testCases from "../test-cases.json";

import * as Server from "react-dom/server";
import { RichText } from ".";

const ignore = [
	"Nested inline styles (inverted)", // nested in the opposite order
	/**
	 * Problems not yet diagnosed in Big content export:
	 * 1. block 32lnv has an overlapping entityRange and inlineStyleRange that are rendered as consecutive
	 * 2. missing youtube embed
	 * 3. html entity substitution (we're rendering `'`, string contains `&#x27;`). Maybe just update test case strings?
	 */
	// "Big content export",
	"Multiple decorators", // decorators are entities that are auto-creaated on pattern matching - not sure I wanna do those
	"Entity with data-*", // 1. react sorts attributes differently 2. data-False is not a valid attribute name in React
];

for (let c of testCases) {
	const f = () => {
		expect(
			Server.renderToStaticMarkup(
				<RichText
					json={c.content_state as any}
					extendConfig={{
						blockComponents: {
							"unordered-list-item": {
								element: "li",
								wrapper: ({ children }) => (
									<ul className="bullet-list">{children}</ul>
								),
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
											<a
												href={href.startsWith("www") ? `http://${href}` : href}
											>
												{href}
											</a>
										);
									}
								},
							},
						],
					}}
				/>,
			),
		).toBe(c.output.html5lib);
	};
	if (ignore.includes(c.label.trim())) test.todo(c.label, f);
	else test(c.label, f);
}
