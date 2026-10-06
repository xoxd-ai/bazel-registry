# Fork-safe registry validation

Authority: user-authorized DSA convergence; R-HOOK-CONVERGENCE-20261004,
TIN-3692 comment 98cf680c-7299-4949-bfb2-60079053ad43, R-N12 and R-N13.

Registry PR #126 failed before public/static validation because a fork PR has
no TINYLAND_REGISTRY_APP_ID secret. Public `validate` now performs static
registry contracts, source-host fixtures, owner-rename fixtures, and the public
scheduling-kit consumer without creating a GitHub App token. Checkout does not
persist credentials.

Private-source token scope and private consumer audits run as a separate job
only on `xoxd-ai/bazel-registry` main pushes or explicit main-ref workflow
dispatches, after public validation. No pull_request_target trigger and no
secret projection to forks are introduced. The immutable metadata commit
6d008c192d1ef25f37e747fa1659109bcadb6666 remains an ancestor.

Validation: Node static registry validator (190 entries), eight source-host
fixtures, owner-rename fixtures, YAML parse and event-guard inspection passed.
Private network audits are retained and require the trusted workflow context;
they were not represented as having run locally.
