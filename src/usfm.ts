import { readFileSync } from 'node:fs';
import * as db from './db/index.ts';
import { toJSON } from 'usfm-js';

export function ingestUsfm(meta: db.BibleMeta, f: string) {
	const usfm = readFileSync(f, 'utf8');
	const parsed = toJSON(usfm);
	const usfm_id = parsed.headers.find(h => h.tag == 'id').content.substring(0, 3).toLowerCase();
	console.log(usfm_id);
	const derivativeId = db.getWriting(usfm_id);
	const writingId = db.createWriting(usfm_id, meta, derivativeId);

	// Sort front to front...
	Object.values(parsed.chapters).forEach((c: any) => {
		c['-1'] = c.front;
		delete c.front;
	});

	const segmenter = new Intl.Segmenter(meta.id.split('_')[0], { granularity: 'word' });
	let before = '';
	let after = '';
	let fmt = '';
	let text = '';
	let order = 1;
	let ref: { c: number, v: number } | undefined;
	let heading: { level: number, text: string } | undefined;

	const insertWord = db.db.prepare(`
INSERT INTO writing_word
('writing_id', 'order', 'word_id', 'before', 'after') VALUES
(?, ?, ?, ?, ?)
`);

const insertFmt = db.db.prepare(`
INSERT INTO writing_fmt
('writing_id', 'writing_word_order', 'type') VALUES
(?, ?, ?)
`);

const insertVerse = db.db.prepare(`
INSERT INTO writing_versification
('writing_id', 'writing_word_order', 'chapter', 'verse') VALUES
(?, ?, ?, ?)
`);

const insertHeading = db.db.prepare(`
INSERT INTO writing_heading
('writing_id', 'writing_word_order', 'level', 'text') VALUES
(?, ?, ?, ?)
`);

	function flushWord() {
		if (!text) return;
		//console.log({ before, text, after })
		//before = '';
		//after = '';
		//text = '';
		//fmt = '';
		//return;
		const wordId = db.createOrGetWord(text);
		const writingWordOrder = order++;
		insertWord.run(writingId, writingWordOrder, wordId, before, after);

		if (ref) insertVerse.run(writingId, writingWordOrder, ref.c, ref.v);
		if (fmt) insertFmt.run(writingId, writingWordOrder, fmt);
		if (heading) insertHeading.run(writingId, writingWordOrder, heading.level, heading.text);

		before = '';
		after = '';
		text = '';
		fmt = '';
		ref = undefined;
		heading = undefined;
	}
	function parseVerseObject(vo: any) {
		if (vo.type == 'section') {
			heading = { level: +vo.tag.match(/\d+/)[0], text: vo.content };
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
		Object.keys(parsed.chapters[c])
			.map(v => parseInt(v))
			.sort((a, b) => a - b)
			.forEach(v => {
				ref = { c: +c, v };
				parsed.chapters[c][v].verseObjects.forEach(parseVerseObject);
			});
	});
}

