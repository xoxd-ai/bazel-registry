// Fixture-driven control for scripts/owner-rename-record.mjs: the one
// allowance in the immutability gate must admit exactly a recorded owner
// substitution and refuse every neighbouring edit. Plain node, no framework,
// matching this repo's scripts/*.mjs convention.
import assert from 'node:assert/strict';
import { judgeRenameRecord, rewriteOwner } from './owner-rename-record.mjs';

const renames = [{ from: 'tinyland-inc', to: 'xoxd-ai', recorded: '2026-09-21' }];
const sha = '623c0e2d04d67f396480227b0d8c95cb35280f6e';
const before = {
	url: `https://api.github.com/repos/tinyland-inc/tempo-store/tarball/${sha}`,
	strip_prefix: `tinyland-inc-tempo-store-${sha}`,
	integrity: 'sha256-7dIDHJky7DQeIl/6SXOJQcMcsQalGTaY+R3p1KShM9c=',
	archive_type: 'tar.gz',
};
const good = {
	url: `https://api.github.com/repos/xoxd-ai/tempo-store/tarball/${sha}`,
	strip_prefix: `xoxd-ai-tempo-store-${sha}`,
	integrity: 'sha256-FO7mxSOeA5qOMoYqIexM/uT8C82Ky+E9MCvllCBnKFE=',
	archive_type: 'tar.gz',
};

assert.equal(judgeRenameRecord(before, good, renames).allowed, true, 'the recorded substitution is allowed');

const refused = [
	['integrity unchanged', { ...good, integrity: before.integrity }],
	['integrity malformed', { ...good, integrity: 'sha256-short' }],
	['integrity not sha256', { ...good, integrity: 'sha512-' + 'A'.repeat(86) + '==' }],
	['url unchanged', { ...good, url: before.url }],
	['url to an unrecorded owner', { ...good, url: before.url.replace('tinyland-inc', 'someone-else') }],
	['url repo changed too', { ...good, url: good.url.replace('tempo-store', 'other-store') }],
	['url ref changed too', { ...good, url: good.url.replace(sha, 'a'.repeat(40)) }],
	['url host changed', { ...good, url: good.url.replace('api.github.com', 'api.github.com.evil.example') }],
	['url not https', { ...good, url: good.url.replace('https://', 'http://') }],
	['strip_prefix not rewritten', { ...good, strip_prefix: before.strip_prefix }],
	['strip_prefix rewritten wrongly', { ...good, strip_prefix: `xoxd-ai-other-${sha}` }],
	['archive_type changed', { ...good, archive_type: 'zip' }],
	['key added', { ...good, patches: [] }],
	['key removed', (() => { const copy = { ...good }; delete copy.archive_type; return copy; })()],
];
for (const [label, after] of refused) {
	const verdict = judgeRenameRecord(before, after, renames);
	assert.equal(verdict.allowed, false, `${label} must be refused`);
}
assert.equal(judgeRenameRecord(before, good, []).allowed, false, 'no recorded rename means no allowance');
assert.equal(judgeRenameRecord(before, good, [{ from: 'tinyland-inc', to: 'tinyland-inc' }]).allowed, false, 'a rename to itself is not a rename');
assert.equal(judgeRenameRecord(before, good, [{ from: '../x', to: 'xoxd-ai' }]).allowed, false, 'an unsafe owner is not a rename');
assert.equal(judgeRenameRecord(before, good, [...renames, { from: 'tinyland-inc', to: 'xoxd-ai' }]).allowed, false, 'a duplicated pair is ambiguous and refused');
assert.equal(judgeRenameRecord('not an object', good, renames).allowed, false, 'non-object before is refused');

const archiveBefore = {
	url: 'https://github.com/tinyland-inc/tinyvectors/archive/refs/tags/v0.4.0.tar.gz',
	strip_prefix: 'tinyvectors-0.4.0',
	integrity: 'sha256-' + 'B'.repeat(43) + '=',
};
const archiveAfter = { ...archiveBefore, url: archiveBefore.url.replace('tinyland-inc', 'xoxd-ai'), integrity: 'sha256-' + 'C'.repeat(43) + '=' };
assert.equal(judgeRenameRecord(archiveBefore, archiveAfter, renames).allowed, false, 'a tag archive carries no owner in its prefix, so its bytes did not change and it is not re-recordable');

assert.equal(rewriteOwner('https://api.github.com/repos/tinyland-inc/x/tarball/abc', 'tinyland-inc', 'xoxd-ai'), 'https://api.github.com/repos/xoxd-ai/x/tarball/abc');
assert.equal(rewriteOwner('https://github.com/tinyland-inc/x/archive/refs/tags/v1.tar.gz', 'tinyland-inc', 'xoxd-ai'), 'https://github.com/xoxd-ai/x/archive/refs/tags/v1.tar.gz');
assert.equal(rewriteOwner('https://api.github.com/repos/tinyland-inc/x/zipball/abc', 'tinyland-inc', 'xoxd-ai'), null);
assert.equal(rewriteOwner('https://example.com/repos/tinyland-inc/x/tarball/abc', 'tinyland-inc', 'xoxd-ai'), null);
assert.equal(rewriteOwner('not a url', 'tinyland-inc', 'xoxd-ai'), null);

process.stdout.write('owner-rename-record: 1 allowed shape, ' + (refused.length + 7) + ' refused shapes, 5 rewrite shapes, all as promised\n');
