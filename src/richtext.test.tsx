import { expect, test } from "bun:test";
import testCases from "../test-cases.json";

import * as Server from "react-dom/server";
import { RichText } from ".";

const ignore = [
	"Nested inline styles (inverted)", // nested in the opposite order
	"Big content export",
	"Multiple decorators",
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
						},
					}}
				/>,
			),
		).toBe(c.output.html5lib);
	};
	if (ignore.includes(c.label.trim())) test.todo(c.label, f);
	else test(c.label, f);
}
