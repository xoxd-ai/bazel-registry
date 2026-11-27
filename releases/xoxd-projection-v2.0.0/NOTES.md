xoxd_projection 2.0.0 is the consumer side of the xoxd-projection/v3 contract. It reads v3 only. It fetches from `/projection/v3/` and refuses a v2 head or manifest with `contract_mismatch`. It carries no v2 reader, no v2 fixtures and no switch between the two. It verifies a signed manifest against a pinned ed25519 key, recomputes each approval hash, checks every blob and fails the build on any mismatch. The archive is MIT licensed and built from site.scaffold commit 0cf0a19326f025904b4d2f68a1d822a913e7943b. The source repository remains private.

A consumer site on 1.0.0 must change these things:

- Pin `xoxd_projection` 2.0.0. Its `compatibility_level` is 2, so a graph cannot hold 1.x and 2.x at once.
- Declare a fourth `workflow_dispatch` input, `contract`, with `required: true` and `type: string`, beside `manifest`, `seq` and `projection_base`. Pass it to the fetcher as `--contract`, or to `fetchProjection` as `contract`. Any value but `xoxd-projection/v3` is refused before the first request.
- Start the v3 chain with a first build. A 1.0.0 receipt names a v2 `seq`, so the fetcher refuses it as the last build. Drop the old output directory and pass no v2 receipt to `--last-receipt`.
- Read the new post keys: `cover`, `heading` and `blocks`, and the `file`, `width` and `height` of each attachment ref. Each attachment is now a ref.
- Render the new blocks: `diagram`, `youtube`, `recording`, `photos` and `clip`, and a figure's `label` and `number`. Honour `cover.decorative` and `heading.until`.
- Serve each attachment with `attachmentHeaders`. It gives a diagram SVG its type, nosniff and a policy that runs nothing.
- Ask the operator to set `HUB_DISPATCH_<TARGET>_CONTRACT=v3` for the site's target once the site reads v3.

The archive contains no agent directives, private CI, private documentation, credentials or telemetry.

Use it through this registry: `bazel_dep(name = "xoxd_projection", version = "2.0.0")`. It supplies `@xoxd_projection//:pkg`, linked as `@xoxd/projection`, and the fetch tool `@xoxd_projection//:fetch`. No npm registry or authentication is needed. SHA256SUMS and manifest.json record the exact archive bytes: sha256 af5add47a40b9f48f314b4a80a8287b60ee4f7ddfeb2dc7f898ef1a7c3cd5bc5, 129 files.

Validated: deterministic normalized archive. The registry verifier and its admission fixtures pass. Verify the published asset downloads anonymously after publication.
