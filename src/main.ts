//! Transforms sources from various formats (USFM, XML, OSIS) to HTML by ingesting through a SQL
//! database that matches the one stored client-side.
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { init as initDb, ingesters, bookChapters, type BibleMeta, db } from './db/index.ts';

const sourcesDir = 'node_modules/@openbible';
const outDir = 'dist';

async function main() {
	const index = {
		bibles: {} as { [key: string]: BibleMeta },
		dictionaries: {} as { [key: string]: BibleMeta },
	};
	readdirSync(sourcesDir).forEach(source => {
		const path = join(sourcesDir, source);
		const pkg_path = join(path, 'package.json');
		const pkg = JSON.parse(readFileSync(pkg_path, 'utf8'));

		const meta = pkg.openbible as {
			bibles: { [key: string]: Partial<BibleMeta> },
			dictionaries: { [key: string]: Partial<BibleMeta> },
		};
		(['bibles', 'dictionaries'] as const).forEach(p => {
			Object.entries(meta?.[p] ?? {}).forEach(([k, v]) => {
				v.id = k;
				if (!v.files) throw Error(`${k} missing files in ${pkg_path}`);
				v.files = v.files.map(f => globSync(join(path, f))).flat().sort();
				v.repo = pkg.repository.url.replace('git+', '').replace('.git', '');
				v.modified = execSync(`npm view "${pkg.name}" "time[${pkg.version}]"`).toString().trim();
			});

			Object.assign(index[p], meta[p]);
		});
	});

	const dictionaries = Object.values(index.dictionaries);
	const bibles = Object.values(index.bibles);
	const shouldIngest = process.argv.includes('--ingest');
	initDb(shouldIngest, dictionaries.concat(bibles));
	if (shouldIngest) {
		console.log('ingesting', dictionaries.length, 'dictionaries');
		for (let d of dictionaries) await ingest(d);
		console.log('ingesting', bibles.length, 'bibles');
		for (let b of bibles) await ingest(b);
	}

	console.log('summing bookChapters');
	bibles.forEach(b => b.books = bookChapters(b.id!));

	const fname = join(outDir, 'index.json');
	console.log('writing', fname);
	Object.values(index.bibles).forEach(b => {
		validateMetadata(b);
		delete b.id;
		delete b.files;
	});
	writeFileSync(fname, JSON.stringify(index));
}

async function ingest(bible: BibleMeta) {
	console.log('ingest', bible.id);
	const ingester = ingesters[bible.id as keyof typeof ingesters];
	if (!ingester) throw Error('no ingester implemented');
	await ingester.ingest(bible);
}

/** For frontend's schema. */
function validateMetadata(bible: BibleMeta) {
	if (!bible.title) throw Error(`${bible.id} missing title`);
	if (!bible.publisher) throw Error(`${bible.id} missing publisher`);
	if (!bible.license) throw Error(`${bible.id} missing license`);
	if (!bible.books) throw Error(`${bible.id} missing books`);
}

await main();
