# Dice Box Integration

The 3D dice animations rely on the [`@3d-dice/dice-box`](https://www.npmjs.com/package/@3d-dice/dice-box)
project. The application tries to load the ESM build from jsDelivr, but you can
override both the module URL and asset path when hosting the files yourself.

## Runtime configuration

`DiceBoxCanvas` checks the following values (in order) when choosing a module
source and asset path:

1. `REACT_APP_DICE_BOX_MODULE_URL` / `REACT_APP_DICE_BOX_ASSET_PATH`
   environment variables (evaluated at build time by CRA).
2. `window.__DICE_BOX_MODULE_URL__` / `window.__DICE_BOX_ASSET_PATH__`
   values assigned before React mounts.
3. The jsDelivr defaults (`https://cdn.jsdelivr.net/npm/@3d-dice/dice-box@1/...`).

If you load the UMD bundle manually (for example by adding
`<script src="/assets/dice-box/dice-box.umd.min.js"></script>` to
`public/index.html`), `DiceBoxCanvas` will detect the global `window.DiceBox`
constructor and skip the dynamic import entirely.

## Self-hosting helper script

The `scripts` folder contains `download-dice-box-assets.mjs`, a small utility
that downloads the published assets and places them under
`client/public/assets/dice-box`. Run it whenever you bump the Dice Box version:

```bash
node scripts/download-dice-box-assets.mjs
```

After the assets are available locally you can point the runtime at them by
setting

```bash
REACT_APP_DICE_BOX_MODULE_URL=/assets/dice-box/dice-box.esm.min.js
REACT_APP_DICE_BOX_ASSET_PATH=/assets/dice-box/
```

The same values can be assigned through `window.__DICE_BOX_MODULE_URL__` and
`window.__DICE_BOX_ASSET_PATH__` if you prefer not to rebuild the client.
