# The Slot: Cloudflare setup

The Slot uses Cloudflare Pages Functions, D1, and R2. The static pages can be previewed without these services, but inventory, sign-in, and media uploads require the bindings below.

## 1. Create and bind storage

1. Create a Cloudflare D1 database named `kazzy-autos`.
2. Create an R2 bucket named `kazzy-autos-media`.
3. In the Pages project, open **Settings → Bindings** and add:
   - D1 database binding named `DB`, pointing to `kazzy-autos`.
   - R2 bucket binding named `MEDIA`, pointing to `kazzy-autos-media`.
4. Apply the schema and sample listings to the D1 database:

   ```powershell
   npx wrangler d1 execute kazzy-autos --remote --file=schema.sql
   ```

   This seeds a Mercedes-Benz and Toyota preview listing from the dealership's supplied photos. It also creates a private draft for the 2010 Lexus ES reference details; verify the car is actually in stock, confirm its current price/specifications, and add authorized photos in Admin before publishing it.

## 2. Configure first-admin setup

Create a secret with at least 32 random bytes, for example in PowerShell:

```powershell
python -c "import secrets; print(secrets.token_hex(32))"
```

In the Pages project, add `ADMIN_SETUP_KEY` as a **secret** under **Settings → Variables and Secrets** for the Production environment. Use the same secret in Preview only if you intend to configure a separate preview admin database.

Deploy or redeploy the Pages project after adding the bindings and secret. Then visit `/admin.html`, use the one-time setup key to create the first username and password, and sign in. Initial account creation is disabled once the first admin exists. Keep the setup key and admin credentials private.

The browser password is never stored in local storage. Admin passwords are hashed with PBKDF2, sessions are stored hashed in D1, and the session cookie is HttpOnly, SameSite=Strict, and Secure on HTTPS.

## 3. Deploy

The project is a static Cloudflare Pages site with Pages Functions in `functions/`; the Pages output directory is the project root (`.`), as configured in `wrangler.toml`. A successful deployment should serve `/`, `/slot.html`, `/car.html`, and `/admin.html` along with the `/api/slot/` Functions.

When using direct upload or Git integration, include the `functions` directory, `schema.sql`, `slot.css`, `slot.js`, `slot-common.js`, `car.js`, `admin.js`, all image assets, and `jeep.mp4`. Configure the D1 and R2 bindings and `ADMIN_SETUP_KEY` in the same Pages project.

## Inventory notes

- Only `available` records are shown publicly. `draft` is private to Admin; `sold` records are not shown in the public inventory.
- The seed Lexus record is a draft because the referenced Autochek listing is not proof of Kazzy Autos stock, and its photos are not included. Do not copy or republish third-party listing photos without permission.
- Update demonstration vehicle details, prices, and availability in Admin before advertising a listing. A displayed price is confirmed by the dealership on enquiry.
- Admin accepts JPEG, PNG, and WebP images up to 12 MB, and MP4 or WebM videos up to 100 MB per file. R2 stores the uploaded media.
- The detail-page finance calculator is a principal-only illustration and is not a lender quote; interest and fees are excluded.
