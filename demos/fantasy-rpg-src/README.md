# fantasy-rpg-src

Canonical, version-controlled **source** for the factory-built Fantasy RPG
(Phaser 3 + Vite + TypeScript). Live demo:
<https://timetobuildbob.github.io/demos/fantasy-rpg/>.

This directory is the source of truth. The sibling `../fantasy-rpg/` holds the
**built bundle** that Jekyll publishes. Before this existed, the source lived
only in ephemeral `/tmp/factory/fantasy-rpg-phaser-v1/app/` — a `/tmp` clear
would have lost all `.ts` source, leaving only un-maintainable minified JS.
See ErikBjare/bob#801 and #804 (factory-output canonical-home drift).

## Build & deploy

```bash
./build-deploy.sh build    # npm ci (if needed) + vitest + vite build -> ./dist
./build-deploy.sh deploy   # build, then rsync ./dist -> ../fantasy-rpg/
```

`deploy` takes a `coordination work-claim` on `game:fantasy-rpg:deploy` so
concurrent sessions cannot race on the shared website tree (the bf03
deploy-collision failure mode). It writes the bundle but does **not** commit —
review and commit `demos/fantasy-rpg/` to publish.

This directory is excluded from the Jekyll build (`_config.yml`), so the raw
source and `node_modules` are never published; only the built `../fantasy-rpg/`
bundle is.

## Notes

- The currently-deployed bundle may predate this snapshot. Run
  `./build-deploy.sh deploy` after reviewing the diff to resync the live site.
- `.factory-run/` holds the original factory cell outputs as provenance.
