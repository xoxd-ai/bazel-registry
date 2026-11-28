import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

import { consumerTargets, isAcceptedBase, resolveBase, touchedModuleNames } from './touched-modules.mjs';

const root = process.cwd();

// Bazel's order for release identifiers: numeric parts compare as numbers and
// sort before alphanumeric parts, alphanumeric parts compare as strings, and a
// version that is a prefix of another sorts first. So 0.12.0 < 0.12.0.bcr.1 <
// 0.12.1, the re-listing convention of the Bazel Central Registry (TIN-8727).
function compareIdentifiers(left, right) {
    const leftNumeric = /^[0-9]+$/.test(left);
    const rightNumeric = /^[0-9]+$/.test(right);
    if (leftNumeric && rightNumeric) {
        return Number(left) - Number(right);
    }
    if (leftNumeric !== rightNumeric) {
        return leftNumeric ? -1 : 1;
    }
    return left < right ? -1 : left > right ? 1 : 0;
}

function compareVersions(left, right) {
    const leftParts = left.split('.');
    const rightParts = right.split('.');
    for (let index = 0; index < Math.min(leftParts.length, rightParts.length); index += 1) {
        const delta = compareIdentifiers(leftParts[index], rightParts[index]);
        if (delta !== 0) {
            return delta;
        }
    }
    return leftParts.length - rightParts.length;
}

function latestPublishedVersion(moduleName) {
    const metadataPath = path.join(root, 'modules', moduleName, 'metadata.json');
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const yankedVersions = new Set(Object.keys(metadata.yanked_versions ?? {}));
    const versions = (metadata.versions ?? [])
        .filter((version) => !yankedVersions.has(version))
        .sort(compareVersions);
    const version = versions.at(-1);
    if (!version) {
        throw new Error(`${moduleName} has no active published version`);
    }
    return version;
}

function declaredDependencyVersion(moduleName, version, dependencyName) {
    const modulePath = path.join(root, 'modules', moduleName, version, 'MODULE.bazel');
    const moduleText = fs.readFileSync(modulePath, 'utf8');
    const escapedName = dependencyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const dependency = moduleText.match(
        new RegExp(
            `bazel_dep\\(\\s*name\\s*=\\s*"${escapedName}"\\s*,\\s*version\\s*=\\s*"([^"]+)"\\s*\\)`,
        ),
    );
    if (!dependency) {
        throw new Error(`${moduleName}@${version} does not declare ${dependencyName}`);
    }
    return dependency[1];
}

function schedulingKitScenario() {
    const version = latestPublishedVersion('tummycrypt_scheduling_kit');
    return {
        key: 'scheduling-kit-only',
        workspaceName: 'tinyland_registry_scheduling_kit_only_smoke',
        modules: [{ moduleName: 'tummycrypt_scheduling_kit', version }],
        targets: ['@tummycrypt_scheduling_kit//:pkg'],
        graphExpectation: { moduleName: 'tummycrypt_scheduling_kit', version },
        // xoxd-ai/scheduling-kit is private since November 26, 2026 (TIN-8727),
        // so this scenario runs only in the trusted job with the App token.
        requiresPrivateArchiveAuth: true,
        successLabel: `Built isolated scheduling-kit consumer target (${version})`,
    };
}

function schedulingBridgeScenario() {
    const version = latestPublishedVersion('tummycrypt_scheduling_bridge');
    const kitVersion = declaredDependencyVersion(
        'tummycrypt_scheduling_bridge',
        version,
        'tummycrypt_scheduling_kit',
    );
    return {
        key: 'scheduling-bridge-only',
        workspaceName: 'tinyland_registry_scheduling_bridge_only_smoke',
        modules: [{ moduleName: 'tummycrypt_scheduling_bridge', version }],
        targets: ['@tummycrypt_scheduling_bridge//:pkg'],
        graphExpectation: { moduleName: 'tummycrypt_scheduling_kit', version: kitVersion },
        requiresPrivateArchiveAuth: true,
        successLabel: `Built isolated scheduling-bridge consumer target (${version} -> scheduling-kit ${kitVersion})`,
    };
}

