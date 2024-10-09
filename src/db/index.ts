//! A SQL database for relationships between words.
import DatabaseSync from 'better-sqlite3';
import * as books from '@openbible/core/src/books.ts';
import { rmSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const file = 'dist/openbible.db';
export let db: DatabaseSync.Database;
process.on('exit', () => db.close());

export type BibleMeta = {
	title: string;
	publisher?: string;
	publisherUrl?: string;
	downloadUrl?: string;
	license: string;
	licenseUrl?: string;
	// Mandatory in, optional out
	files?: string[];

	repo?: string;
	modified?: string;

	// Temp
	id: string;
	books?: { [key: string]: number };
};

export function createOrGetLicense(license: string, licenseUrl?: string) {
	let id = (db.prepare(`SELECT id FROM license WHERE spdx=?`)
		.get(license) as { id: number | bigint })
		?.id;
	if (!id) {
		id = db.prepare(`INSERT INTO license (spdx, url) VALUES (?, ?)`)
			.run(license, licenseUrl)
			.lastInsertRowid;
	}
	return id;
}

export function createOrGetPublisher(name?: string, url?: string) {
	if (!name) return null;
	let id = (db.prepare(`SELECT id FROM publisher WHERE name=?`)
		.get(name) as { id: number | bigint } )
		?.id;
	if (!id) {
		id = db.prepare(`INSERT INTO publisher (name, url) VALUES (?, ?)`)
			.run(name, url)
			.lastInsertRowid;
	}
	return id;
}

export function createOrGetWord(text: string) {
	if (!text) return null;
	let id = (db.prepare(`SELECT id FROM word WHERE text=?`)
		.get(text) as { id: number | bigint } )
		?.id;
	if (!id) {
		id = db.prepare(`INSERT INTO word (text) VALUES (?)`)
			.run(text)
			.lastInsertRowid;
	}
	return id;
}

export function init(dropExisting: boolean) {
	if (dropExisting) rmSync(file, { force: true });
	mkdirSync(dirname(file), { recursive: true });

	db = new DatabaseSync(file);
	db.pragma('synchronous = OFF');
	db.pragma('journal_mode = MEMORY');
	if (dropExisting) {
		const schema = readFileSync(join(import.meta.dirname, './schema.sql'), 'utf8');
		db.exec(schema);
		// Books of the Bible
		books.protestant.forEach(b => createWriting(b, {
			license: 'CC0-1.0',
			licenseUrl: 'https://creativecommons.org/public-domain/cc0/',
		}));
	}
}

export function createWriting(
	usfm: books.Book,
	meta: Pick<BibleMeta, 'license' | 'licenseUrl' | 'publisher' | 'publisherUrl'>,
	derivativeId?: number | bigint,
) {
	const license = createOrGetLicense(meta.license, meta.licenseUrl);
	const publisher = createOrGetPublisher(meta.publisher, meta.publisherUrl);
	const writingId = db
		.prepare(`INSERT INTO writing (license_id, publisher_id, derivative_id, testament) VALUES (?, ?, ?, ?)`)
		.run(license, publisher, derivativeId ?? null, books.isNewTestament(usfm) ? 2 : 1)
		.lastInsertRowid;
	db
		.prepare(`INSERT INTO writing_tag (writing_id, key, value) VALUES (?, ?, ?)`)
		.run(writingId, 'usfm', usfm);
	return writingId;
}

export function getWriting(usfm: string) {
	return (db
		.prepare(`
SELECT id
FROM writing
JOIN writing_tag wt on id=wt.writing_id AND wt.key='usfm' AND value=?
`)
		.get(usfm) as { id: number | bigint })
		?.id;
}

export function bookChapters(table: string) {
	return {};
	const bookChapters = db.prepare(`
SELECT book, COUNT(DISTINCT chapter) as chapters
FROM ${table}
GROUP BY book;
`).all() as { book: string, chapters: number }[];
	return bookChapters.reduce((acc, cur) => {
		acc[cur.book] = bookChapters.find(r => r.book == cur.book)!.chapters;
		return acc;
	}, {} as { [key: string]: number });
}

