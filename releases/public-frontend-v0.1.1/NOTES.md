Public frontend release0.1.1 supplies narrowed MIT-licensed shared chrome,
xoxd_theme0.1.1 with its font OFL, and a static site.scaffold template with
the real Nix/Bazel/Just graph. The source repositories remain private.

The template and module archives contain no agent directives, private CI,
private documentation, credentials, telemetry, or application lifecycle.
Existing xoxd_theme0.1.0 remains unchanged.

Use xoxd_public_chrome0.1.0 and xoxd_theme0.1.1 through this registry and
npm_link_package; no npm registry or authentication is required. The template
pins registry commit6d008c192d1ef25f37e747fa1659109bcadb6666, and the public
firstparty graph pins a11y0.2.4, skeleton-colors0.2.4, color-utils0.2.3, and
tinyvectors0.3.7. SHA256SUMS and manifest.json record the exact archive bytes.

Validated: deterministic normalized archives and allowlisted contents;
Gitleaks scan found no leaks; theme4Bazeltests pass; generic template build
and typecheck pass using Bazel8.2.1, Node22, anonymous public source fetches,
and local overrides for these newly prepared modules. Verify published
asset downloads anonymously and rerun without overrides after publication.
