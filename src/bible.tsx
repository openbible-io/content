import type { Bible, Publication } from "@openbible/core";
import type { TextNode } from "@openbible/bconv";
import Page from "./page.tsx";
import Nav from "./nav.tsx";

export function BookLinks(props: { bible: Bible }) {
  const bookLinks = Object.entries(props.bible.books).map(([k, ast]) => {
    const name = ast.find((n) => "tag" in n && n.tag == "h1");
    if (!name) console.warn("missing book name", k);
    return { href: k, name: (name as TextNode)?.text ?? k };
  });
  return (
    <ul>
      {bookLinks.map(({ href, name }) => (
        <li>
          <a href={href}>{name}</a>
        </li>
      ))}
    </ul>
  );
}

export default function Bible(
  props: { publication: Publication; bible: Bible },
) {
  const nav = (
    <Nav>
      <BookLinks bible={props.bible} />
    </Nav>
  );
  return (
    <Page nav={nav}>
      <h1>{props.publication.title}</h1>
      <div dangerouslySetInnerHTML={{ __html: props.bible.preface ?? "" }} />
    </Page>
  );
}
