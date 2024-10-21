import type { Bible } from "@openbible/core";
import { type Ast, render } from "@openbible/bconv";
import Nav from "./nav.tsx";
import Page from "./page.tsx";
import { BookLinks } from "./bible.tsx";

export default function Book(props: { bible: Bible; ast: Ast }) {
  let __html = "";
  render.html(props.ast, (s: string) => __html += s);

  const chapters: { id: string; text: string }[] = [];
  __html = __html.replaceAll(/<h2>([^<]*)<\/h2>/g, (_, text) => {
    const id = `c${chapters.length + 1}`;
    chapters.push({ id, text });
    return `<h2 id="${id}">${text}</h2>`;
  });

  const nav = (
    <Nav>
      <BookLinks bible={props.bible} />
      <ul>
        {chapters.map((c) => (
          <li>
            <a href={`#${c.id}`}>{c.text}</a>
          </li>
        ))}
      </ul>
    </Nav>
  );

  return (
    <Page nav={nav}>
      <div dangerouslySetInnerHTML={{ __html }} />
    </Page>
  );
}
