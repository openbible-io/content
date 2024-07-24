# content

Monorepo that indexes, versions, and transforms upstream formats (XML, USFM, OSIS) into
enriched OpenBible HTML for <https://static.openbible.io>.

Currently implemented in Zig for ~10x speedup from JS.

## HTML

Original language:
```html
<p>
  <ob-verse n="1">
    <ob-word lemma="רֵאשִׁית">
      בִּרֵאשִׁ֖ית
    </ob-word>
    <ob-footnote caller="+">
      LC is not clear about some character.
    </ob-footnote>
  </ob-verse>
</p>
```

Translated languages may link back to original languages by (verse,word) index:
```html
<p>
  <ob-verse n="1">
    <ob-word og-order="1">In the beginning</ob-word>,
  </ob-verse>
</p>
```

For formatting purposes:
- Hebrew open sections (פ) become `<p>`s
  - `<p>`s are the semantically correct element and necessary for screen readers
- Hebrew closed sections (ס) become `<ob-ס />`
  - In Hebrew will become 9 non-breaking spaces. In English will become a `<br />`.

For alignment purposes:
- `<ob-verse>`s follow KJV versification
  - `og-order` means verses MUST align.
- `<ob-word>`s follow:
  - Hebrew+Aramaic: <tanach.us> (based on [LC](https://archive.org/details/leningradcodexcomplete))
  - Greek: idk yet
- Files are split into `{book}/{chapter}.html`
  - Biblical books use lowercase [Paratext IDs](https://wiki.crosswire.org/OSIS_Book_Abbreviations)
  - Chapters use `%03d` formatting for sorting
