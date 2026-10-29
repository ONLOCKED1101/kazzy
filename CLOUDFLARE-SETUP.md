# The Slot: Cloudflare setup

The Slot uses Cloudflare Pages Functions, D1, and R2. The static pages can be previewed without these services, but inventory, sign-in, and media uploads require the bindings below.

## 1. Create and bind storage in the Cloudflare dashboard

1. Create a Cloudflare D1 database named `kazzy-autos`.
2. Create an R2 bucket named `kazzy-autos-media`.
3. In the D1 database, open its **Console**, paste the full contents of `schema.sql`, and execute the SQL. This creates the tables and sample listings; no Wrangler or `npx` command is needed.
4. In the Cloudflare Pages project, open **Settings → Bindings** and add:
   - D1 database binding named `DB`, pointing to `kazzy-autos`.
   - R2 bucket binding named `MEDIA`, pointing to `kazzy-autos-media`.
5. Add the `ADMIN_SETUP_KEY` secret as described below, then trigger a new deployment so Pages Functions receive the bindings and secret.

The schema seeds Mercedes-Benz and Toyota preview listings from the dealership's supplied photos. It also creates a private draft for the 2010 Lexus ES reference details; verify the car is actually in stock, confirm its current price/specifications, and add authorized photos in Admin before publishing it.

## 2. Configure first-admin setup

Create a secret with at least 32 random bytes, for example in PowerShell:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

In the Pages project, add `ADMIN_SETUP_KEY` as a **secret** under **Settings → Variables and Secrets** for the Production environment. Use the same secret in Preview only if you intend to configure a separate preview admin database.

This project is deployed from its connected Git repository. Cloudflare will build new commits automatically; creating or changing D1/R2 bindings and secrets is still done in the Cloudflare dashboard. After changing those settings, start a new deployment from **Deployments** (or push a commit) so the latest deployment receives them. Then visit `/admin.html`, enter the same setup key to create the first username and password, and sign in. Initial account creation is disabled once the first admin exists. Keep the setup key and admin credentials private.

The browser password is never stored in local storage. Admin passwords are hashed with PBKDF2, sessions are stored hashed in D1, and the session cookie is HttpOnly, SameSite=Strict, and Secure on HTTPS.

## 3. Deploy

The project is a static Cloudflare Pages site with Pages Functions in `functions/`; the Pages output directory is the project root (`.`), as configured in `wrangler.toml`. A successful deployment should serve `/`, `/slot.html`, `/car.html`, and `/admin.html` along with the `/api/slot/` Functions.

For Git integration, ensure the repository includes the `functions` directory, `schema.sql`, `slot.css`, `slot.js`, `slot-common.js`, `car.js`, `admin.js`, all image assets, and `jeep.mp4`. Configure the D1 and R2 bindings and `ADMIN_SETUP_KEY` in that same Pages project.

If `/admin.html` reports that the D1 binding is missing, add the `DB` binding in Pages settings. If it reports that the database tables are not initialized, run `schema.sql` in that D1 database's **Console**. These settings are separate from Git deployments.

To confirm the Pages Function is deployed, open `/api/slot/admin/me` on your live site. It should return JSON such as `{"initialized":false,"authenticated":false,"username":null}` (or `initialized:true` after setup). If it shows the website HTML instead, check the Pages project's **Build settings**: set **Root directory** to the repository folder containing `functions/` and set **Build output directory** to `.`. The deployed commit must include `functions/api/slot/admin/me.js` and `functions/api/slot/_utils.js`; the deployment log should show Functions being built. Trigger a fresh deployment after correcting the repository root or build output settings.

## Inventory notes

- Only `available` records are shown publicly. `draft` is private to Admin; `sold` records are not shown in the public inventory.
- The seed Lexus record is a draft because the referenced Autochek listing is not proof of Kazzy Autos stock, and its photos are not included. Do not copy or republish third-party listing photos without permission.
- Update demonstration vehicle details, prices, and availability in Admin before advertising a listing. A displayed price is confirmed by the dealership on enquiry.
- Admin accepts JPEG, PNG, and WebP images up to 12 MB, and MP4 or WebM videos up to 100 MB per file. R2 stores the uploaded media.
- The detail-page finance calculator is a principal-only illustration and is not a lender quote; interest and fees are excluded.
