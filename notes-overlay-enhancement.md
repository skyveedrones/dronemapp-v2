# Overlay Enhancement Status

## Completed
- Rewrote MapboxProjectMap.tsx with all enhanced overlay controls
- Added renameOverlay endpoint to server/routers.ts
- Installed @turf/distance, @turf/area, @turf/helpers for measurement

## TS Errors
- 14 TS errors all in server/scripts/migrate-legacy-clients.ts (pre-existing, not related to our changes)
- No browser console errors related to our changes
- HMR update successful for MapboxProjectMap.tsx

## Features Added
1. Fullscreen map mode (button top-right + in sidebar)
2. Hide/Show Flight Path toggle
3. Measurement tool (distance + area, metric + imperial)
4. Overlay rename (inline edit with backend persistence)
5. Opacity slider (already existed, preserved)
6. Visibility toggle (already existed, preserved)
7. Lock overlay position
8. Fit to overlay bounds
9. Organized sidebar sections: Map Controls, Per-Overlay Controls, Alignment Tools, Danger Zone
10. Edit Alignment / 2-Point Snap / Reset / Delete (preserved)

## Still Need
- Write vitest test for renameOverlay endpoint
- Update todo.md
- Save checkpoint