function tempoStoreScenario() {
    const version = latestPublishedVersion('tinyland_tempo_store');
    return {
        key: 'tempo-store-only',
        workspaceName: 'tinyland_registry_tempo_store_only_smoke',
        modules: [{ moduleName: 'tinyland_tempo_store', version }],
        targets: ['@tinyland_tempo_store//:pkg'],
        requiresPrivateArchiveAuth: true,
        successLabel: `Built isolated tempo-store consumer target (${version})`,
    };
}

// Public frontend modules whose archives are public release assets on this
// repository (public-frontend-v* releases). No token is needed or used, so
// this scenario runs on pull requests as well as in the trusted job.
function publicFrontendScenario() {
    const chromeVersion = latestPublishedVersion('xoxd_public_chrome');
    const themeVersion = latestPublishedVersion('xoxd_theme');
    return {
        key: 'public-frontend-only',
        workspaceName: 'tinyland_registry_public_frontend_only_smoke',
        modules: [
            { moduleName: 'xoxd_public_chrome', version: chromeVersion },
            { moduleName: 'xoxd_theme', version: themeVersion },
        ],
        targets: ['@xoxd_public_chrome//:pkg', '@xoxd_theme//:pkg'],
        graphExpectation: { moduleName: 'xoxd_theme', version: themeVersion },
        requiresPrivateArchiveAuth: false,
        tokenFree: true,
        successLabel: `Built token-free public frontend consumer targets (chrome ${chromeVersion}, theme ${themeVersion})`,
    };
}

// rules_tectonic: public GitHub tag archive, token-free. Builds the public
// //tectonic package (rules and toolchain declarations) under the estate
// Bazel; the root, docs and tests packages load dev-only dependencies and are
// not part of the consumer surface.
function rulesTectonicScenario() {
    const version = latestPublishedVersion('rules_tectonic');
    return {
        key: 'rules-tectonic-only',
        workspaceName: 'tinyland_registry_rules_tectonic_only_smoke',
        modules: [{ moduleName: 'rules_tectonic', version }],
        targets: ['@rules_tectonic//tectonic:all'],
        graphExpectation: { moduleName: 'rules_tectonic', version },
        requiresPrivateArchiveAuth: false,
        tokenFree: true,
        successLabel: `Built token-free rules_tectonic consumer targets (${version})`,
    };
}

// prompt_toon: public GitHub tag archive, token-free. It is a data-only
// module: the consumer surface is the policy and skill filegroups at the
// root package. The Chapel toolchains are dev dependencies, so a consumer
// never registers them and never needs chpl.
function promptToonScenario() {
    const version = latestPublishedVersion('prompt_toon');
    return {
        key: 'prompt-toon-only',
        workspaceName: 'tinyland_registry_prompt_toon_only_smoke',
        modules: [{ moduleName: 'prompt_toon', version }],
        targets: ['@prompt_toon//:delegation_policy', '@prompt_toon//:skills'],
        graphExpectation: { moduleName: 'prompt_toon', version },
        requiresPrivateArchiveAuth: false,
        tokenFree: true,
        successLabel: `Built token-free prompt_toon consumer targets (${version})`,
    };
}

// caldav-client: a public GitHub tag archive, token-free. It builds //:pkg as
// an external module, the way the module's own consumer workspace does, so a
// new listing that does not build fails here (TIN-8910).
function caldavClientScenario() {
    const version = latestPublishedVersion('tummycrypt_tinyland_caldav_client');
    return {
        key: 'caldav-client-only',
        workspaceName: 'tinyland_registry_caldav_client_only_smoke',
        modules: [{ moduleName: 'tummycrypt_tinyland_caldav_client', version }],
        targets: ['@tummycrypt_tinyland_caldav_client//:pkg'],
        graphExpectation: { moduleName: 'tummycrypt_tinyland_caldav_client', version },
        requiresPrivateArchiveAuth: false,
        tokenFree: true,
        successLabel: `Built token-free caldav-client consumer target (${version})`,
    };
}

