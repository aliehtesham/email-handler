# Email Handler

A Windows desktop app (Electron + React) for administering a **mailcow** server with a
Material 3 Expressive glass UI: domain CRUD, mailbox management, pattern-based bulk
account creation with collision-proof uniqueness, and inbox reading (single + combined).

Default server: `https://mail.devorev.com` (changeable in-app).

## First run

1. In the mailcow UI create a **read-write API key**: `System → Configuration → Access → API`.
2. Start the app:
   ```bash
   npm run dev
   ```
3. On the connection screen paste the server URL + API key, hit **Test connection**, then
   **Save & continue**. The key is stored encrypted with Windows DPAPI and never leaves the app.

## What you can do

- **Domains** — create, edit (description, quotas, max mailboxes, tags), enable/disable, delete
  (with typed confirmation). Cards show mailbox count and quota usage.
- **Mailboxes** — per-domain list; add a single account, edit, reset password, delete.
- **Bulk create** (wand FAB) — pattern like `user*@devorev.com` where `*` is either
  **count-up** (`user1, user2…`, optional zero-padding) or **random** (length + digit/lower/upper/symbol
  sets). Passwords: one fixed password for all, or a strong random one per account.
  Existing accounts are **never recreated**: taken names are skipped (count mode) or regenerated
  (random mode), checked both against the live mailbox list and the current batch. Results are
  shown with copy-all / CSV / JSON export; all passwords are stored encrypted so the app can read
  those inboxes later.
- **Inboxes** — click an account to read its mail (refresh button + optional 30 s auto-refresh).
  Reading works over IMAPS with the stored password. Accounts created outside the app can be
  unlocked once by entering their password (stored encrypted, server password untouched).
- **Combined inbox** — select several accounts (Select mode) → merged, newest-first view with an
  account chip on every row.

## Production build

```bash
npm run dist
```
Produces an NSIS installer under `release/`.

The app icon lives at `build/icon.svg`; regenerate `build/icon.ico` (window/taskbar/installer) after editing it:

```bash
npm run icon
```

## Architecture notes

- All network I/O (mailcow REST + IMAP) and secrets live in the **main process**; the renderer
  talks only through a typed IPC bridge (`window.api`).
- mailcow admin API cannot read mail contents, so inbox reading uses **IMAPS (993)** with the
  per-mailbox password the app itself created/stored.
- Mail HTML is sanitized with DOMPurify before rendering.
- `npm run typecheck` — strict TypeScript across main/preload/renderer.
