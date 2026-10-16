# Admin access with Google Authenticator

The public login is `/admin`. The old gate routes no longer exist, and legacy cookies are not accepted. Legacy frontend URLs redirect to `/admin`. No public account registration, email verification service, or email-based password reset is provided.

## Before deploying

1. Generate an independent encryption key on your own machine:
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Add that value to Render as `MFA_ENCRYPTION_KEY`. Back it up privately. It must be exactly 64 hexadecimal characters. Do not put it in Git, screenshots, or chat. Do not rotate it without re-encrypting stored secrets or deliberately resetting MFA.
3. Ensure Render `ALLOWED_ORIGINS` includes `https://bilelthedev.website`, `https://www.bilelthedev.website`, and the actual Vercel production hostname. Use exact origins without trailing slashes. Keep `NODE_ENV=production` and the correct trusted proxy count.
4. In Vercel Production set `VITE_API_URL=/api`. The frontend `vercel.json` proxies this path to `https://bilel-portfolio-backend-0zny.onrender.com/api/…`. This keeps cookies on the portfolio's own host. Deploy this frontend configuration together with the new backend. Direct cross-site API authentication is intentionally not the default.
5. Keep existing admin records and hashes. Existing records without explicit `isActive=true` are denied. To approve an existing account as the owner, set `ADMIN_EMAIL` privately in a trusted operator environment with `MONGODB_URI`, and run `npm run admin:access -- grant-owner`. For a legacy account that has no authenticator yet, also set a fresh `ADMIN_PASSWORD` (16+ characters, at most 72 bytes) different from its old password. Approval then replaces the legacy password, increments the session version, and revokes previous sessions/challenges. This prevents an old password exposed in previous source history from claiming initial enrollment. Only run it for an account you own and have verified.
6. If no account exists, set private `ADMIN_EMAIL` and `ADMIN_PASSWORD` (16+ characters, at most 72 UTF-8 bytes) and run `npm run admin:create`. This creates an approved owner and refuses to overwrite an existing account. Remove the bootstrap password afterward. Neither operator command has been run against your live database by this task.
7. Deploy the backend, then the frontend with its `/api` setting. Old admin sessions will be invalid. The database creates indexes for session/challenge hashes and TTL expiration at startup. Ensure the deployment database user can create the required indexes.
8. Visit the final canonical host `/admin`. Sign in with your approved account's email/password, scan the QR code in Google Authenticator, and prove possession with a current code. Save the recovery codes before opening the dashboard. A code used during setup cannot be used again for sign-in; wait for the next one.
9. Remove unused `GATE_MASTER_KEY` and `JWT_SECRET` environment variables after successful rollout. They no longer authorize access.

## Protections

- Database allowlist: every protected API request checks active status, role, MFA enrollment, and session version. Merely knowing an approved email is insufficient.
- Passwords: bcrypt with cost 12; new passwords are at least 16 characters and at most 72 UTF-8 bytes. Unknown and disallowed accounts get a generic denial; unknown accounts still incur a bcrypt comparison.
- Second factor: Google Authenticator-compatible SHA-1 TOTP, six digits, 30-second steps, clock skew limited to one adjacent step. Accepted counters are advanced atomically, so a code cannot be reused or accepted concurrently. This is TOTP interoperability, not password hashing.
- Enrollment: password-authenticated, short-lived challenges only. Setup does not create a session. MFA secrets are encrypted with AES-256-GCM and QR images are generated locally, never through third-party QR services.
- Recovery: ten random 80-bit one-use codes, stored as keyed hashes, accepted only after the password step. Codes are consumed atomically. Replacing codes requires a fresh authenticator proof and invalidates old codes.
- Session tokens: 256-bit opaque random values; only their hashes are stored. Production uses Secure, HttpOnly, SameSite=Lax, host-only `__Host-` cookies. Sessions expire after 30 minutes of inactivity or six hours absolute. Background status polling does not extend idle time.
- CSRF: exact allowed browser origins, an explicit auth request header, and a session/challenge-bound CSRF token. No tokens or MFA secrets are stored in browser localStorage.
- Attempts: database-backed per-account failures lock sign-in for 15 minutes after five failed attempts. Challenge verification allows at most five attempts. IP request limits provide an additional in-process boundary. For multiple replicas, use a shared IP limit store; account/challenge counters already live in MongoDB.
- Authorization: only owners can list/manage account access. Browser account approval creates admins, never owners. Sensitive changes require a fresh authenticator code. Owner promotion is an offline operator operation.
- Security changes: password updates, account disabling, and operator resets revoke sessions. Administrators can inspect/revoke their own sessions, sign out everywhere, and inspect recent account activity. Audit records expire after 90 days.

## Lost phone or password

Use an unused recovery code after the password step to sign in. If the phone is permanently lost, a verified operator can set `ADMIN_EMAIL` and `CONFIRM_MFA_RESET` to the exact account email, then run `npm run admin:access -- reset-mfa` in a trusted environment. This clears MFA, revokes every session/challenge, and requires enrollment again after the account's existing password is verified. Remove `CONFIRM_MFA_RESET` afterward. This is not an HTTP endpoint and cannot be triggered through the public login.

If the password is lost, a verified operator may set `ADMIN_EMAIL`, a fresh `ADMIN_PASSWORD`, and `CONFIRM_ADMIN_RESET` equal to the exact email, then run `npm run admin:access -- reset-password`. This replaces the password and revokes sessions/challenges while keeping authenticator protection. Remove the temporary password and confirmation variables afterward. If both factors and password are lost, verify ownership through your hosting/database operator process before deliberately using both operator procedures. There is no unauthenticated HTTP reset bypass. Do not change the encryption key as a recovery shortcut.

## Limits and verification

No system is unhackable. TOTP can be phished; passkeys/WebAuthn are a future option for phishing-resistant authentication. These changes have not been independently penetration tested. Protect your hosting account, database credentials, encryption-key backups, and owner device. A recovery code is a second factor and must be kept private.

Run `npm test` for regression tests and a disposable MongoDB-backed authentication suite. The isolated database suite downloads a MongoDB binary on first run; it does not connect to your real database. Client checks are `npm run lint` and `npm run build`.

Sources: https://github.com/hectorm/otpauth · https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html · https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
