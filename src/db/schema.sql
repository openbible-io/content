CREATE TABLE 'lang' (
	'id' INTEGER PRIMARY KEY,
	'code' TEXT NOT NULL
) WITHOUT ROWID;

CREATE TABLE 'word' (
	'id' INTEGER PRIMARY KEY,
	'text' TEXT
) WITHOUT ROWID;

CREATE TABLE 'tradition' (
	'id' INTEGER PRIMARY KEY,
	'name' TEXT,
	'start_date' TEXT
);

CREATE TABLE 'license' (
	'id' INTEGER PRIMARY KEY,
	'spdx' TEXT,
	'url' TEXT
);

CREATE TABLE 'writing' (
	'id' INTEGER PRIMARY KEY,
	'license_id' INTEGER,
	'date' TEXT, -- Sortable string
	'testament' INTEGER NOT NULL, -- 0=none, 1=old, 2=new
	'title' TEXT, -- In original language.
	'short_title' TEXT, -- In original language.
	FOREIGN KEY('license_id') REFERENCES 'license'('id')
);

CREATE TABLE 'writing_lang' (
	'writing_id' INTEGER NOT NULL,
	'lang_id' INTEGER NOT NULL,
	PRIMARY KEY('writing_id', 'lang_id'),
	FOREIGN KEY('lang_id') REFERENCES 'lang'('id'),
	FOREIGN KEY('writing_id') REFERENCES 'writing'('id')
);

CREATE TABLE 'author' (
	'id' INTEGER PRIMARY KEY,
	'name' TEXT NOT NULL,
	'qualifications' TEXT
);

CREATE TABLE 'writing_author' (
	'writing_id' INTEGER NOT NULL,
	'author_id' INTEGER NOT NULL,
	PRIMARY KEY('writing_id', 'author_id')
) WITHOUT ROWID;

CREATE TABLE 'writing_name' (
	'id' INTEGER PRIMARY KEY,
	'lang_id' INTEGER NOT NULL,
	'writing_id' INTEGER NOT NULL,
	'name' TEXT NOT NULL,
	'note' TEXT,
	FOREIGN KEY('lang_id') REFERENCES 'lang'('id'),
	FOREIGN KEY('writing_id') REFERENCES 'writing'('id')
);

CREATE TABLE 'canon' (
	'id' INTEGER PRIMARY KEY,
	'tradition_id' INTEGER NOT NULL,
	'name' TEXT, -- In original language.
	'name_en' TEXT,
	'start_date' TEXT,
	FOREIGN KEY('tradition_id') REFERENCES 'tradition'('id')
);

CREATE TABLE 'canon_writing' (
	'canon_id' INTEGER NOT NULL,
	'writing_id' INTEGER NOT NULL,
	'order' INTEGER NOT NULL,
	'is_apocrypha' INTEGER NOT NULL,
	PRIMARY KEY('canon_id', 'writing_id'),
	FOREIGN KEY('canon_id') REFERENCES 'canon'('id'),
	FOREIGN KEY('writing_id') REFERENCES 'writing'('id')
);

CREATE TABLE 'artifact' (
	'id' INTEGER PRIMARY KEY,
	'writing_id' INTEGER,
	'date' TEXT,
	'type' TEXT,
	'discovered_date' TEXT,
	'name' TEXT,
	FOREIGN KEY('writing_id') REFERENCES 'writing'('id')
);

CREATE TABLE 'artifact_tag' (
	'artifact_id' INTEGER NOT NULL,
	'key' TEXT NOT NULL,
	'value' TEXT,
	PRIMARY KEY('artifact_id', 'key'),
	FOREIGN KEY('artifact_id') REFERENCES 'artifact'('id')
);

CREATE TABLE 'img' (
	'id' INTEGER PRIMARY KEY,
	'artifact_id' INTEGER NOT NULL,
	'license_id' INTEGER NOT NULL,
	'is_front' INTEGER NOT NULL, -- Of artifact
	'width' INTEGER NOT NULL,
	'height' INTEGER NOT NULL,
	'ppi' INTEGER,
	'wavelength_start' INTEGER,
	'wavelength_end' INTEGER,
	'url' TEXT NOT NULL,
	'svg_url' TEXT,
	FOREIGN KEY('artifact_id') REFERENCES 'artifact'('id'),
	FOREIGN KEY('license_id') REFERENCES 'license'('id')
);

CREATE TABLE 'img_tag' (
	'img_id' INTEGER NOT NULL,
	'key' TEXT NOT NULL,
	'value' TEXT,
	PRIMARY KEY('img_id', 'key'),
	FOREIGN KEY('img_id') REFERENCES 'img'('id')
);

CREATE TABLE 'img_word' (
	'img_id' INTEGER NOT NULL,
	'g_selector' TEXT NOT NULL, -- To SVG "g" element
	'text_offset' INTEGER NOT NULL, -- In bytes from g > text > textContent:innerText
	'word_master_id' INTEGER,
	PRIMARY KEY('img_id', 'g_selector', 'text_offset'),
	FOREIGN KEY('img_id') REFERENCES 'img'('id'),
	FOREIGN KEY('word_master_id') REFERENCES 'word_master'('id')
) WITHOUT ROWID;

CREATE TABLE 'writing_word' (
	'writing_id' INTEGER NOT NULL,
	'word_id' INTEGER NOT NULL, -- In order
	'before' TEXT, -- Block-level formatting
	'after' TEXT, -- Punctuation
	PRIMARY KEY('writing_id', 'word_id'),
	FOREIGN KEY('writing_id') REFERENCES 'writing'('id'),
	FOREIGN KEY('word_id') REFERENCES 'word'('id'),
	FOREIGN KEY('worse_sense_id') REFERENCES 'word_sense'('id'),
) WITHOUT ROWID;

CREATE TABLE 'writing_versification' (
	'writing_id' INTEGER PRIMARY KEY,
	'word_id' INTEGER NOT NULL,
	'chapter' INTEGER NOT NULL,
	'verse' INTEGER NOT NULL,
	FOREIGN KEY('morph_reading_id') REFERENCES 'morph_reading'('id')
);
