import { readFileSync } from 'node:fs';
import { type BibleMeta } from './main.ts';
import * as db from './db/index.ts';
import { toJSON } from 'usfm-js';

export function ingestUsfm(id: string, meta: BibleMeta, publication: db.Id, f: string) {
	const usfm = readFileSync(f, 'utf8');
	const parsed = toJSON(usfm);
	const bookId = parsed.headers
		.find((h: any) => h.tag == 'id').content
		.substring(0, 3)
		.toLowerCase();
	const lang = id.split('_')[0];
	const title = (parsed.headers.find((h: any) => ['h', 'toc1', 'mt1'].includes(h.tag)) ?? { content: '' }).content;

	const published = meta.published ? new Date(meta.published) : undefined;
	const from = db.toJulianDays(published);

	const writingId = db.createWriting(bookId, title, lang, from);
	db.db.prepare(`INSERT INTO publication_writing VALUES (?, ?)`)
		.run(publication, writingId);

	// Sort front to be first verse
	Object.values(parsed.chapters).forEach((c: any) => {
		c['-1'] = c.front;
		delete c.front;
	});

	const segmenter = new Intl.Segmenter(lang, { granularity: 'word' });
	let before = '';
	let after = '';
	let fmt = '';
	let text = '';
	let order = 1;
	let chapter = '';
	let verse = '';
	let heading = '';

	const insertWord = db.db.prepare(`
INSERT INTO writing_word
('writing_id', 'order', 'word_id', 'before', 'after') VALUES
(?, ?, ?, ?, ?)
`);

	const insertTag = db.db.prepare(`
INSERT INTO word_tag
('writing_id', 'order', 'offset', 'key', 'value') VALUES
(?, ?, 0, ?, ?)
`);

	function flushWord() {
		if (!text) return;
		const wordId = db.createOrGetWord(text, lang);
		const writingWordOrder = order++;

		insertWord.run(writingId, writingWordOrder, wordId, before, after);
		if (chapter) insertTag.run(writingId, writingWordOrder, 'c', chapter);
		if (verse) insertTag.run(writingId, writingWordOrder, 'v', verse);
		if (heading) insertTag.run(writingId, writingWordOrder, 'h', heading);

		before = '';
		after = '';
		text = '';
		fmt = '';
		chapter = '';
		verse = '';
		heading = '';
	}

	function parseVerseObject(vo: any) {
		// console.log(vo);
		if (vo.type == 'section') {
			heading = vo.content.trim();
			return;
		}
		if (vo.type != 'paragraph' && !vo.text) return;
		fmt = vo.tag;
		for (let w of segmenter.segment((vo.text ?? '').replace(/\s+$/, ' '))) {
			if (w.isWordLike) {
				text = w.segment;
			} else {
				if (w.segment.trim().length == 0) flushWord();
				if (text) after += w.segment;
				else before += w.segment;
			}
		}
		flushWord();
	}

	Object.keys(parsed.chapters).forEach(c => {
		chapter = c;
		Object.keys(parsed.chapters[c])
			.map(v => parseInt(v))
			.sort((a, b) => a - b)
			.forEach(v => {
				verse = v.toString();
				parsed.chapters[c][v].verseObjects.forEach(parseVerseObject);
			});
	});
}
