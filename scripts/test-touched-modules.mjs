// Fixture-driven control for scripts/touched-modules.mjs (TIN-8910): the
// trusted consumer job must find every module a change touched and build the
// right targets for it. Plain node, no framework, matching this repo's
// scripts/*.mjs convention.
import assert from 'node:assert/strict';
import { consumerTargets, isAcceptedBase, resolveBase, touchedModuleNames } from './touched-modules.mjs';

assert.deepEqual(
	touchedModuleNames([
		'modules/tummycrypt_tinyland_caldav_client/1.0.3/MODULE.bazel',
		'modules/tummycrypt_tinyland_caldav_client/1.0.3/source.json',
		'modules/tummycrypt_tinyland_caldav_client/metadata.json',
		'modules/rules_tectonic/metadata.json',
		'scripts/validate-registry.mjs',
		'README.md',
		'modules/stray-file.json',
		'',
	]),
	['rules_tectonic', 'tummycrypt_tinyland_caldav_client'],
	'one name per touched module, sorted; paths outside a module directory name none',
);
assert.deepEqual(touchedModuleNames([]), [], 'an empty diff touches nothing');
assert.deepEqual(touchedModuleNames(['modules//metadata.json']), [], 'an empty segment names no module');

assert.deepEqual(
	consumerTargets('tummycrypt_tinyland_caldav_client'),
	{ targets: ['@tummycrypt_tinyland_caldav_client//:pkg'] },
	'a module with no override builds //:pkg',
);
assert.deepEqual(
	consumerTargets('rules_tectonic'),
	{ targets: ['@rules_tectonic//tectonic:all'] },
	'an override replaces //:pkg',
);
assert.deepEqual(
	consumerTargets('prompt_toon'),
	{ targets: ['@prompt_toon//:delegation_policy', '@prompt_toon//:skills'] },
	'an override may name several targets',
);

assert.equal(resolveBase(undefined), 'HEAD^1', 'no base falls back to the first parent');
assert.equal(resolveBase(''), 'HEAD^1', 'an empty base falls back to the first parent');
assert.equal(resolveBase('0'.repeat(40)), 'HEAD^1', 'the all-zero commit of a new branch falls back');
assert.equal(resolveBase('c16ae44'.padEnd(40, '0')), 'c16ae44'.padEnd(40, '0'), 'a given commit is kept');
assert.equal(isAcceptedBase(resolveBase('not a commit')), false, 'a malformed base still fails the check');

assert.equal(isAcceptedBase('HEAD^1'), true, 'the first parent is accepted');
assert.equal(isAcceptedBase('c16ae44'.padEnd(40, '0')), true, 'a 40-hex commit is accepted');
for (const refused of ['', 'main', 'c16ae44', '--output=x', 'HEAD~3', 'C16AE44'.padEnd(40, '0')]) {
	assert.equal(isAcceptedBase(refused), false, `${JSON.stringify(refused)} is refused`);
}

console.log('touched-modules: all controls passed');
