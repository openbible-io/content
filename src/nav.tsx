import type { Publication } from "@openbible/core";
import type { JSX } from "preact";
import index from "../index.ts";

// Group by type
const types = Object.entries(index).reduce((acc, [k, v]) => {
  (v.writings ?? []).forEach((w) => {
    acc[w.type] = acc[w.type] ?? {};
    acc[w.type][k] = v;
  });
  return acc;
}, {} as { [ty: string]: { [publication: string]: Publication } });

const { bible, ...others } = types;
export { others };

export default function Nav(props: { children?: JSX.Element }) {
  return (
    <nav>
      <ul>
        <li>
          <a href="/">home</a>
        </li>
        {Object.keys(bible).map((k) => (
          <li>
            <a href={`/${k}`}>{k}</a>
          </li>
        ))}
      </ul>
      {props.children}
    </nav>
  );
}
