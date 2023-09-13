import * as Server from "react-dom/server";
import { RichText } from "./src";
import testCases from "./test-cases.json";

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

			const body = Server.renderToStaticMarkup(
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

		const body = Server.renderToStaticMarkup(
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
							{/* TODO: remove as any when types are complete */}
							<RichText json={content_state as any} />
						</section>
					))}
				</body>
			</html>,
		);
		return new Response(body, {
			headers: [
				["Content-Type", "text/html"],
				["Content-Length", body.length.toString()],
			],
		});
	},
	development: true,
});
