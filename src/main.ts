//! Transforms sources from various formats (USFM, XML, OSIS) to HTML by ingesting through a SQL
//! database that matches the one stored client-side.
import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { ingestUsfm } from './usfm.ts'
import * as db from './db/index.ts';

const sourcesDir = 'node_modules/@openbible';
const outDir = 'dist';

function main() {
	const index = {
		bibles: {} as { [key: string]: db.BibleMeta },
	};
	readdirSync(sourcesDir).forEach(source => {
		const path = join(sourcesDir, source);
		const pkg_path = join(path, 'package.json');
		const pkg = JSON.parse(readFileSync(pkg_path, 'utf8'));

		const meta = pkg.openbible as {
			bibles: { [key: string]: Partial<db.BibleMeta> },
			published?: string,
		} | undefined;
		(['bibles'] as const).forEach(p => {
			if (!meta?.[p]) return;

			Object.entries(meta[p] ?? {}).forEach(([k, v]) => {
				v.id = k;
				if (!v.files) throw Error(`${k} missing files in ${pkg_path}`);
				v.files = v.files.map(f => globSync(join(path, f))).flat().sort();
				v.repo = pkg.repository.url.replace('git+', '').replace('.git', '');
				v.modified = meta?.published ?? new Date().toISOString().substring(0, 10);
			});

			Object.assign(index[p], meta[p]);
		});
	});

	const bibles = Object.values(index.bibles);
	const shouldIngest = process.argv.includes('--ingest');
	db.init(shouldIngest);
	if (shouldIngest) {
		console.log('ingesting', bibles.length, 'bibles');
		for (let b of bibles) ingest(b);
	}

	console.log('summing bookChapters');
	bibles.forEach(b => b.books = db.bookChapters(b.id!));

	const fname = join(outDir, 'index.json');
	console.log('writing', fname);
	Object.values(index.bibles).forEach(b => {
		validateMetadata(b);
		delete b.id;
		delete b.files;
	});
	writeFileSync(fname, JSON.stringify(index));
}

function ingest(bible: db.BibleMeta) {
	console.log('ingest', bible.id);
	bible.files?.forEach(f => ingestFile(bible, f));
}

function ingestFile(bible: db.BibleMeta, f: string) {
	if (f.endsWith('.usfm')) {
		ingestUsfm(bible, f);
	} else {
		throw Error(`implement ${f} ingester`);
	}
}

/** For frontend's schema. */
function validateMetadata(bible: db.BibleMeta) {
	if (!bible.title) throw Error(`${bible.id} missing title`);
	if (!bible.publisher) throw Error(`${bible.id} missing publisher`);
	if (!bible.license) throw Error(`${bible.id} missing license`);
	if (!bible.books) throw Error(`${bible.id} missing books`);
}

main();
