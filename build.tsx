import type { VNode } from "preact";
import { render as preactRender } from "preact-render-to-string";
import Index from "./src/index.tsx";
import Bible from "./src/bible.tsx";
import Book from "./src/book.tsx";
import { walk } from "jsr:@std/fs/walk";
import * as path from "jsr:@std/path";
import index from "./index.ts";

function render(comp: VNode) {
  return "<!DOCTYPE html>" + preactRender(comp);
}

// Copy static
for await (const dirEntry of walk("static")) {
  const newPath = dirEntry.path.replace("static", "dist");
  if (dirEntry.isDirectory) Deno.mkdirSync(newPath, { recursive: true });
  else Deno.copyFileSync(dirEntry.path, newPath);
}

// Render bibles
Object.entries(index).forEach(([k, v]) => {
  const writings = v.writings ?? [];
  writings.forEach((w, i) => {
    const wdir = path.join("dist", k, writings.length > 1 ? i.toString() : "");

    if (w.type == "bible") {
      Object.entries(w.books).forEach(([id, b]) => {
        const bdir = path.join(wdir, id);
        Deno.mkdirSync(bdir, { recursive: true });
        Deno.writeTextFileSync(
          path.join(bdir, "index.html"),
          render(<Book bible={w} ast={b} />),
        );
      });
      Deno.writeTextFileSync(
        path.join(wdir, "index.html"),
        render(<Bible publication={v} bible={w} />),
      );
    } else {
      throw Error("Add renderer for ", w.type);
    }
  });
});

Deno.writeTextFileSync("dist/index.html", render(<Index index={index} />));
