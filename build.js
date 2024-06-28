import { execSync } from 'child_process';
import { join, basename } from 'path';
import { readdirSync, existsSync, writeFileSync, readFileSync, renameSync, rmSync } from 'fs';
import YAML from 'yaml';

const contentDir = 'content';
const outDir = 'dist';
const biblesDir = 'bibles';

function updateDist(dir) {
	console.log('update', dir);
	const out = join(outDir, biblesDir, dir);

	execSync(`npm run usfm -- -o ${out} ${join(contentDir, dir)}/*.usfm`);
	readdirSync(out, { withFileTypes: true })
		.filter(f => f.isDirectory())
		.forEach(d => {
			// Currently unfoldingWord uses the pattern `\{2}d-\{3}w`
			// This should be replaced with a proper file -> book name manifest.
			renameSync(join(out, d.name), join(out, d.name.substring(3, 6).toLowerCase()));
		});
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
	const modified = execSync("git show --no-patch --format=%cd --date=format:'%Y-%m-%d'")
		.toString()
		.trim();
	const booksDir = join(outDir, biblesDir, dir);
	const books = readdirSync(booksDir, { withFileTypes: true })
		.filter(f => f.isDirectory())
		.map(f => f.name)
		.sort()
		.reduce((acc, cur) => {
			const chapters = readdirSync(join(booksDir, cur))
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

	let metadata = {
		publisher: 'unknown',
		title: 'unknown',
		date: 'unknown',
		modified,
		license: 'unknown',
		authors: [],
		books,
	};
	const manifest = join(contentDir, dir, 'manifest.yaml');
	if (existsSync(manifest)) {
		metadata = Object.assign(metadata, unfoldingWord(manifest));
	} else {
		console.error('figure out metadata for', dir, 'or DO NOT publish it');
		process.exit(1);
	}

	return metadata;
}

function unfoldingWord(manifest) {
	const yaml = readFileSync(manifest, 'utf8');
	const parsed = YAML.parse(yaml);
	const core = parsed['dublin_core'];

	const res = {
		publisher: core.creator,
		title: core.title,
		date: core.issued,
		license: core.rights,
		authors: core.contributor,
	};

	const frontmatter = parsed.projects.find(p => p.identifier == 'frt');
	if (frontmatter) {
		res.about = frontmatter.path.replace('.usfm', '');
	}

	return res;
}

rmSync(outDir, { recursive: true });
readdirSync(contentDir).forEach(updateDist);
writeIndex();
