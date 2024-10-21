import type { JSX } from "preact";

export default function Page(
  props: { nav: JSX.Element; children: JSX.Element },
) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <link rel="stylesheet" href="/main.css" />
      </head>
      <body>
        {props.nav}
        <main>
          {props.children}
        </main>
      </body>
    </html>
  );
}
