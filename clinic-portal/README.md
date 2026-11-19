# Lab Online Booking — Clinic Portal

A self-serve portal where a referring clinic registers, gets approved by TSB,
and then downloads its own booking link, QR code and printables, and requests
a free NFC stand. Built from the "Clinic Self-Serve Portal: Build Brief".

**Status:** working front-end module running in **demo mode**. All data stays in
the viewer's browser (localStorage) and no email is sent. It is ready for a
walkthrough with clinics, Fraser Health and VCH. To go live on
labonlinebooking.ca, the data layer (`store.js`) is replaced by the Laravel
routes below. The screens don't change.

## Try it

Open `/clinic-portal/`, register a clinic, follow the on-screen sign-in link,
then open **TSB admin view** in the yellow demo bar to approve it. After
approval the **Booking kit** unlocks.

## Files

| File | What it does |
|---|---|
| `index.html`, `app.js` | Clinic portal screens: register, sign in, dashboard, booking kit, profile and logo, NFC stand, team. Also a demo-only TSB admin view. |
| `store.js` | Data layer. Demo adapter today. Holds every rule (approval gate, single-use links, rate limits, clinic isolation). |
| `vee.js` | Vee, the portal's guide character (an original test-tube mascot). Gives tips in speech bubbles on each screen, on the patient page, and optionally on printables. Tips can be dismissed and brought back with **Tips** in the header. |
| `qr.js`, `vendor/qrcode.js` | QR generation: error correction H, 4-module quiet zone, black on white, SVG and 1024 px PNG. Library: qrcode-generator 2.0.4 (MIT, Kazuhiko Arase). |
| `print/` | Print templates in the Lab Online Booking poster style (`templates.js`, `print.css`, `img/lab-desk.webp`). Clinic formats: poster (Letter), large poster (Tabloid 11×17), countertop sign (5×7), counter card (4×6), table tent (Letter, folds to 8.5×5.5) and patient handouts (4 per Letter sheet). Options: clinic logo, photo, Vee. Until a logo is approved, each format shows a dashed "Your logo here" box in the logo spot. It is on screen only (it never prints), and clicking it uploads the logo. "Save as PDF" gives a one-page PDF at the exact size. The NFC stand label (4.4×4.9) is printed by TSB from the admin stand queue. |
| `c/` | Public patient landing page (`?code=XXXXXX&m=qr`, or `?r=vch&s=pacific-blvd`). Records the visit and links into booking. |
| `config.js` | Feature flag, base domain, regions, stand cap, timeouts. |
| `tests/e2e.js` | Playwright acceptance test covering section 12 of the brief. |

## What the brief asks for, and where it is

- **Passwordless sign-in.** The link works once, expires after 15 minutes and is stored only as a SHA-256 hash. Limit of 5 requests per email per hour. The reply is always the same "If that email is registered…" message. Sessions end after 12 hours idle.
- **Approval gate.** Pending, rejected and suspended clinics get no kit, no stand and no live link. A public link for an unknown or unapproved clinic redirects to the booking home page with no error.
- **Link rules.** The short code is 6 characters from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`, random with retry on collision. The slug is built from the clinic name (40 characters at most, `-2`/`-3` on collision within the region). The QR code encodes `{baseUrl}/c/{code}?m=qr` and the NFC link is `?m=nfc`. The shareable link is `{baseUrl}/{region}/{slug}`.
- **Printables.** Six clinic formats share one design scaled in `em`, so every size keeps the required copy, the typed short link and a QR code at least 1 inch wide. The clinic logo is optional and prints only after TSB approves it. Health authority logos never appear.
- **NFC stand.** Coming later. Approved clinics can opt in now. The request waits in the admin stand queue.
- **Motion.** Follows Emil Kowalski's design-engineering guidance: press feedback on buttons, custom ease-out curves under 300 ms, a bubble that grows from Vee's tail, a one-time confetti burst on approval, and no motion on repeated actions. `prefers-reduced-motion` turns movement into simple fades.
- **Branding.** Display name up to 60 characters. One PNG/JPG logo, 1 MB at most. The real file type is checked from its bytes and the image is re-encoded, which strips metadata. A logo appears publicly only after admin approval.
- **Attribution.** Visit, booking started and booking completed. One visit per browser session per clinic. Known bots and link previewers are skipped. The reference expires after 24 hours. Events store clinic, medium, type and time, and nothing else.
- **Stand.** Available only after approval. One open request per clinic. Admin queue shows the exact NFC link, a monthly cap, the fulfilment checklist, and a required tag ID and tracking number before "shipped".
- **Admin reports.** Labelled "Where bookings come from" (not attendance). CSV export guards against spreadsheet formula injection.
- **Escaping.** Clinic names are escaped on every screen. Printables build text with DOM text nodes.

## Porting to the Laravel app (for John)

Keep the screens and swap `store.js` for `fetch()` calls. Suggested routes, matching section 5 of the brief:

| Store method | Route |
|---|---|
| `register` | `POST /clinic/register` |
| `requestLink` | `POST /clinic/login` |
| `verifyToken` | `GET /clinic/auth/{token}` |
| `me`, `updateProfile` | `GET/PUT /clinic/profile` |
| `uploadLogo` | `POST /clinic/profile/logo` (re-encode server side) |
| `kit` | `GET /clinic/kit` plus `/clinic/kit/qr.{png,svg}` and `/clinic/kit/{poster,card,label}.pdf` |
| `stands`, `requestStand` | `GET/POST /clinic/stand` |
| `team`, `invite`, `removeMember` | `GET/POST/DELETE /clinic/team` |
| `myCounts` | `GET /clinic/counts` |
| `resolve` + `trackVisit` | `GET /c/{short_code}` and `GET /{region}/{slug}` (server side) |
| `trackBooking` | Hook at booking start and at booking confirmation (the one change to existing code) |
| `admin.*` | `/admin/clinics…`, `/admin/clinic-stands`, `/admin/clinic-reports` |

Things that must move to the server for production. The demo can't enforce them because it runs in the browser:

1. Token hashing, expiry, rate limiting and sessions (Laravel guard plus throttle middleware).
2. Clinic isolation. Every query is scoped to the signed-in user's `clinic_id`, never an ID from the request.
3. QR, PNG and PDF generation (for example `endroid/qr-code` and the repo's PDF library). The front-end renderer can stay for the on-screen preview.
4. Logo re-encoding (Intervention Image or GD) and random file names.
5. Bot filtering and one-visit-per-session on `/c/{code}`.
6. Admin screens inside the existing admin area and its authentication.
7. Real email through the app's mail setup (the demo shows them in an outbox).

The open questions in section 13 of the brief still need John's answers before
anything is printed, especially whether `/{region}/{slug}` collides with
existing routes (fallback: `/r/{region}/{slug}`).

## Running the test

```bash
python3 -m http.server 8765    # from the repo root
```

```bash
npm i playwright jsqr pngjs && node clinic-portal/tests/e2e.js
```

`tests/logo-slot.js` checks the "Your logo here" placeholder: it shows on screen, never prints, uploads on click, and gives way to the approved logo.

The main test registers "Pacific Blvd Clinic" in VCH and runs the full journey. It
decodes the downloaded QR PNG and checks the printables, attribution, stand
fulfilment, clinic isolation, suspension fallback and rate limits.
