Public frontend release 1.0.0 supplies `xoxd_public_chrome` 1.0.0, the
unchanged `xoxd_theme` 0.1.1 archive (byte-identical to public-frontend-v0.1.1)
and the site.scaffold public template 1.0.0. The source repositories remain
private.

`xoxd_public_chrome` 1.0.0 is a breaking release under RU1, RU5 and RU10: its
`svelte` peer is exact `5.57.2` (was `^5.56.8`), and the Skeleton peers stay
exact `5.0.1`. The component source is unchanged from 0.1.0. Consumers pin
`svelte` to `5.57.2` and move their `bazel_dep(name = "xoxd_public_chrome")` to
`1.0.0` once `modules/xoxd_public_chrome/1.0.0` is registered. The Bazel
`compatibility_level` stays 1. No npm package is published (RU6, RU8).

Template 1.0.0 moves to SvelteKit 3.0.1, Svelte 5.57.2, Vite 8.3.3 and
TypeScript 7.0.2 with the RU13 patch set, and supersedes template 0.1.1. It
still pins `xoxd_public_chrome` 0.1.0. A template-only 1.0.1 re-pins it to
1.0.0 after registration.

The scaffold export labels every full export `public-frontend-v0.1.1`; this
plan names that label in `export_tag`, and the workflow relabels the manifest
to this tag before verification. Archive bytes and SHA256SUMS are not touched.

The archives contain no agent directives, private CI, private documentation,
credentials, telemetry or application lifecycle. SHA256SUMS and manifest.json
record the exact archive bytes.
