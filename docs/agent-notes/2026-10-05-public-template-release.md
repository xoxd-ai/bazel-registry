# Standalone public template release

Authority: user-approved DSA convergence, R-HOOK-CONVERGENCE-20261004,
TIN-3692 comment 98cf680c-7299-4949-bfb2-60079053ad43, R-N12/R-N13.

The existing frontend release lane gains a standalone immutable template
revision rather than replacing previously published assets. The committed
site-scaffold-public-v0.1.1 plan contains exactly one archive and explicitly
supersedes only template 0.1.0. Chrome 0.1.0, theme 0.1.1 and registry metadata
6d008c192d1ef25f37e747fa1659109bcadb6666 remain unchanged.

Source pin 3e46b9ede560cddbbfa91eb0157f09b89319c648 is signed and retained as
an ancestor by source PR199's regular merge. Its exact re-export matches the
35-file candidate SHA256
9d834297fbd8103f30758ac58364c59ba628c8b09d6114b093cc68d5a5acf9a4.
The existing theme source pin remains 6c2e81a57dc0a71d5fff209b728309492222e50a.

Preparation and publication require the canonical registry main branch.
Only the existing source read token, scoped to site.scaffold/xoxd-theme, is
used for extraction. The template-only flag emits no duplicate chrome/theme
assets. Publication re-verifies the exact committed archive set and refuses
an existing release tag. The old release remains reproducible from its
original source pins. No fork PR secret projection or additional source/
runtime credential scope is introduced.

Validation: 191 static registry entries; all eight source-host fixtures;
owner-rename shape/rewrite fixtures; exact old three-asset and new one-asset
archive/manifest/SHA256SUMS verification. Both plans pass eight isolated
negative admission cases: altered bytes, extra archive, manifest mismatch,
agent directive file, path traversal, absolute path, symlink and duplicate
member path. Unsafe-member fixtures update their own checksums/manifest so
rejection exercises archive admission rather than only checksum failure.
YAML parses and canonical-main, narrow read-token, immutable-publish and
finite admission-fixture guards pass. No hosted source gate is claimed.

The exact public template archive's own Nix/Just setup/check/build and live/
static-preview browser proofs were completed in the source contribution.
LICENSE, NOTICE, fonts OFL and gitleaks checks pass; no agent/private-doc/CI/
credential content is exported. Source repositories stay private. Root owns
registry PR review, merge and release publication after this signed handoff.

Workflow follow-up: run 37400341493 on registry 311272c successfully minted
the source-only App token, read both sources, exported deterministic bytes and
passed exact verification/admission fixtures. Its upload-artifact step then
failed because Actions storage quota was full; publication was skipped.
https://github.com/xoxd-ai/bazel-registry/actions/runs/37400341493

The existing dispatch lane now builds, audits and optionally publishes in one
canonical-main job/workspace. No upload/download transfer or second build is
needed. With publish=false, it emits only the audited manifest/checksum summary
and logs. Root permissions remain contents:read; the selected release job has
explicit contents:write for the existing conditional gh release step. The
source App scope stays read-only on the same two repositories. Publish=true
re-verifies those same files immediately before refusing an existing tag or
creating the new immutable release. No other stream's artifacts are deleted,
no token scope or manual publication wrapper is added, and frozen archive
bytes remain unchanged.

Follow-up checks pass: parsed workflow has one job, dispatch-only/canonical
main boundary, root read/job write permissions, exactly two read-only source
repositories, no artifact transfer or duplicate exporter, audit summary, and
adjacent conditional verification/publication steps. Every run block passes
Bash syntax validation. The exact 9d8342 archive verifies and all eight
negative admission fixtures pass; source tests are unchanged and not repeated.

Pinned publisher follow-up: run 37401186974 passed the same source/export/
audit/re-verification path but the runner had no gh command. The old release
view condition suppressed that error and reached create before failing 127.
https://github.com/xoxd-ai/bazel-registry/actions/runs/37401186974

Publication now acquires only gh from the pinned public-template nixpkgs input
of the already checked-out scaffold source, with lock updates disabled. The
qualified command supplies gh 2.91.0 from Nix. No new flake, publisher wrapper,
runtime credential, or source scope is needed. A successful paginated read of
the current repository's release tags is required before checking absence;
query/tool/auth/network failures abort. Existing tags still refuse publication.
The immutable create command and same-workspace asset verification remain.
Nix inputs-from and gh API pagination semantics follow official documentation:
https://nix.dev/manual/nix/2.19/command-ref/new-cli/nix3-shell
https://cli.github.com/manual/gh_api

Targeted qualification: the actual pinned command resolves gh to its Nix
store path, preserves the publication environment and successfully performs
the paginated read-only release query. Four fixtures execute the workflow's
actual inline shell with a mock gh: tool failure, API failure and existing tag
all prevent create; absent tag supplies only the expected exact asset arguments.
The fixture never performs real API writes. Main/permission/source-token/
same-workspace boundaries, Bash syntax and frozen-archive verification pass.
