import Page from "./page.tsx";
import Nav, { others } from "./nav.tsx";

export default function Index() {
  return (
    <Page nav={<Nav />}>
      <h1>OpenBible</h1>
      <p>
        This is an uninteractive and English-only site designed for browsers
        without modern features. For an interactive study experience with
        JavaScript, please visit{" "}
        <a href="https://openbible.io">https://openbible.io</a>
      </p>
      {Object.entries(others).map(([k, v]) => (
        <>
          <h2>{k}s</h2>
          <nav>
            <ul>
              {Object.keys(v).map((pub) => (
                <li>
                  <a href={`/${pub}`}>{pub}</a>
                </li>
              ))}
            </ul>
          </nav>
        </>
      ))}
    </Page>
  );
}
