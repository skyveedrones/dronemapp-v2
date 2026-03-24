# De-Manus Cutover Active Checklist

Use this as the live runbook during migration. Check items as completed.

## Cutover Control Sheet
- [ ] Cutover owner assigned: ____________________
- [ ] Cutover date/time window: ____________________
- [x] Production host selected: Railway
- [x] Auth mode selected: Temporary Bypass
- [ ] Final app domain decided: ____________________
- [ ] Go/No-Go approver: ____________________

## Phase 0: Preflight Inputs
- [ ] Confirm current production URL(s): ____________________
- [ ] Confirm current DB target (do not rotate unless planned): `DATABASE_URL`
- [ ] Confirm first admin allowlist emails: ____________________
- [ ] Confirm Resend domain status (if email auth path used)
- [ ] Confirm Google OAuth credentials exist (if OAuth path used)

## Phase 1: Freeze + Rollback Points
- [x] Create branch `de-manus-cutover`
- [x] Create rollback tag `pre-cutover-20260324-1033`
- [ ] Export and securely store current environment variables snapshot (Manus + local)
- [ ] Confirm a known-good restore path exists

## Phase 2: Auth Implementation
- [ ] Backend: disable Manus-only callback path in production
- [ ] Backend: enable selected auth provider callback/token exchange
- [ ] Backend: keep dev bypass route gated to development only
- [ ] Backend: cookie settings verified for production
- [ ] Backend: `Secure=true`
- [ ] Backend: `SameSite` set correctly for flow
- [ ] Backend: cookie domain scope validated
- [ ] Frontend: replace Manus portal redirects with new auth entrypoint
- [ ] Frontend: login redirect returns to dashboard
- [ ] Frontend: logout clears session and returns to login

## Phase 3: Environment Cutover
- [ ] Remove Manus endpoint values from production env
- [ ] Set final `APP_BASE_URL`
- [ ] Set final `VITE_APP_URL`
- [ ] Confirm `NODE_ENV=production`
- [ ] Confirm `PORT` set by host/platform
- [ ] Confirm `JWT_SECRET` set
- [ ] Confirm `DATABASE_URL` unchanged (unless intentionally migrating DB)
- [ ] Confirm AWS/Cloudinary/Stripe/Mapbox keys present

## Phase 4: Deploy
- [ ] Deploy app to selected host
- [ ] Build command verified: `npm install ; npm run build`
- [ ] Start command verified: `npm start`
- [ ] Host-level env vars applied
- [ ] Health check returns HTTP 200
- [ ] Root app responds HTTP 200

## Phase 5: DNS + Domain Cutover
- [ ] Point DNS to new host
- [ ] TLS certificate active
- [ ] Callback URLs updated to final `https://` domain
- [ ] OAuth provider console callback URLs updated

## Phase 6: Verification Gate (Go/No-Go)
- [ ] Owner/admin login succeeds
- [ ] Session persists across refresh
- [ ] Logout invalidates session
- [ ] Protected routes block anonymous access
- [ ] Dashboard and project lists load from TiDB
- [ ] Media pages load correctly
- [ ] Stripe flows/webhooks verified
- [ ] Email sends verified (if enabled)
- [ ] No Manus URLs in network/API traces

### Go/No-Go Decision
- [ ] GO (all checks green)
- [ ] NO-GO (rollback)
- Decision timestamp: ____________________
- Decision owner: ____________________

## Phase 7: Rollback (Only If Needed)
- [ ] Reapply pre-cutover env snapshot
- [ ] Redeploy rollback tag
- [ ] Repoint DNS back if needed
- [ ] Re-run login + health checks
- [ ] Record incident notes and root cause

## Auth Variable Checklist

### Google OAuth Path
- [ ] `GOOGLE_CLIENT_ID`
- [ ] `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_REDIRECT_URI`

### Magic Link Path
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`
- [ ] `MAGIC_LINK_SECRET`

### Temporary Bypass Path
- [ ] `ADMIN_SECRET`
- [ ] `ALLOWED_ADMIN_EMAILS`

## Decommission Manus Dependency
- [ ] Remove Manus fallback code after one stable release
- [ ] Remove Manus environment keys from all host environments
- [ ] Archive this checklist with final notes

## Final Notes
- Start time: ____________________
- End time: ____________________
- Issues encountered: ____________________
- Follow-up tasks: ____________________
