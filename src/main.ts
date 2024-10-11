//! Transforms sources from various formats (USFM, XML, OSIS) to HTML by ingesting through a SQL
//! database that matches the one stored client-side.
import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync } from 'node:fs';
import { globSync } from 'glob';
import { ingestUsfm } from './usfm.ts'
import { SingleBar, Presets } from 'cli-progress';
import * as db from './db/index.ts';

const sourcesDir = 'node_modules/@openbible';
const outDir = 'dist';

export type BibleMeta = {
	title: string;
	downloadUrl: string;
	publisher?: string;
	publisherUrl?: string;
	published?: string;
	isbn?: string;
	license: string;
	licenseUrl?: string;
	authors?: {
		[name: string]: {
			url: string;
			qualifications?: string[];
			contributions?: string[];
		}
	};
	// Mandatory in, optional out
	files: string[];

	repo?: string;
	modified: string;
};

function main() {
	const index = {
		bibles: {} as { [key: string]: BibleMeta },
	};
	readdirSync(sourcesDir).forEach(source => {
		const path = join(sourcesDir, source);
		const pkg_path = join(path, 'package.json');
		const pkg = JSON.parse(readFileSync(pkg_path, 'utf8'));

		const meta = pkg.openbible as {
			bibles: { [key: string]: Partial<BibleMeta> },
			published?: string,
		} | undefined;
		(['bibles'] as const).forEach(p => {
			if (!meta?.[p]) return;

			Object.entries(meta[p] ?? {}).forEach(([k, v]) => {
				validateMetadata(k, v);
				if (!v.files) throw Error(`${k} missing files in ${pkg_path}`);
				v.files = v.files.map(f => globSync(join(path, f))).flat().sort();
				v.repo = pkg.repository.url.replace('git+', '').replace('.git', '');
				v.published = meta?.published ?? new Date().toISOString().substring(0, 10);
			});

			Object.assign(index[p], meta[p]);
		});
	});

	const shouldIngest = process.argv.includes('--ingest');
	db.init(shouldIngest);
	if (shouldIngest) {
		const entries = Object.entries(index.bibles);
		entries.forEach(([k, v]) => ingest(k, v));
	}

	const fname = join(outDir, 'index.json');
	console.log('writing', fname);
	Object.values(index.bibles).forEach(b => {
		delete (b as any).files;
	});
	writeFileSync(fname, JSON.stringify(index));
}

function ingest(id: string, meta: BibleMeta) {
	const publication = db.createPublication(id, meta);

	const bar = new SingleBar({
		format: '{bar} | {cur} | {value}/{total}',
	}, Presets.shades_grey);
	bar.start(meta.files.length, 0);
	meta.files?.forEach(f => {
		bar.increment(0, { cur: f });
		bar.render();
		ingestFile(id, meta, publication, f);
		bar.increment();
	});
	bar.stop();
}

function ingestFile(id: string, bible: BibleMeta, publication: db.Id, f: string) {
	if (f.endsWith('.usfm')) {
		ingestUsfm(id, bible, publication, f);
	} else if (f.endsWith('preface.html')) {
	} else {
		throw Error(`implement ${f} ingester`);
	}
}

/** For frontend's schema. */
function validateMetadata(id: string, bible: Partial<BibleMeta>) {
	if (!bible.title) throw Error(`${id} missing title`);
	if (!bible.publisher) throw Error(`${id} missing publisher`);
	if (!bible.license) throw Error(`${id} missing license`);
}

main();
