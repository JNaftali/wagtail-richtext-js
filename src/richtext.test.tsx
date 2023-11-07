import { expect, test } from "bun:test";
import testCases from "../test-cases.json";

import * as Server from "react-dom/server";
import { RichText } from ".";
import { testConfig } from "./testconfig";

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
				<RichText json={c.content_state as any} extendConfig={testConfig} />,
			),
		).toBe(c.output.html5lib);
	};
	if (ignore.includes(c.label.trim())) test.todo(c.label, f);
	else test(c.label, f);
}
