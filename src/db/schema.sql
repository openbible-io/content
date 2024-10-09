CREATE TABLE 'lang' (
	'id' INTEGER PRIMARY KEY,
	'code' TEXT NOT NULL
);

CREATE TABLE 'word' (
	'id' INTEGER PRIMARY KEY,
	'text' TEXT UNIQUE
);

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

CREATE TABLE 'publisher' (
	'id' INTEGER PRIMARY KEY,
	'name' TEXT,
	'url' TEXT
);

CREATE TABLE 'writing' (
	'id' INTEGER PRIMARY KEY,
	'publisher_id' INTEGER REFERENCES 'publisher'('id'),
	'license_id' INTEGER REFERENCES 'license'('id'),
	'testament' INTEGER NOT NULL, -- 0=none, 1=old, 2=new
	'date' TEXT, -- Sortable string
	'title' TEXT, -- In original language.
	'short_title' TEXT, -- In original language.
	'download_url' TEXT,
	'derivative_id' INTEGER REFERENCES 'writing'('id') -- For translated books
);

CREATE TABLE 'writing_tag' (
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'key' TEXT NOT NULL,
	'value' TEXT,
	PRIMARY KEY('writing_id', 'key')
);

CREATE TABLE 'writing_lang' (
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'lang_id' INTEGER NOT NULL REFERENCES 'lang'('id'),
	PRIMARY KEY('writing_id', 'lang_id')
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
	'lang_id' INTEGER NOT NULL REFERENCES 'lang'('id'),
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'name' TEXT NOT NULL,
	'note' TEXT
);

CREATE TABLE 'canon' (
	'id' INTEGER PRIMARY KEY,
	'tradition_id' INTEGER NOT NULL REFERENCES 'tradition'('id'),
	'name' TEXT, -- In original language.
	'name_en' TEXT,
	'start_date' TEXT
);

CREATE TABLE 'canon_writing' (
	'canon_id' INTEGER NOT NULL REFERENCES 'canon'('id'),
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'order' INTEGER NOT NULL,
	'is_apocrypha' INTEGER NOT NULL,
	PRIMARY KEY('canon_id', 'writing_id')
);

CREATE TABLE 'artifact' (
	'id' INTEGER PRIMARY KEY,
	'writing_id' INTEGER REFERENCES 'writing'('id'),
	'date' TEXT,
	'type' TEXT,
	'discovered_date' TEXT,
	'name' TEXT
);

CREATE TABLE 'artifact_tag' (
	'artifact_id' INTEGER NOT NULL REFERENCES 'artifact'('id'),
	'key' TEXT NOT NULL,
	'value' TEXT,
	PRIMARY KEY('artifact_id', 'key')
);

CREATE TABLE 'img' (
	'id' INTEGER PRIMARY KEY,
	'artifact_id' INTEGER NOT NULL REFERENCES 'artifact'('id'),
	'license_id' INTEGER NOT NULL REFERENCES 'license'('id'),
	'is_front' INTEGER NOT NULL, -- Of artifact
	'width' INTEGER NOT NULL,
	'height' INTEGER NOT NULL,
	'ppi' INTEGER,
	'wavelength_start' INTEGER,
	'wavelength_end' INTEGER,
	'url' TEXT NOT NULL,
	'svg_url' TEXT
);

CREATE TABLE 'img_tag' (
	'img_id' INTEGER NOT NULL REFERENCES 'img'('id'),
	'key' TEXT NOT NULL,
	'value' TEXT,
	PRIMARY KEY('img_id', 'key')
);

CREATE TABLE 'img_word' (
	'img_id' INTEGER NOT NULL REFERENCES 'img'('id'),
	'g_selector' TEXT NOT NULL, -- To SVG "g" element
	'text_offset' INTEGER NOT NULL, -- In bytes from g > text > textContent:innerText
	'word_master_id' INTEGER REFERENCES 'word_master'('id'),
	PRIMARY KEY('img_id', 'g_selector', 'text_offset')
) WITHOUT ROWID;

CREATE TABLE 'writing_word' (
	'writing_id' INTEGER NOT NULL REFERENCES 'writing'('id'),
	'order' INTEGER NOT NULL,
	'word_id' INTEGER NOT NULL REFERENCES 'word'('id'),
	'before' TEXT,
	'after' TEXT,
	PRIMARY KEY ('writing_id', 'order')
) WITHOUT ROWID;

CREATE TABLE 'writing_fmt' (
	'writing_id' INTEGER NOT NULL,
	'writing_word_order' INTEGER NOT NULL,
	'type' TEXT,
	PRIMARY KEY ('writing_id', 'writing_word_order'),
	FOREIGN KEY('writing_id', 'writing_word_order') REFERENCES 'writing_word'('writing_id', 'order')
) WITHOUT ROWID;

CREATE TABLE 'writing_versification' (
	'writing_id' INTEGER NOT NULL,
	'writing_word_order' INTEGER NOT NULL,
	'chapter' INTEGER NOT NULL,
	'verse' INTEGER NOT NULL,
	PRIMARY KEY ('writing_id', 'writing_word_order'),
	FOREIGN KEY('writing_id', 'writing_word_order') REFERENCES 'writing_word'('writing_id', 'order')
) WITHOUT ROWID;

CREATE TABLE 'writing_heading' (
	'writing_id' INTEGER NOT NULL,
	'writing_word_order' INTEGER NOT NULL,
	'level' INTEGER NOT NULL,
	'text' TEXT NOT NULL,
	PRIMARY KEY ('writing_id', 'writing_word_order'),
	FOREIGN KEY('writing_id', 'writing_word_order') REFERENCES 'writing_word'('writing_id', 'order')
) WITHOUT ROWID;
