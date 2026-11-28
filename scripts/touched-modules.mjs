// Which modules a change touched, and which targets prove each one builds as
// an external module (TIN-8910). The trusted consumer job builds the newest
// listed version of every module a pull request or a push touches, so a
// listing that does not build fails before it reaches main.
//
// Pure functions only: no Git, no Bazel and no file reads, so
// scripts/test-touched-modules.mjs can check them against fixed inputs.

// Consumer targets for a module whose package is not //:pkg. A module that
// has no consumer target at all may be listed with a null target list and a
// reason; the job then reports it as not built instead of failing.
export const CONSUMER_TARGET_OVERRIDES = {
	// The root, docs and tests packages load dev-only dependencies.
	rules_tectonic: { targets: ['//tectonic:all'] },
	// A data-only module: its consumer surface is two filegroups.
	prompt_toon: { targets: ['//:delegation_policy', '//:skills'] },
};

// The diff base for a run: the given commit, or the first parent of HEAD when
// none is given. A push that created the branch reports an all-zero commit,
// which names no commit, so it falls back to the first parent too.
export function resolveBase(given) {
	if (!given || /^0+$/.test(given)) {
		return 'HEAD^1';
	}
	return given;
}

// A 40-hex commit or the first parent of HEAD. Anything else is refused, so
// the base never reaches git as an option or a revision expression.
export function isAcceptedBase(base) {
	return base === 'HEAD^1' || /^[0-9a-f]{40}$/.test(base);
}

// Module names from `git diff --name-only` output: the second segment of every
// path under modules/. A file directly under modules/ names no module.
export function touchedModuleNames(diffPaths) {
	const names = new Set();
	for (const line of diffPaths) {
		const parts = line.trim().split('/');
		if (parts.length >= 3 && parts[0] === 'modules' && parts[1] !== '') {
			names.add(parts[1]);
		}
	}
	return [...names].sort();
}

// The labels to build for one module, or null with a reason when the module
// declares no consumer target.
export function consumerTargets(moduleName) {
	const override = CONSUMER_TARGET_OVERRIDES[moduleName];
	if (override && override.targets === null) {
		return { targets: null, reason: override.reason };
	}
	const packages = override ? override.targets : ['//:pkg'];
	return { targets: packages.map((label) => `@${moduleName}${label}`) };
}
