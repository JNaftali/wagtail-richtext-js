import * as Server from "react-dom/server";
import { RichText } from "./src";
import testCases from "./test-cases.json";

/**
 * Known issues I might decide not to address:
 * 1. test case 3 + 4 (Nested inline styles and Nested inline styles (inverted)) are supposed to render the same thing. Instead, one has a `strong` wrapped by `em` and the other has `em` wrapped by `strong`
 */

Bun.serve({
  fetch() {
    const body = Server.renderToStaticMarkup(
      <html>
        <head>
          <title>sup</title>
        </head>
        <body>
          {testCases.map(({ content_state, label }, i) => (
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
      </html>
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
