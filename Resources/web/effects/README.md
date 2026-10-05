# Onboarding effects

Local WebView bundle, generated from `scripts/artwork/onboarding-effects.jsx`.

- metal-fx 2.0.10 — https://github.com/Jakubantalik/metal-fx
- border-beam 1.3.0 — https://github.com/Jakubantalik/border-beam
- React / React DOM 18.3.1; scheduler 0.23.2.

Upstream licenses and the Paper Shaders NOTICE are included in this directory.
The upstream integration adjustment assigns nonce `oracle-onboarding-effects`
to dynamically inserted metal-fx style elements and the BorderBeam style element. The app CSP permits
that nonce; scripts and network permissions remain unchanged. React updates style
properties directly; no remote resources are loaded by these effects.

This bundle is a UI dependency, not a native Oracle build. The V2 controller in
`Resources/web/onboarding-v2.js` receives the same native onboarding bridge methods
as V2, and consumes `installationProgress` receipts. The isolated preview supplies
synthetic receipts and never installs a Second Brain or validates a real license.

Dependency versions are recorded in `scripts/artwork/onboarding-effects.package.json`.
Bundle the JSX as an IIFE for the browser with `process.env.NODE_ENV="production"`.
Use an isolated dependency folder, not the worktree's shared `node_modules` symlink.
The app loads the CSS, effect bundle and V2 controller. Existing incomplete
legacy plans retain their original recovery controller and consent requirements. Nothing here grants or bypasses a native license.

After generating the pinned bundle, run `node scripts/artwork/patch-metal-context.mjs`.
This guards WebGL context callbacks by the originating context: a delayed loss event
from a disposed button must not stop the new button mounted by the next step.
The patch fails if the reviewed handler shape changes.
