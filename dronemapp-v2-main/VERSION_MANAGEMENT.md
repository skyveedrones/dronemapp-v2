# Version Management System

## Overview

This document describes the permanent version management system implemented to ensure version numbers are automatically updated when new checkpoints are published.

## Problem Statement

Previously, version numbers were hardcoded in `shared/version.ts` and not automatically updated when new checkpoints were published. This caused the application to display outdated version information even after publishing new updates.

## Solution

A comprehensive version management system has been implemented with:

1. **Automatic Version Update Script** (`scripts/update-version.mjs`)
2. **Centralized Version File** (`shared/version.ts`)
3. **Version JSON for Runtime Checks** (`client/public/version.json`)
4. **Integrated Build Process** (updated `package.json`)

## How It Works

### 1. Automatic Version Update Script

**File:** `scripts/update-version.mjs`

The script automatically:
- Reads the current git commit hash
- Reads the version from `package.json`
- Updates `shared/version.ts` with new version info
- Updates `client/public/version.json` for runtime checks
- Includes build timestamp and branch information

**Usage:**
```bash
# Automatic (runs during build)
pnpm build

# Manual update
node scripts/update-version.mjs

# Update with specific version
node scripts/update-version.mjs 1.0.9
```

### 2. Version Files

#### `shared/version.ts`
- Contains `APP_VERSION` object with version, commit, branch, and build date
- Exports `getVersionString()` for human-readable format
- Exports `getVersionInfo()` for API communication
- **Automatically updated during build**

#### `client/public/version.json`
- JSON format for runtime version checks
- Contains version, commit, build date, and timestamp
- Used by version check component
- **Automatically updated during build**

#### `package.json`
- Single source of truth for version number
- Updated manually when releasing new versions
- Read by the update script

### 3. Build Process Integration

**Updated `package.json` build script:**
```json
"build": "node scripts/update-version.mjs && vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist"
```

The build process now:
1. Runs version update script
2. Builds the application
3. Bundles server code

## Workflow for Releasing New Versions

### Step 1: Update Version Number
Edit `package.json` and update the version field:
```json
{
  "version": "1.0.9"
}
```

### Step 2: Build the Application
```bash
pnpm build
```

This automatically:
- Updates `shared/version.ts` with new version
- Updates `client/public/version.json`
- Includes current git commit hash
- Records build timestamp

### Step 3: Commit Changes
```bash
git add .
git commit -m "chore: release version 1.0.9"
```

### Step 4: Create Checkpoint
The version files are now updated and ready for checkpoint creation.

### Step 5: Publish
Publish the checkpoint through the Manus UI. The version will now display correctly.

## Version Display

The version is displayed in **Settings > Version** with the format:
```
v1.0.8 (b781421) - Feb 10, 2026
```

Components showing version:
- `client/src/components/VersionCheck.tsx` - Version check component
- `client/src/pages/Settings.tsx` - Settings page
- `client/src/components/DashboardLayout.tsx` - Dashboard footer

## Automatic Update Checking

Users can enable automatic update checks in **Settings > Version**:
- Checkbox: "Automatically check for updates"
- Manual button: "Check for Updates"
- Last checked timestamp is displayed

When enabled, the system:
- Checks for updates when Settings is opened
- Compares current version with latest
- Displays update notification if available
- Provides refresh button to reload with latest version

## Cache Busting

The version system includes cache busting:
- Service worker caches are cleared on refresh
- Version timestamp ensures fresh data
- Commit hash uniquely identifies each build

## Troubleshooting

### Version Not Updating After Publish

**Solution:**
1. Ensure `pnpm build` was run before creating checkpoint
2. Check that `package.json` version was updated
3. Verify `shared/version.ts` has new commit hash
4. Clear browser cache and refresh

### Version Shows Development Hash

**Cause:** Git is not available in build environment

**Solution:**
- The script falls back to 'development' if git is unavailable
- This is normal for local development
- Production builds should have git available

### Manual Version Update

If automatic update fails:
```bash
node scripts/update-version.mjs 1.0.9
```

Then rebuild:
```bash
pnpm build
```

## Files Modified

1. **scripts/update-version.mjs** - New automatic version update script
2. **shared/version.ts** - Updated with new structure and functions
3. **client/public/version.json** - Updated with current version
4. **package.json** - Updated build script and version number

## Best Practices

1. **Always run `pnpm build` before creating checkpoints**
   - Ensures version files are up to date

2. **Update `package.json` version first**
   - This is the single source of truth

3. **Commit version changes before publishing**
   - Version files should be in checkpoint

4. **Test version display after publishing**
   - Verify Settings > Version shows correct version

5. **Clear cache if version doesn't update**
   - Browser cache may serve old version.json

## Integration with CI/CD

For CI/CD pipelines, add this step before building:
```bash
node scripts/update-version.mjs
```

This ensures version is always updated automatically.

## Future Enhancements

Potential improvements:
1. Automated version bumping based on git tags
2. Changelog generation from commits
3. Version history tracking
4. Automatic release notes generation
5. Version comparison API

## References

- `scripts/update-version.mjs` - Version update script
- `shared/version.ts` - Version configuration
- `client/src/components/VersionCheck.tsx` - Version display component
- `package.json` - Version source of truth
