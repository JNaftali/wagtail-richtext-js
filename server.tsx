import * as Server from "react-dom/server";
import { RTConfig, RichText } from "./src";
import testCases from "./test-cases.json";
import { testConfig } from "./src/testconfig";
import { RawDraftContentState } from "draft-js";

/**
 * Known issues I might decide not to address:
 * 1. test case 3 + 4 (Nested inline styles and Nested inline styles (inverted)) are supposed to render the same thing. Instead, one has a `strong` wrapped by `em` and the other has `em` wrapped by `strong`
 */
let testsToRun = testCases;
// testsToRun = testsToRun.slice(6, 7);

Bun.serve({
	fetch(req) {
		const url = new URL(req.url);
		const resultToShow = url.pathname.match(/^\/test-results\/(\d+)\/?$/i);
		if (resultToShow) {
			const testCase = testCases[parseInt(resultToShow[1]) - 1];

			const body =
				"<!DOCTYPE html>" +
				Server.renderToStaticMarkup(
					<html lang="en">
						<head>
							<title>{testCase.label}</title>
						</head>
						<body
							dangerouslySetInnerHTML={{ __html: testCase.output.html5lib }}
						/>
					</html>,
				);
			return new Response(body, {
				headers: [["Content-Type", "text/html"]],
			});
		}

		const body =
			"<!DOCTYPE html>" +
			Server.renderToStaticMarkup(
				<html>
					<head>
						<title>sup</title>
					</head>
					<body>
						{testsToRun.map(({ content_state, label }, i) => (
							<section key={i}>
								<hr />
								<h5>
									Test case {i + 1}: {label}
								</h5>
								<RichText
									json={content_state as any}
									extendConfig={testConfig}
								/>
							</section>
						))}
					</body>
				</html>,
			);
		return new Response(body, {
			headers: [
				["Content-Type", "text/html; charset=utf-8"],
				["Content-Length", body.length.toString()],
			],
		});
	},
	development: true,
});
