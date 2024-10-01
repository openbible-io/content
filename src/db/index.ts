//! A SQL database for relationships between words.
import DatabaseSync from 'better-sqlite3';
import { rmSync } from 'node:fs';
import { parseFile as parseCsv, type ParserOptionsArgs } from '@fast-csv/parse';

import * as en_bsb from './en_bsb.ts';
import * as heb_tat from './heb_tat.ts';
import * as grc_tat from './grc_tat.ts';
import * as tbl from './tbl.ts';
export const ingesters = {
	en_bsb,
	heb_tat,
	grc_tat,
	tbl,
};

const file = 'dist/openbible.db';
export let db: DatabaseSync.Database;
process.on('exit', () => db.close());

export type BibleMeta = {
	title: string;
	publisher: string;
	license: string;
	// Mandatory in, optional out
	files?: string[];
	downloadUrl?: string;
	publisherUrl?: string;
	licenseUrl?: string;

	repo?: string;
	modified?: string;

	id?: string;
	books?: { [key: string]: number };
};

export function init(dropExisting: boolean, metas: BibleMeta[]) {
	if (dropExisting) rmSync(file, { force: true });

	db = new DatabaseSync(file);
	db.pragma('synchronous = OFF');
	db.pragma('journal_mode = MEMORY');

	if (dropExisting) {
		metas.forEach(b => ingesters[b.id! as keyof typeof ingesters].init(b));
	}
}

type Schema = { [key: string]: string };

export function createTable(table: string, schema: Schema) {
	db.prepare(`
CREATE TABLE '${table}' (
${Object.entries(schema).map(([k, v]) => `'${k}' ${v}`).join(',\n')}
) STRICT;
	`).run();
}

export async function ingestCsvDocument(table: string, schema: Schema, files: string[], options: ParserOptionsArgs = {}) {
	const insert = db.prepare(`
INSERT INTO '${table}' VALUES (
${Object.keys(schema).map(k => `@${k}`).join(',\n')}
);
`);

	let increment = 10;
	let id = increment; // reserve 0 as sentinel
	db.prepare('BEGIN TRANSACTION;');
	for (let f of files) {
		console.log(f);
		const file = parseCsv(f, { headers: true, delimiter: '|', ...options });
		for await (const line of file) {
			line.id = id;
			try {
				insert.run(line);
			} catch (e) {
				console.error(line);
				throw e;
			}
			id += increment;
		}
	}
	db.prepare('COMMIT;');
	const rows = db.prepare(`SELECT COUNT(*) as count FROM ${table};`).get() as { count: number };
	console.log(rows.count, 'rows');
}

export function bookChapters(table: string) {
	const books = db.prepare(`SELECT DISTINCT book FROM ${table};`).all() as { book: string }[];
	const bookChapters = db.prepare(`
SELECT book, COUNT(DISTINCT chapter) as chapters
FROM ${table}
GROUP BY book;
`).all() as { book: string, chapters: number }[];
	return books.reduce((acc, cur) => {
		acc[cur.book] = bookChapters.find(r => r.book == cur.book)!.chapters;
		return acc;
	}, {} as { [key: string]: number });
}