// True when a listed version's archive is an api.github.com tarball, the
// shape this registry allows only for a private repository.
function hasPrivateSource(moduleName, version) {
    const sourcePath = path.join(root, 'modules', moduleName, version, 'source.json');
    const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    return new URL(source.url).hostname === 'api.github.com';
}

// One isolated consumer per module the change touched, each building the
// newest listed version (TIN-8910). The base is SMOKE_TOUCHED_BASE, a 40-hex
// commit, or else the first parent of HEAD: the base branch tip for a pull
// request merge commit and the previous main for a merge on main. See
// resolveBase in scripts/touched-modules.mjs.
function touchedModuleScenarios() {
    const base = resolveBase(process.env.SMOKE_TOUCHED_BASE);
    if (!isAcceptedBase(base)) {
        throw new Error(`SMOKE_TOUCHED_BASE must be a 40-hex commit; got ${JSON.stringify(base)}`);
    }
    const diff = spawnSync('git', ['diff', '--name-only', '--no-renames', base, 'HEAD', '--', 'modules'], {
        cwd: root,
        encoding: 'utf8',
    });
    if (diff.error || diff.status !== 0) {
        throw new Error(`git diff against ${base} failed: ${diff.error?.message ?? diff.stderr}`);
    }
    const names = touchedModuleNames(diff.stdout.split('\n'));
    console.log(`Modules touched since ${base}: ${names.join(', ') || 'none'}`);

    const scenarios = [];
    for (const moduleName of names) {
        if (!fs.existsSync(path.join(root, 'modules', moduleName, 'metadata.json'))) {
            throw new Error(`${moduleName} was touched but has no metadata.json at HEAD`);
        }
        const metadata = JSON.parse(fs.readFileSync(path.join(root, 'modules', moduleName, 'metadata.json'), 'utf8'));
        const yanked = new Set(Object.keys(metadata.yanked_versions ?? {}));
        if (!(metadata.versions ?? []).some((version) => !yanked.has(version))) {
            console.log(`Not built: ${moduleName} has no active listed version.`);
            continue;
        }
        const version = latestPublishedVersion(moduleName);
        const { targets, reason } = consumerTargets(moduleName);
        if (targets === null) {
            console.log(`Not built: ${moduleName} ${version} declares no consumer target (${reason}).`);
            continue;
        }
        scenarios.push({
            key: `touched:${moduleName}`,
            workspaceName: 'tinyland_registry_touched_module_smoke',
            modules: [{ moduleName, version }],
            targets,
            graphExpectation: { moduleName, version },
            requiresPrivateArchiveAuth: hasPrivateSource(moduleName, version),
            successLabel: `Built the newest listed version of touched module ${moduleName} (${version})`,
        });
    }
    return scenarios;
}
const scenarioFactories = {
    stage1: () => ({
        key: 'stage1',
        workspaceName: 'tinyland_registry_stage1_consumer_smoke',
        modules: [
            { moduleName: 'tummycrypt_tinyland_auth', version: '0.3.0' },
            { moduleName: 'tummycrypt_tinyland_auth_pg', version: '0.2.4' },
            { moduleName: 'tummycrypt_tinyland_auth_redis', version: '0.1.3' },
            { moduleName: 'tummycrypt_tinyland_security', version: '0.3.2' },
            { moduleName: 'tummycrypt_tinyland_rate_limit', version: '0.3.0' },
        ],
        targets: [
            '@tummycrypt_tinyland_auth//:pkg',
            '@tummycrypt_tinyland_auth_pg//:pkg',
            '@tummycrypt_tinyland_auth_redis//:pkg',
            '@tummycrypt_tinyland_security//:pkg',
            '@tummycrypt_tinyland_rate_limit//:pkg',
        ],
        requiresPrivateArchiveAuth: true,
        successLabel: 'Built Stage 1 consumer targets',
    }),
    'scheduling-kit-only': schedulingKitScenario,
    'scheduling-bridge-only': schedulingBridgeScenario,
    'tempo-store-only': tempoStoreScenario,
    'public-frontend-only': publicFrontendScenario,
    'rules-tectonic-only': rulesTectonicScenario,
    'prompt-toon-only': promptToonScenario,
    'caldav-client-only': caldavClientScenario,
    // Not a fixed scenario: one consumer per module the change touched.
    touched: touchedModuleScenarios,
};

