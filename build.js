import { execSync } from 'child_process';
import { join, basename } from 'path';
import { readdirSync, existsSync, writeFileSync, readFileSync, renameSync, rmSync, statSync } from 'fs';
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

	let metadata = {
		publisher: 'unknown',
		title: 'unknown',
		date: 'unknown',
		modified,
		license: 'unknown',
		authors: [],
		books: {},
	};
	const manifest = join(contentDir, dir, 'manifest.yaml');
	if (existsSync(manifest)) {
		metadata = Object.assign(metadata, unfoldingWord(dir, manifest));
	} else {
		console.error('figure out metadata for', dir, 'or DO NOT publish it');
		process.exit(1);
	}

	return metadata;
}

function unfoldingWord(version, manifest) {
	const yaml = readFileSync(manifest, 'utf8');
	const parsed = YAML.parse(yaml);
	const core = parsed['dublin_core'];
	const books = parsed.projects
		.map(pr => {
			const path1 = join(outDir, biblesDir, version, basename(pr.path, '.usfm'));
			const paths = [path1, path1 + '.html'];
			const path = paths.find(p => existsSync(p));
			return {
				...pr,
				path,
				isDirectory: statSync(path).isDirectory()
			};
		})
		.map(pr => {
			const newPath = join(outDir, biblesDir, version, pr.identifier + (pr.isDirectory ? '' : '.html'));
			renameSync(pr.path, newPath);
			pr.path = newPath;
			return pr;
		})
		.filter(pr => statSync(pr.path).isDirectory())
		.sort((pr1, pr2) => pr1.sort - pr2.sort)
		.reduce((acc, cur) => {
			const chapters = readdirSync(cur.path)
				.map(f => +basename(f, '.html'))
				.sort((a, b) => a - b);
			let can_compress = true;
			for (let i = 0; i < chapters.length; i++) {
				if (i + 1 != chapters[i]) can_compress = false;
			}
			if (can_compress) {
				acc[cur.identifier] = chapters.length;
			} else {
				acc[cur.identifier] = chapters;
			}

			return acc;
		}, {});

	const res = {
		publisher: core.creator,
		title: core.title,
		date: core.issued,
		license: core.rights,
		authors: core.contributor,
		books,
	};

	const frontmatter = parsed.projects.find(p => p.identifier == 'frt');
	if (frontmatter) {
		res.about = frontmatter.identifier;
	}

	return res;
}

rmSync(outDir, { recursive: true, force: true });
readdirSync(contentDir).forEach(updateDist);
writeIndex();
