//! Transforms sources from various formats (USFM, XML, OSIS) to HTML by ingesting through a SQL
//! database that matches the one stored client-side.
import { join } from 'node:path';
import { readdirSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { globSync } from 'glob';
import { ingestUsfm } from './usfm.ts'

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

	const entries = Object.entries(index.bibles);
	entries.forEach(([k, v]) => ingest(k, v));

	const fname = join(outDir, 'index.json');
	console.log('writing', fname);
	Object.values(index.bibles).forEach(b => {
		delete (b as any).files;
	});
	writeFileSync(fname, JSON.stringify(index));
}

function ingest(id: string, meta: BibleMeta) {
	const dir = join(outDir, id);
	mkdirSync(dir, { recursive: true });

	meta.files?.forEach(f => {
		console.log(f);
		ingestFile(id, meta, dir, f);
	});
}

function ingestFile(id: string, bible: BibleMeta, dir: string, f: string) {
	if (f.endsWith('.usfm')) {
		ingestUsfm(id, bible, dir, f);
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
