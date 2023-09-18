import { expect, test } from "bun:test";
import testCases from "../test-cases.json";

import * as Server from "react-dom/server";
import { RichText } from ".";

const ignore = [
	"Nested inline styles (inverted)", // nested in the opposite order
	"Big content export",
	"Multiple decorators",
	"HTML entities escaping",
	"From https://github.com/icelab/draft-js-ast-exporter/blob/651c807bea12d97dad6f4965ab40481c8f2130dd/test/fixtures/content.js",
	"Entity with inline style",
	"Entity with data-*",
	"Entity",
	"Adjacent entities",
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
						},
					}}
				/>,
			),
		).toBe(c.output.html5lib);
	};
	if (ignore.includes(c.label.trim())) test.todo(c.label, f);
	else test(c.label, f);
}
