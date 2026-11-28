# AGENTS.md

Thin agent contract for `xoxd-ai/bazel-registry`, formerly
`tinyland-inc/bazel-registry`. GitHub redirects the old URL. Read
[README.md](./README.md) and
[docs/bazel-adoption-v0.md](./docs/bazel-adoption-v0.md) before changing
anything. When this file and those docs disagree, the docs win.

## What this repo is

- This repo is a static Bzlmod registry. It holds
  `modules/<name>/<version>/{MODULE.bazel,source.json}`, a `metadata.json` per
  module, `bazel_registry.json`, release plans under `releases/` and checks
  under `scripts/`.
- The root `MODULE.bazel`, `BUILD.bazel` and `.bazelrc` hold only this
  repo's checks, as Bazel tests that GloriousFlywheel runs (TIN-8469).
  Consumers never read them: they read `bazel_registry.json` and `modules/`
  at a pinned commit.
- The root `.bazelversion` is the estate Bazel version SSOT. It must match
  `package.json` `bazelEstate.version`.
- Consumers pin this registry to a 40-character commit SHA in their own
  `.bazelrc` and refresh `MODULE.bazel.lock` in the same commit. They never pin
  `main`.

## Hard rules

- **Shipped versions are immutable.** Never edit a file under an existing
  `modules/<name>/<version>/`. Publish a new version directory instead.
  `scripts/check-immutable-history.mjs` (the `immutability-gate` GF row)
  enforces this.
- **Owner renames are the only exception.** They must follow
  `registry-owner-renames.json`, using the shape that
  `scripts/owner-rename-record.mjs` enforces.
- **Allowed source hosts.** A `source.json` URL must be one of:
  - a GitHub release or tag archive;
  - an `api.github.com/repos/<owner>/<repo>/tarball/<ref>` tarball for a
    private repo;
  - a versioned release asset of this repo;
  - a `raw.githubusercontent.com/xoxd-ai/<repo>/<40-hex commit>/<path>.tar.gz`
    (or `.tar.xz`) blob of a public `xoxd-ai` repo, with one well-formed
    sha256 `integrity` (R581, Linear TIN-7477). Never a branch, tag or short
    commit.

  Never use npm or GitHub Packages registry hosts. Always use SRI
  `integrity`.
- **Main moves only through reviewed PRs.** Never push to `main` directly.
  Never force-push. Commits are signed.
- **No secrets in fork PRs.** The `validate` job runs without credentials,
  and fork PRs get only the read token. The private-consumer smokes run only
  in the `trusted-private-consumers` job: on a `main` push or dispatch, and on
  a pull request whose head branch lives in this repository (TIN-8910). That
  job never runs for a fork or a Dependabot PR. Never move a secret into any
  other `pull_request` path. Never print token values.
- **Release publication needs an explicit operator go.** This covers the
  `Public frontend release` dispatch with `publish=true` and any GitHub
  release publication.

## Validation

- GloriousFlywheel runs the `validate` and `immutability-gate` rows of
  `.github/lanes.json` for every pushed head and posts them as check runs of
  the `gf-xoxd-ai` App. `.github/rulesets/default-branch.json` requires both.
- A developer runs the same targets on GF: `gf-reapi-credhelper login
  https://gf.xoxd.ai` once, then `just check` and `just immutability-gate`.
  Both ask with `--config=gf`, so a result either asker got is stored for the
  other.
- A new version of `xoxd_public_chrome`, `xoxd_theme`, `rules_tectonic` or
  `prompt_toon` bumps its pin in the root `MODULE.bazel` and refreshes
  `MODULE.bazel.lock` in the same PR. `//:smoke_pins_test` fails otherwise.
- The private-consumer smokes stay in the `trusted-private-consumers` Actions
  job, because only Actions holds the registry-reader App key.
- That job also builds the newest listed caldav-client as an external module,
  and the newest listed version of every module the change touched, each in
  its own consumer (TIN-8910). A touched module builds `//:pkg` unless
  `scripts/touched-modules.mjs` names its consumer targets. A module with no
  consumer target must be listed there with a null target list and a reason.

## Coordination

- Contributors may open registration PRs from forks, such as the
  `bazel-registry-contrib` fork. PR validation is fork-safe by design (see
  `docs/agent-notes/2026-10-05-fork-safe-registry-validation.md`).
- Durable working notes go in `docs/agent-notes/`. Facts and receipts go on
  the owning Linear issue. Cite R-HOOK-CONVERGENCE-20261004 on mutation
  receipts.
