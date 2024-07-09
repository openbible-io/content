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
	writeFileSync(fname, JSON.stringify(index));
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

	return metadata;
}

function listBooks(dir) {
	return readdirSync(dir, { withFileTypes: true })
		.filter(f => f.isDirectory())
		.map(f => f.name)
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

rmSync(outDir, { recursive: true, force: true });
readdirSync(contentDir).forEach(updateDist);
writeIndex();
