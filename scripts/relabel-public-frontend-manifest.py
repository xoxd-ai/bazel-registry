#!/usr/bin/env python3
"""Stamp a plan's release tag onto a public frontend export manifest.

The site.scaffold export script labels every full export
`public-frontend-v0.1.1`, whatever the chrome version it packs. A later full
release (for example `public-frontend-v1.0.0`) therefore needs the label
replaced before `verify-public-frontend.py` compares the manifest with the
plan. The plan must name the label it expects in `export_tag`; anything else
is refused. Only the `tag` field changes: the archives, SHA256SUMS and the
other manifest fields stay byte-for-byte as exported and are still verified.
"""
import argparse
import json
from pathlib import Path


def relabel(manifest: dict, plan: dict) -> dict:
    expected = plan.get("export_tag", plan["tag"])
    if manifest["tag"] != expected:
        raise SystemExit(f"Export labelled {manifest['tag']!r}; plan expects {expected!r}")
    if expected == plan["tag"]:
        return manifest
    relabelled = dict(manifest, tag=plan["tag"], export_tag=expected)
    return relabelled


def self_test() -> None:
    plan = {"tag": "public-frontend-v1.0.0", "export_tag": "public-frontend-v0.1.1"}
    out = relabel({"tag": "public-frontend-v0.1.1", "artifacts": []}, plan)
    assert out["tag"] == "public-frontend-v1.0.0" and out["export_tag"] == "public-frontend-v0.1.1"
    assert relabel({"tag": "x"}, {"tag": "x"}) == {"tag": "x"}
    for manifest, bad_plan in [({"tag": "other"}, plan), ({"tag": "public-frontend-v0.1.1"}, {"tag": "public-frontend-v1.0.0"})]:
        try:
            relabel(manifest, bad_plan)
        except SystemExit:
            continue
        raise AssertionError(f"Admitted {manifest} for {bad_plan}")
    print("ok - relabel admits only the planned export label")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path)
    parser.add_argument("--plan", type=Path)
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not args.artifacts or not args.plan:
        parser.error("--artifacts and --plan are required")
    path = args.artifacts / "manifest.json"
    manifest = json.loads(path.read_text())
    relabelled = relabel(manifest, json.loads(args.plan.read_text()))
    if relabelled is not manifest:
        path.write_text(json.dumps(relabelled, indent=2) + "\n")
        print(f"Relabelled export {relabelled['export_tag']} as {relabelled['tag']}")


if __name__ == "__main__":
    main()
