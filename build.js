import { execSync } from 'child_process';
import { join, basename } from 'path';
import { readdirSync, writeFileSync, readFileSync, rmSync } from 'fs';

const contentDir = 'content';
const outDir = 'dist';
const biblesDir = 'bibles';

function updateDist(dir) {
	console.log('update', dir);
	const out = join(outDir, biblesDir, dir);

	execSync(`npm run usfm -- -o ${out} ${join(contentDir, dir)}/*.usfm`);
	if (dir == 'en_bsb') {
		console.log('fixing en_bsb');
		// This publisher egregiously uses `<br>` as bottom margins to paragraphs.
		// Their usage in Psalms is forgiveable.
		execSync(`find ${join(outDir, biblesDir, dir)} -name '*.html' -not -path '*/psa/*' | xargs sed -i 's/<br>//g'`);
	}
	console.log();
}

function writeIndex() {
	const index = readdirSync(join(outDir, biblesDir), { withFileTypes: true })
		.filter(f => f.isDirectory())
		.map(f => f.name)
		.reduce((acc, cur) => {
			acc[cur] = metadata(cur);
			return acc;
		}, {});
	const fname = join(outDir, biblesDir, 'index.json');
	writeFileSync(fname, JSON.stringify(index, null, 2));
	console.log(fname);
}

function metadata(dir) {
	const cwd = join(contentDir, dir);
	console.log('metadata', cwd);
	execSync('git fetch', { cwd });
	execSync('git checkout origin/master -- index.json', { cwd });
	const metadataText = readFileSync(join(cwd, 'index.json'), 'utf8');
	const metadata = JSON.parse(metadataText);

	metadata.repo = execSync('git remote get-url origin', { cwd }).toString().trim();
	metadata.modified = execSync("git show --no-patch --format=%cd --date=format:'%Y-%m-%d'", { cwd })
		.toString()
		.trim();
	metadata.books = listBooks(join(outDir, biblesDir, dir));

	validateMetadata(metadata);

	return metadata;
}

function listBooks(dir) {
	const books = {
		'gen': 1,
		'exo': 2,
		'lev': 3,
		'num': 4,
		'deu': 5,
		'jos': 6,
		'jdg': 7,
		'rut': 8,
		'1sa': 9,
		'2sa': 10,
		'1ki': 11,
		'2ki': 12,
		'1ch': 13,
		'2ch': 14,
		'ezr': 15,
		'neh': 16,
		'est': 17,
		'job': 18,
		'psa': 19,
		'pro': 20,
		'ecc': 21,
		'sng': 22,
		'isa': 23,
		'jer': 24,
		'lam': 25,
		'ezk': 26,
		'dan': 27,
		'hos': 28,
		'jol': 29,
		'amo': 30,
		'oba': 31,
		'jon': 32,
		'mic': 33,
		'nam': 34,
		'hab': 35,
		'zep': 36,
		'hag': 37,
		'zec': 38,
		'mal': 39,
		'mat': 40,
		'mrk': 41,
		'luk': 42,
		'jhn': 43,
		'act': 44,
		'rom': 45,
		'1co': 46,
		'2co': 47,
		'gal': 48,
		'eph': 49,
		'php': 50,
		'col': 51,
		'1th': 52,
		'2th': 53,
		'1ti': 54,
		'2ti': 55,
		'tit': 56,
		'phm': 57,
		'heb': 58,
		'jas': 59,
		'1pe': 60,
		'2pe': 61,
		'1jn': 62,
		'2jn': 63,
		'3jn': 64,
		'jud': 65,
		'rev': 66,
	};
	return readdirSync(dir, { withFileTypes: true })
		.filter(f => f.isDirectory())
		.map(f => f.name)
		.sort((a, b) => books[a] - books[b])
		.reduce((acc, cur) => {
			const chapters = readdirSync(join(dir, cur))
				.map(f => +basename(f, '.html'))
				.sort((a, b) => a - b);
			let can_compress = true;
			for (let i = 0; i < chapters.length; i++) {
				if (i + 1 != chapters[i]) can_compress = false;
			}
			if (can_compress) {
				acc[cur] = chapters.length;
			} else {
				acc[cur] = chapters;
			}

			return acc;
		}, {});
}

function validateMetadata(meta) {
	// For frontend's sake
	if (!meta.title) throw Error('missing title');
	if (!meta.publisher) throw Error('missing publisher');
	if (!meta.license) throw Error('missing license');
}

rmSync(outDir, { recursive: true, force: true });
readdirSync(contentDir).forEach(updateDist);
writeIndex();
