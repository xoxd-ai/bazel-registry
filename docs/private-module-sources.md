# Private module sources

Linear: TIN-8727. Measured on November 26, 2026.

This page says how a module whose source repository is private is listed
here, and what a consumer needs to fetch it. It changes no shipped entry.
Shipped versions stay immutable under the rule in [AGENTS.md](../AGENTS.md).

## Which sources are private

| Module | Source repository | Private since |
| --- | --- | --- |
| `tummycrypt_scheduling_bridge` | `xoxd-ai/scheduling-bridge` | Before this page |
| `tummycrypt_scheduling_kit` | `xoxd-ai/scheduling-kit` | November 26, 2026 |
| `tummycrypt_tinyland_business_pg` | `xoxd-ai/tinyland-business-pg` | November 26, 2026 |

## Shipped entries

Every shipped `tummycrypt_scheduling_bridge` entry from 0.7.2 up uses the API
tarball form. Every shipped `tummycrypt_scheduling_kit` and
`tummycrypt_tinyland_business_pg` entry uses the browser tag archive form,
`github.com/<owner>/<repo>/archive/refs/tags/<tag>.tar.gz`. Some older entries
name an earlier owner. GitHub redirects those to `xoxd-ai`.

What a fetch of a tag archive does now:

| Request | Answer |
| --- | --- |
| No credential | 404 |
| A personal access token with `repo` scope, sent to `github.com` | 302 to a `codeload.github.com` URL that carries its own signed token |
| That codeload URL, with no credential | 200 |

With the token, the bytes matched the recorded `integrity` for kit 0.11.1,
0.12.0 and 1.0.0 and for business_pg 0.1.1 and 1.0.0. The shipped entries
are still correct. They need a credential that `github.com` accepts.

The Validation section of the [README](../README.md) records that GitHub App
installation tokens cannot read browser archive URLs. This page did not test
an App token.

## How the next versions are listed

A new version of a module whose source is private uses the API tarball form
at a full commit:

```json
{
  "url": "https://api.github.com/repos/xoxd-ai/<repo>/tarball/<40-hex commit>",
  "strip_prefix": "xoxd-ai-<repo>-<40-hex commit>",
  "integrity": "sha256-<base64>",
  "archive_type": "tar.gz"
}
```

1. Use the full 40 character commit of the release tag, never the tag name.
2. Set `archive_type`, because the URL has no file extension.
3. The top directory of the archive is `<owner>-<repo>-<commit>`. Read it
   from the archive, then set `strip_prefix` to it.
4. Fetch the tarball twice and record the `integrity` only when both hashes
   match. The kit's 1.0.0 commit, `e439322375843aac69ff89c6c89dfe9240f3d11a`,
   gave the same hash on two fetches on November 26, 2026.

GitHub writes the owner and the repository name into that top directory. An
owner rename or a repository rename therefore changes the bytes behind a
shipped API tarball URL. Cut a version in this form after a planned rename has
landed, so its entry names the final repository. An owner rename is handled
through `registry-owner-renames.json`. That file has no rule for a repository
rename, so an entry cut before one would need a new version.

## What a consumer needs

For an entry in the API tarball form:

1. A Bazel credential helper registered for `api.github.com` and for
   `codeload.github.com`. Bazel asks the helper on each host it reaches.
2. The helper answers only for `xoxd-ai` repositories the token can read.
   A token sent with a request for a repository it cannot read turns even a
   public archive into a 404.
3. A GitHub App installation token with `contents: read`. Its
   `repositories:` list names every private source repository the build
   fetches, not only `scheduling-bridge`.

For a shipped entry in the tag archive form, a consumer has two choices.
It can move to a new version in the API tarball form once one is listed. Or
it can register a helper for `github.com` that sends a token GitHub accepts
there. That helper must also match the earlier owner paths that redirect.

## The registry's own checks

The `validate` job runs on pull requests without a private source token. Its
`smoke:scheduling-kit-only` step builds the newest kit entry from a tag
archive, so it now depends on the repository cache. The
`trusted-private-consumers` job mints a token for `scheduling-bridge` only.
Moving the kit step to that job, and adding the kit and business_pg
repositories to the token, needs a workflow change. That change is not part
of this page.
