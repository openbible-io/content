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
	text: 'TEXT',
	strongss: 'TEXT',
	grammars: 'TEXT',
	dict_forms: 'TEXT',
	glosses: 'TEXT',
	transliteration_en: 'TEXT',
	translation_en: 'TEXT',
	translation_es: 'TEXT',
	submeaning: 'TEXT',
	conjoin: 'TEXT',
	amb_strongs: 'TEXT',
	alt_strongs: 'TEXT',
	note: 'TEXT',
};

export function init(bible: BibleMeta) {
	createTable(bible.id!, schema);
}

export async function ingest(bible: BibleMeta) {
	await ingestCsvDocument(bible.id!, schema, bible.files!);
}
