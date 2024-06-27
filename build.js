import { execSync } from 'child_process';
import { join } from 'path';
import { readdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import YAML from 'yaml';

const contentDir = 'content';
const outDir = 'dist';
const biblesDir = 'bibles';

function updateDist(dir) {
	console.log('update', dir);
	const out = join(outDir, biblesDir, dir);

	execSync(`npm run usfm -- -o ${out} ${join(contentDir, dir)}/*.usfm`);
	console.log();
}

function writeIndex() {
	const index = readdirSync(join(outDir, biblesDir)).reduce((acc, cur) => {
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
	const books = readdirSync(join(outDir, biblesDir, dir), { withFileTypes: true })
		.filter(f => f.isDirectory())
		.map(f => f.name)
		.sort();

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

readdirSync(contentDir).forEach(updateDist);
writeIndex();
