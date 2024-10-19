import { readFileSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { type BibleMeta } from './main.ts';
import * as bconv from '@openbible/bconv';

export function ingestUsfm(id: string, meta: BibleMeta, dir: string, fname: string) {
	const usfm = readFileSync(fname, 'utf8');
	const parsed = bconv.canonicalize(bconv.usfm.parseAndPrintErrors(usfm));

	const book = parsed.find(n => 'book' in n);
	if (!book) throw Error('no book in ' + fname);

	const out = createWriteStream(join(dir, `${book}.html`));

	bconv.render.html((s: string) => out.write(s), parsed);

	out.end();
}
