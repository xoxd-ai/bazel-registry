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
- It is not a Bazel workspace. There is no root `MODULE.bazel`, `WORKSPACE`,
  `BUILD` or `.bazelrc`.
- The root `.bazelversion` is the estate Bazel version SSOT. It must match
  `package.json` `bazelEstate.version`.
- Consumers pin this registry to a 40-character commit SHA in their own
  `.bazelrc` and refresh `MODULE.bazel.lock` in the same commit. They never pin
  `main`.

## Hard rules

- **Shipped versions are immutable.** Never edit a file under an existing
  `modules/<name>/<version>/`. Publish a new version directory instead.
  `scripts/check-immutable-versions.sh` (the Immutability gate) enforces this.
- **Owner renames are the only exception.** They must follow
  `registry-owner-renames.json`, using the shape that
  `scripts/owner-rename-record.mjs` enforces.
- **Allowed source hosts.** A `source.json` URL must be one of:
  - a GitHub release or tag archive;
  - an `api.github.com/repos/<owner>/<repo>/tarball/<ref>` tarball for a
    private repo;
  - a versioned release asset of this repo.

  Never use npm or GitHub Packages registry hosts. Always use SRI
  `integrity`.
- **Main moves only through reviewed PRs.** Never push to `main` directly.
  Never force-push. Commits are signed.
- **No secrets in PRs.** Pull-request validation runs without credentials,
  and fork PRs get only the read token. The private-consumer smokes run only
  in the `trusted-private-consumers` job, on `main` push or dispatch. Never move
  a secret into a `pull_request` path. Never print token values.
- **Release publication needs an explicit operator go.** This covers the
  `Public frontend release` dispatch with `publish=true` and any GitHub
  release publication.

## Validation

- Local (offline, diagnostic only): `npm run validate`,
  `npm run test:validate-source-hosts` and `npm run test:owner-rename-record`.
- The authority is the remote `Validate registry` and `Immutability gate`
  workflows on the GloriousFlywheel `tinyland-nix` runners. Local runs do not
  replace them as landing proof.

## Coordination

- Contributors may open registration PRs from forks, such as the
  `bazel-registry-contrib` fork. PR validation is fork-safe by design (see
  `docs/agent-notes/2026-10-05-fork-safe-registry-validation.md`).
- Durable working notes go in `docs/agent-notes/`. Facts and receipts go on
  the owning Linear issue. Cite R-HOOK-CONVERGENCE-20261004 on mutation
  receipts.