const scenarioArgument = process.argv.find((argument) => argument.startsWith('--scenario='));
const scenarioName = scenarioArgument?.slice('--scenario='.length) || 'stage1';
const scenarioFactory = scenarioFactories[scenarioName];
if (!scenarioFactory) {
    console.error(`Unknown consumer smoke scenario: ${scenarioName}`);
    process.exit(2);
}
// A factory returns one scenario, or a list for the touched-module mode.
const scenarios = [scenarioFactory()].flat();

const registryToken = process.env.TINYLAND_REGISTRY_GITHUB_TOKEN;
const githubToken = registryToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

function credentialFailure(scenario) {
    if (scenario.requiresPrivateArchiveAuth && process.env.CI && !registryToken) {
        return `${scenario.key} requires TINYLAND_REGISTRY_GITHUB_TOKEN in CI; private archive proof cannot skip or fall back to the repository-scoped GITHUB_TOKEN.`;
    }
    if (scenario.requiresPrivateArchiveAuth && !githubToken) {
        return `${scenario.key} requires GitHub credentials for private module archives.`;
    }
    return undefined;
}

function writeGitHubCredentialHelper(scenario, smokeDir) {
    // A token-free scenario proves the public path: never attach credentials,
    // even when a token happens to be in the environment.
    if (scenario.tokenFree || !githubToken) {
        return [];
    }

    const helperPath = path.join(smokeDir, 'github-credential-helper.mjs');
    fs.writeFileSync(
        helperPath,
        `#!/usr/bin/env node
const token = process.env.TINYLAND_REGISTRY_GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!token) process.exit(1);
process.stdout.write(JSON.stringify({
  headers: {
    Authorization: [\`Bearer \${token}\`],
    Accept: ['application/vnd.github+json'],
  },
}));
`,
        { mode: 0o700 },
    );

    return [
        `--credential_helper=api.github.com=${helperPath}`,
    ];
}

// Startup options for every Bazel call in the temporary workspace. The idle
// limit bounds the server if this process dies before the shutdown in the
// finally block runs (TIN-5770 R470).
const bazelStartupArgs = ['--ignore_all_rc_files', '--max_idle_secs=120'];

// Find the launcher on PATH without running it. `bazel version` starts a
// Bazel JVM on every run (batch mode outside a workspace, a server under one).
// A PATH lookup runs nothing (TIN-5770 R472).
function isOnPath(command) {
    for (const dir of (process.env.PATH ?? '').split(path.delimiter)) {
        if (!dir) {
            continue;
        }
        const candidate = path.join(dir, command);
        try {
            fs.accessSync(candidate, fs.constants.X_OK);
            if (fs.statSync(candidate).isFile()) {
                return true;
            }
        } catch {
            // Not in this PATH entry.
        }
    }
    return false;
}

function resolveBazelCommand() {
    for (const command of ['bazelisk', 'bazel']) {
        if (isOnPath(command)) {
            return { command, prefixArgs: [] };
        }
    }

    return { command: 'npx', prefixArgs: ['--yes', '@bazel/bazelisk'] };
}

