import { type BibleMeta, createTable, ingestCsvDocument } from './index.ts';

const schema = {
	id: 'INTEGER PRIMARY KEY',
	eStrong: 'TEXT',
	dStrong: 'TEXT',
	uStrong: 'TEXT',
	reason: 'TEXT',
	word: 'TEXT',
	morph: 'TEXT',
	transliteration_en: 'TEXT',
	gloss_en: 'TEXT',
	meaning_en: 'TEXT',
	notes_en: 'TEXT',
};

export function init(bible: BibleMeta) {
	createTable(bible.id!, schema);
}

export async function ingest(bible: BibleMeta) {
	await ingestCsvDocument(bible.id!, schema, bible.files!);
}
