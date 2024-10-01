import { type BibleMeta, createTable, ingestCsvDocument } from './index.ts';

const schema = {
	id: 'INTEGER PRIMARY KEY',
	book: 'TEXT',
	chapter: 'INTEGER',
	verse: 'INTEGER',
	original: 'TEXT',
	lang: 'TEXT',
	strong: 'TEXT',
	order: 'REAL',
	parsing: 'TEXT',
	transliteration: 'TEXT',
	translation: 'TEXT',
	before: 'TEXT',
	heading: 'TEXT',
	footnote: 'TEXT',
};

export function init(bible: BibleMeta) {
	createTable(bible.id!, schema);
}

export async function ingest(bible: BibleMeta) {
	await ingestCsvDocument(bible.id!, schema, bible.files!, { delimiter: ',' });
}
