# Version Management System

This document explains how the automated version management system works to prevent stale version.json files from being deployed.

## Problem

Previously, the published site would sometimes show an old version number (e.g., v1.0.8) even after publishing a new checkpoint. This happened because:

1. The `version.json` file wasn't being regenerated during builds
2. The version metadata wasn't synchronized with the current git commit
3. There was no automated check to ensure version files were up-to-date before publishing

## Solution

The new automated version system consists of three components:

### 1. **ensure-version.mjs** - Smart Version Detection

Located at `scripts/ensure-version.mjs`, this script:

- Runs automatically before every build
- Compares the current git commit hash with the version.json commit hash
- Only regenerates version files if commits differ
- Prevents unnecessary version updates while ensuring freshness

**How it works:**
```bash
node scripts/ensure-version.mjs
```

If the git commit has changed since the last build, it automatically calls `update-version.mjs`.

### 2. **update-version.mjs** - Version File Generator

Located at `scripts/update-version.mjs`, this script:

- Reads the current git commit hash
- Reads the current git branch
- Reads the version from package.json
- Updates three files:
  - `shared/version.ts` - TypeScript version constants for the backend
  - `client/public/version.json` - JSON version file for runtime checks
  - `.version-metadata.json` - Metadata file for deployment systems

**Generated version.json structure:**
```json
{
  "version": "1.0.8",
  "commit": "e42d213",
  "fullCommit": "e42d2139df553bb17eb767e93008a8f2d5d89d27",
  "buildDate": "2026-02-18T14:11:26.425Z",
  "timestamp": 1771423886425
}
```

### 3. **VersionCheck Component** - Runtime Version Verification

Located at `client/src/components/VersionCheck.tsx`, this component:

- Fetches version.json from the deployed site
- Compares frontend and backend versions
- Detects version mismatches
- Alerts users when updates are available
- Provides automatic refresh capability

**Features:**
- Automatic update checks on Settings page load
- Manual check button for on-demand verification
- Configurable auto-check preference
- Version mismatch detection (frontend vs backend)
- One-click refresh to load new version

## Build Process

The build process now includes automatic version updates:

```bash
# In package.json
"build": "node scripts/ensure-version.mjs && vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

**Build flow:**
1. Run `ensure-version.mjs` - checks if version needs updating
2. If commit changed, run `update-version.mjs` - regenerate version files
3. Run Vite build - includes updated version.json in dist/public
4. Run esbuild - bundles backend with updated version.ts

## Version Information Available

### Frontend (client/src/components/VersionCheck.tsx)
```typescript
import { APP_VERSION, getVersionString } from "@shared/version";

// Access version info
console.log(APP_VERSION.version);      // "1.0.8"
console.log(APP_VERSION.commit);       // "e42d2139df553bb17eb767e93008a8f2d5d89d27"
console.log(APP_VERSION.branch);       // "main"
console.log(getVersionString());       // "v1.0.8 (e42d213) - Feb 18, 2026"
```

### Backend (server/routers.ts)
```typescript
// Version endpoint available at /api/trpc/version.getInfo
const versionInfo = await fetch('/api/trpc/version.getInfo');
// Returns: { version, commit, branch, buildDate, buildTimestamp }
```

### Runtime (version.json)
```typescript
// Fetch from public directory
const response = await fetch('/version.json?_=' + Date.now());
const versionData = await response.json();
// Contains: version, commit, fullCommit, buildDate, timestamp
```

## How to Use

### Check Current Version
1. Go to Settings page
2. Look at "Version & Updates" section
3. Click "Check for Updates" button

### Automatic Update Checks
1. Enable "Automatically check for updates" checkbox
2. Version will be checked each time you open Settings
3. You'll be notified if a new version is available

### Manual Version Update
1. Click "Refresh Now" button when update is available
2. Or manually refresh the page (Ctrl+R / Cmd+R)

## Troubleshooting

### Version Mismatch Alert
If you see "Version Mismatch Detected" (frontend vs backend versions differ):
1. This usually happens during deployment transitions
2. Click "Refresh Now" to load the latest version
3. If persists, contact support

### Version Not Updating
If version.json isn't updating after publishing:
1. Check that the build process ran successfully
2. Verify git commit changed (new checkpoint created)
3. Clear browser cache and hard refresh (Ctrl+Shift+R)
4. Check browser console for any errors

### Manual Version Update
To manually update version files:
```bash
# Auto-detect if update needed
node scripts/ensure-version.mjs

# Force update to specific version
node scripts/update-version.mjs 1.0.9

# Rebuild with updated version
pnpm build
```

## Technical Details

### Version File Locations
- **Source:** `client/public/version.json` - Updated before each build
- **Built:** `dist/public/version.json` - Included in deployment
- **Backend:** `shared/version.ts` - Imported by backend code
- **Metadata:** `.version-metadata.json` - For deployment systems

### Commit Hash Comparison
The system compares:
- Current git commit: `git rev-parse HEAD`
- Stored commit in version.json: `fullCommit` field

If they differ, version files are regenerated to ensure freshness.

### Build Caching
- Version check happens before Vite build
- Vite includes version.json in public assets
- esbuild includes version.ts in backend bundle
- Both are always in sync after build

## Future Improvements

Potential enhancements:
- Automatic version bumping based on git tags
- Changelog generation from git commits
- Version history tracking
- Rollback detection and warnings
- Deployment status monitoring

## References

- `scripts/ensure-version.mjs` - Main version detection script
- `scripts/update-version.mjs` - Version file generator
- `client/src/components/VersionCheck.tsx` - Runtime version checker
- `shared/version.ts` - Version constants (auto-generated)
- `client/public/version.json` - Version metadata (auto-generated)