// Build one scenario in its own temporary workspace and Bazel server.
function runScenario(scenario) {
    const smokeDir = fs.mkdtempSync(path.join(os.tmpdir(), `${scenario.workspaceName}-`));
    let exitCode = 0;
    let bazel;
    try {
        const credentialHelperArgs = writeGitHubCredentialHelper(scenario, smokeDir);
        bazel = resolveBazelCommand();
        const moduleBazel = [
            `module(name = "${scenario.workspaceName}", version = "0.0.0")`,
            ...scenario.modules.map(
                ({ moduleName, version }) => `bazel_dep(name = "${moduleName}", version = "${version}")`,
            ),
            '',
        ].join('\n');
        fs.writeFileSync(path.join(smokeDir, 'MODULE.bazel'), moduleBazel);
        fs.writeFileSync(path.join(smokeDir, '.bazelversion'), fs.readFileSync(path.join(root, '.bazelversion')));

        if (scenario.graphExpectation) {
            const graphResult = spawnSync(
                bazel.command,
                [
                    ...bazel.prefixArgs,
                    ...bazelStartupArgs,
                    'mod',
                    'graph',
                    '--output=text',
                    '--charset=ascii',
                    '--verbose=false',
                    '--include_unused=false',
                    ...credentialHelperArgs,
                    '--enable_bzlmod',
                    '--lockfile_mode=off',
                    `--registry=file://${root}`,
                    '--registry=https://bcr.bazel.build',
                ],
                {
                    cwd: smokeDir,
                    encoding: 'utf8',
                },
            );

            process.stdout.write(graphResult.stdout ?? '');
            process.stderr.write(graphResult.stderr ?? '');
            if (graphResult.error) {
                console.error('Failed to spawn bazel mod graph:', graphResult.error.message);
                exitCode = 1;
            } else if (graphResult.status !== 0) {
                exitCode = graphResult.status ?? 1;
            } else {
                const expected = `${scenario.graphExpectation.moduleName}@${scenario.graphExpectation.version}`;
                const escapedModuleName = scenario.graphExpectation.moduleName.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&',
                );
                const selectedVersions = new Set(
                    [...(graphResult.stdout ?? '').matchAll(new RegExp(`${escapedModuleName}@([0-9A-Za-z.+_-]+)`, 'g'))]
                        .map((match) => match[1]),
                );
                if (selectedVersions.size !== 1 || !selectedVersions.has(scenario.graphExpectation.version)) {
                    console.error(
                        `Isolated graph selected ${scenario.graphExpectation.moduleName}@${[...selectedVersions].join(',') || '<missing>'}; expected the published edge ${expected}.`,
                    );
                    exitCode = 1;
                } else {
                    console.log(`Isolated graph selected ${expected}.`);
                }
            }
        }

        const result = exitCode === 0 ? spawnSync(
            bazel.command,
            [
                ...bazel.prefixArgs,
                ...bazelStartupArgs,
                'build',
                ...scenario.targets,
                ...credentialHelperArgs,
                '--enable_bzlmod',
                '--lockfile_mode=off',
                `--registry=file://${root}`,
                '--registry=https://bcr.bazel.build',
            ],
            {
                cwd: smokeDir,
                encoding: 'utf8',
                stdio: 'inherit',
            },
        ) : undefined;

        if (result?.error) {
            console.error('Failed to spawn bazel:', result.error.message);
            exitCode = 1;
        } else if (result && result.status !== 0) {
            exitCode = result.status ?? 1;
        }

        if (exitCode === 0) {
            console.log(`${scenario.successLabel}: ${scenario.targets.join(', ')}`);
        }
    } finally {
        // Stop this workspace's server before its directory goes away. A failed
        // shutdown does not change the result: the idle limit still applies.
        if (bazel) {
            spawnSync(bazel.command, [...bazel.prefixArgs, ...bazelStartupArgs, 'shutdown'], {
                cwd: smokeDir,
                stdio: 'ignore',
            });
        }
        fs.rmSync(smokeDir, { recursive: true, force: true });
    }
    return exitCode;
}

if (scenarios.length === 0) {
    console.log(`${scenarioName}: no consumer to build.`);
}
let exitCode = 0;
const failed = [];
for (const scenario of scenarios) {
    const failure = credentialFailure(scenario);
    if (failure) {
        console.error(failure);
    }
    const code = failure ? 1 : runScenario(scenario);
    if (code !== 0) {
        failed.push(scenario.key);
        exitCode = exitCode || code;
    }
}
if (failed.length > 0) {
    console.error(`Consumer smoke failed: ${failed.join(', ')}`);
}

process.exit(exitCode);
