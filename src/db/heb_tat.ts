import { type BibleMeta, createTable, ingestCsvDocument } from './index.ts';

const schema = {
	id: 'INTEGER PRIMARY KEY',
	variant: 'TEXT',
	sources: 'TEXT',
	book: 'TEXT',
	chapter: 'INTEGER',
	verse: 'INTEGER',
	word: 'INTEGER',
	lang: 'TEXT',
	strongs: 'TEXT',
	text: 'TEXT',
	grammar: 'TEXT',
	transliteration_en: 'TEXT',
	translation_en: 'TEXT',
};

export function init(bible: BibleMeta) {
	createTable(bible.id!, schema);
}

export async function ingest(bible: BibleMeta) {
	await ingestCsvDocument(bible.id!, schema, bible.files!);
}
