//! A SQL database for relationships between words.
import DatabaseSync from 'better-sqlite3';
import { books } from '@openbible/core';
import { rmSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { type BibleMeta } from '../main.ts';

const file = 'dist/openbible.db';
export let db: DatabaseSync.Database;
process.on('exit', () => db.close());

export type Id = number | bigint;

export function init(dropExisting: boolean) {
	if (dropExisting) rmSync(file, { force: true });
	mkdirSync(dirname(file), { recursive: true });

	db = new DatabaseSync(file);
	db.pragma('synchronous = OFF');
	db.pragma('journal_mode = MEMORY');
	if (dropExisting) {
		const schema = readFileSync(join(import.meta.dirname, './schema.sql'), 'utf8');
		db.exec(schema);
		// Initial books of Bible.
		// TODO: Titles from Crowdin heb and grc.
		Object.entries(books.all).forEach(
			([k, v]) => createWriting(
				k as books.Book,
				'',
				books.isNewTestament(k as books.Book) ? 'grc' : 'heb',
				toJulianDays(parseDate(v?.from)),
				toJulianDays(parseDate(v?.to)),
			)
		);
	}
}

function parseDate(year?: number, month?: number, day?: number) {
	if (!year) return;
	return new Date(Date.UTC(year, month, day));
}

export function toJulianDays(date?: Date) {
	if (!date) return;
	return Math.floor((date.getTime() / 86_400_000) + 2_440_587.5);
}

let langCounter = 0;
let langCache = {} as { [code: string]: Id };
export function createOrGetLang(code: string) {
	if (langCache[code]) return langCache[code];
	const id = (db.prepare(`SELECT id FROM lang WHERE code=?`)
		.get(code) as { id: Id })
		?.id;
	if (id) return id;

	db.prepare(`INSERT INTO lang (id, code) VALUES (?, ?)`)
		.run(++langCounter, code)
		.lastInsertRowid;
	langCache[code] = langCounter;
	return langCounter;
}

let wordCounter = 0;
export function createOrGetWord(text: string, lang: string) {
	if (!text || !lang) return null;
	const langId = createOrGetLang(lang);

	let id = (db.prepare(`SELECT id FROM word WHERE text=? AND lang=?`)
		.get(text, langId) as { id: Id } )
		?.id;
	if (id) return id;

	id = db.prepare(`INSERT INTO word (id, text, lang) VALUES (?, ?, ?)`)
		.run(++wordCounter, text, langId)
		.lastInsertRowid;
	return wordCounter;
}

export function createOrGetLicense(license: string, licenseUrl?: string) {
	const id = (db.prepare(`SELECT id FROM license WHERE spdx=?`)
		.get(license) as { id: Id })
		?.id;
	if (id) return id;

	return db.prepare(`INSERT INTO license (spdx, url) VALUES (?, ?)`)
		.run(license, licenseUrl)
		.lastInsertRowid;
}

export function createOrGetAuthor(name: string, from: string) {
	const id = (db.prepare(`SELECT id FROM author WHERE name=? AND 'from'=?`)
		.get(name, from) as { id: Id })
		?.id;
	if (id) return id;

	return db.prepare(`INSERT INTO author (name, 'from') VALUES (?, ?)`)
		.run(name, from)
		.lastInsertRowid;
}

export function createWriting(
	id: books.Book,
	title: string,
	lang?: string,
	from?: number,
	to?: number,
) {
	const langId = lang ? createOrGetLang(lang) : null;
	return db
		.prepare(`INSERT INTO writing (title, lang_id, date_from, date_to, usfm, is_nt) VALUES (?, ?, ?, ?, ?, ?)`)
		.run(title, langId, from, to, id, books.isNewTestament(id) ? 1 : 0)
		.lastInsertRowid;
}

export function createOrGetPublisher(name?: string, url?: string) {
	if (!name) return null;
	const id = (db.prepare(`SELECT id FROM publisher WHERE name=?`)
		.get(name) as { id: Id } )
		?.id;
	if (id) return id;

	return db.prepare(`INSERT INTO publisher (name, url) VALUES (?, ?)`)
		.run(name, url)
		.lastInsertRowid;
}

export function createPublication(id: string, meta: BibleMeta) {
	const publisherId = createOrGetPublisher(meta.publisher, meta.publisherUrl);

	const [langCode, code] = id.split('_');
	const langId = createOrGetLang(langCode);
	const res = db.prepare(`INSERT INTO publication (lang_id, code, title, publisher_id) VALUES (?, ?, ?, ?)`)
		.run(langId, code, meta.title, publisherId)
		.lastInsertRowid;

	const ins = db.prepare(`INSERT INTO publication_author VALUES (?, ?, ?)`);
	Object.entries(meta.authors ?? {}).forEach(([name, details]) => {
		const authorId = createOrGetAuthor(name, details.url);
		ins.run(res, authorId, details.contributions);
	});

	return res;
}

export function createWordTag(
	writingId: Id,
	order: Id,
	offset: Id,
	key: string,
	key2: string,
	value: string,
) {
	return db.prepare(`INSERT INTO word_tag (writing_id, order, offset, key, key2, value) VALUES (?, ?, ?, ?, ?, ?)`)
		.run(writingId, order, offset, key, key2, value);
}

export function createSpanTag(
	writingId: Id,
	start: Id,
	startOffset: Id,
	end: Id,
	endOffset: Id,
	key: string,
	key2: string,
	value: string,
) {
	return db.prepare(`INSERT INTO span_tag (writing_id, start, start_offset, end, end_offset, key, key2, value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
		.run(writingId, start, startOffset, end, endOffset, key, key2, value);
}
