// The one allowance in the immutability gate: a shipped source.json may be
// re-recorded to follow a GitHub owner rename recorded in
// registry-owner-renames.json, and nothing else.
//
// Why this exists: api.github.com tarball archives put the owner in their top
// directory, so renaming the org changed the bytes every such shipped URL
// serves (the old URL answers 301 to the same renamed archive). The registry's
// rule that a version serves exactly one byte stream is then only true once
// url, strip_prefix and integrity are re-recorded. The validate workflow's
// isolated consumer builds prove the re-recorded integrity against GitHub.
//
// What is allowed, all of it required:
//   - the file is a source.json whose key set is unchanged;
//   - every key other than url, strip_prefix and integrity is byte-identical;
//   - url changes only by substituting one recorded owner pair in the owner
//     segment of an api.github.com tarball URL or a github.com archive URL;
//   - strip_prefix changes only by the same substitution at its start;
//   - integrity is a well-formed sha256 SRI value and differs from before.
//
// Usage (exit 0 = allowed, 1 = not a rename record, 2 = usage or read error):
//   node scripts/owner-rename-record.mjs <base-commit> <path/to/source.json>
// The before image is read from git at <base-commit>, the after image from
// HEAD, and the rename table from HEAD, so a PR cannot smuggle a rename pair
// in the working tree without committing it.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RECORDABLE = new Set(['url', 'strip_prefix', 'integrity']);
const SRI_SHA256 = /^sha256-[A-Za-z0-9+/]{43}=$/;
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

export function rewriteOwner(url, from, to) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return null;
	}
	if (parsed.protocol !== 'https:') return null;
	const segments = parsed.pathname.split('/');
	let ownerIndex;
	if (parsed.hostname === 'api.github.com' && segments[1] === 'repos' && segments[4] === 'tarball') {
		ownerIndex = 2;
	} else if (parsed.hostname === 'github.com' && segments[3] === 'archive') {
		ownerIndex = 1;
	} else {
		return null;
	}
	if (segments[ownerIndex] !== from) return null;
	segments[ownerIndex] = to;
	parsed.pathname = segments.join('/');
	return parsed.toString();
}

export function judgeRenameRecord(before, after, renames) {
	if (!isPlainObject(before) || !isPlainObject(after)) return refuse('source.json must be a JSON object before and after');
	if (!Array.isArray(renames) || renames.length === 0) return refuse('no owner rename is recorded');
	const beforeKeys = Object.keys(before).sort();
	const afterKeys = Object.keys(after).sort();
	if (beforeKeys.join('\n') !== afterKeys.join('\n')) return refuse('a rename record may not add or remove keys');
	for (const key of beforeKeys) {
		if (RECORDABLE.has(key)) continue;
		if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) return refuse(`a rename record may not change "${key}"`);
	}
	for (const key of RECORDABLE) {
		if (typeof before[key] !== 'string' || typeof after[key] !== 'string') return refuse(`"${key}" must be a string before and after`);
	}
	if (!SRI_SHA256.test(after.integrity)) return refuse('re-recorded integrity is not a sha256 SRI value');
	if (after.integrity === before.integrity) return refuse('integrity did not change, so there is nothing to re-record');
	if (after.url === before.url) return refuse('url did not change');
	const matches = renames.filter((rename) => {
		if (!isPlainObject(rename) || !OWNER.test(rename.from ?? '') || !OWNER.test(rename.to ?? '') || rename.from === rename.to) return false;
		const expectedUrl = rewriteOwner(before.url, rename.from, rename.to);
		if (expectedUrl === null || expectedUrl !== after.url) return false;
		const prefixOwner = rename.from + '-';
		if (!before.strip_prefix.startsWith(prefixOwner)) return false;
		return after.strip_prefix === rename.to + before.strip_prefix.slice(rename.from.length);
	});
	if (matches.length !== 1) return refuse('url and strip_prefix are not one recorded owner substitution');
	return { allowed: true, reason: `follows the recorded owner rename ${matches[0].from} to ${matches[0].to}` };
}

function refuse(reason) {
	return { allowed: false, reason };
}

function isPlainObject(value) {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function gitShow(revision, file) {
	return execFileSync('git', ['show', `${revision}:${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function main(argv) {
	const [base, file] = argv;
	if (!base || !file || path.basename(file) !== 'source.json') {
		process.stderr.write('usage: owner-rename-record.mjs <base-commit> modules/<name>/<version>/source.json\n');
		return 2;
	}
	let before;
	let after;
	let renames;
	try {
		before = JSON.parse(gitShow(base, file));
		after = JSON.parse(gitShow('HEAD', file));
		renames = JSON.parse(gitShow('HEAD', 'registry-owner-renames.json')).renames;
	} catch (error) {
		process.stderr.write(`owner-rename-record: cannot read ${file}: ${error.message.split('\n')[0]}\n`);
		return 2;
	}
	const verdict = judgeRenameRecord(before, after, renames);
	process.stdout.write(`owner-rename-record: ${file}: ${verdict.allowed ? 'allowed' : 'refused'}, ${verdict.reason}\n`);
	return verdict.allowed ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	process.exit(main(process.argv.slice(2)));
}
