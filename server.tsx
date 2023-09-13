import * as Server from "react-dom/server";
import { RichText } from "./src";

Bun.serve({
  fetch() {
    return new Response(
      Server.renderToStaticMarkup(
        <html>
          <head>
            <title>sup</title>
          </head>
          <body>
            <RichText />
          </body>
        </html>
      ),
      { headers: [["Content-Type", "text/html"]] }
    );
  },
  development: true,
});
