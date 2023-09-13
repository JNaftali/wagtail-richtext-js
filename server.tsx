import * as Server from "react-dom/server";
import { RichText } from "./src";
import testCases from "./test-cases.json";

Bun.serve({
  fetch() {
    const body = Server.renderToStaticMarkup(
      <html>
        <head>
          <title>sup</title>
        </head>
        <body>
          {testCases.map(({ content_state }, i) => (
            <section key={i}>
              <hr />
              <h5>Test case {i + 1}</h5>
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
