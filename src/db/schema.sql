CREATE TABLE 'lang' (
	'id' INTEGER PRIMARY KEY,
	'code' TEXT NOT NULL -- https://www.loc.gov/standards/iso639-2/php/code_list.php
) WITHOUT ROWID;
CREATE TABLE 'word' (
	'id' INTEGER PRIMARY KEY,
	'lang' INTEGER REFERENCES 'lang'('id'),
	'text' TEXT UNIQUE
) WITHOUT ROWID;
CREATE TABLE 'license' (
	'id' INTEGER PRIMARY KEY,
	'spdx' TEXT UNIQUE, -- https://spdx.org/licenses/
	'url' TEXT
);

CREATE TABLE 'author' (
	'id' INTEGER PRIMARY KEY,
	'name' TEXT NOT NULL,
	'from' TEXT, -- For disambiguation. Can be a url.
	UNIQUE ('name', 'from')
);
CREATE TABLE 'writing' (
	'id' INTEGER PRIMARY KEY,
	'title' TEXT,
	'lang_id' INTEGER REFERENCES 'lang'('id'), -- Majority.
	'date_from' INTEGER, -- Julian day number.
	'date_to' INTEGER, -- Julian day number.
	-- The following fields are denormalized but cheap.
	'usfm' TEXT, -- https://ubsicap.github.io/usfm/identification/books.html
	'is_nt' INTEGER NOT NULL -- Is new testament.
);
-- These carry meaning and are relational and searchable.
CREATE TABLE 'writing_word' (
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'order' INTEGER NOT NULL,
	'word_id' INTEGER NOT NULL REFERENCES 'word'('id'),
	'before' TEXT, -- Spacing and punctuation.
	'after' TEXT, -- Punctuation.
	PRIMARY KEY ('writing_id', 'order')
) WITHOUT ROWID;

-- CREATE TABLE 'artifact' (
-- 	'id' INTEGER PRIMARY KEY,
-- 	'writing_id' INTEGER REFERENCES 'writing'('id'),
-- 	'date' TEXT,
-- 	'type' TEXT,
-- 	'discovered_date' TEXT,
-- 	'name' TEXT
-- );
-- CREATE TABLE 'artifact_tag' (
-- 	'artifact_id' INTEGER NOT NULL REFERENCES 'artifact'('id'),
-- 	'key' TEXT NOT NULL,
-- 	'value' TEXT,
-- 	PRIMARY KEY('artifact_id', 'key')
-- );
-- CREATE TABLE 'img' (
-- 	'id' INTEGER PRIMARY KEY,
-- 	'artifact_id' INTEGER NOT NULL REFERENCES 'artifact'('id'),
-- 	'license_id' INTEGER NOT NULL REFERENCES 'license'('id'),
-- 	'is_front' INTEGER NOT NULL, -- Of artifact
-- 	'width' INTEGER NOT NULL,
-- 	'height' INTEGER NOT NULL,
-- 	'ppi' INTEGER,
-- 	'wavelength_start' INTEGER,
-- 	'wavelength_end' INTEGER,
-- 	'url' TEXT NOT NULL,
-- 	'svg_url' TEXT
-- );
-- CREATE TABLE 'img_tag' (
-- 	'img_id' INTEGER NOT NULL REFERENCES 'img'('id'),
-- 	'key' TEXT NOT NULL,
-- 	'value' TEXT,
-- 	PRIMARY KEY('img_id', 'key')
-- );
-- CREATE TABLE 'img_word' (
-- 	'img_id' INTEGER NOT NULL REFERENCES 'img'('id'),
-- 	'g_selector' TEXT NOT NULL, -- To SVG "g" element
-- 	'text_offset' INTEGER NOT NULL, -- In bytes from g > text > textContent:innerText
-- 	'word_master_id' INTEGER REFERENCES 'word_master'('id'),
-- 	PRIMARY KEY('img_id', 'g_selector', 'text_offset')
-- ) WITHOUT ROWID;

CREATE TABLE 'publisher' (
	'id' INTEGER PRIMARY KEY,
	'name' TEXT NOT NULL,
	'url' TEXT
);
CREATE TABLE 'publication' (
	'id' INTEGER PRIMARY KEY,
	'lang_id' INTEGER REFERENCES 'lang'('id'), -- Majority.
	'code' TEXT NOT NULL, -- OpenBible code like "bsb".
	'title' TEXT, 
	'subtitle' TEXT,
	'isbn' TEXT,
	'publisher_id' INTEGER NOT NULL REFERENCES 'publisher'('id'),
	UNIQUE ('lang_id', 'code')
);
CREATE TABLE 'publication_author' (
	'publication_id' INTEGER NOT NULL REFERENCES 'publication'('id'),
	'author_id' INTEGER NOT NULL REFERENCES 'author'('id'),
	'contribution' TEXT,
	PRIMARY KEY('publication_id', 'author_id')
);
CREATE TABLE 'publication_writing' (
	'publication_id' INTEGER NOT NULL REFERENCES 'publication'('id'),
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	PRIMARY KEY('publication_id', 'writing_id')
);

-- Tag a word or a character in a word. Some are done by publishers, some by users.
CREATE TABLE 'word_tag' (
	'writing_id' INTEGER NOT NULL,
	'order' INTEGER NOT NULL, -- Goes BEFORE this word.
	'offset' INTEGER NOT NULL, -- From start of word in bytes.
	'key' TEXT, -- 'p'aragraph, 'v'ersification, 'b'ookmark, 'n'ote
	'key2' TEXT, -- Bookmark or note category.
	'value' TEXT,
	PRIMARY KEY ('writing_id', 'order', 'offset', 'key'),
	FOREIGN KEY('writing_id', 'order') REFERENCES 'writing_word'('writing_id', 'order')
) WITHOUT ROWID;
CREATE TABLE 'span_tag' (
	'writing_id' INTEGER NOT NULL,
	'start' INTEGER NOT NULL,
	'start_offset' INTEGER NOT NULL, -- From start of word in bytes.
	'end' INTEGER NOT NULL,
	'end_offset' INTEGER NOT NULL, -- From start of word in bytes.
	'key' TEXT, -- 'h'ighlight, 'n'ote, 't'itle
	'key2' TEXT, -- Highlight or note category. Title heading level
	'value' TEXT,
	PRIMARY KEY ('writing_id', 'start', 'start_offset', 'end', 'end_offset', 'key'),
	FOREIGN KEY('writing_id', 'start') REFERENCES 'writing_word'('writing_id', 'order'),
	FOREIGN KEY('writing_id', 'end') REFERENCES 'writing_word'('writing_id', 'order')
) WITHOUT ROWID;
