# Lab Online Booking.ca: public site (front end)

The patient-facing homepage and supporting pages for labonlinebooking.ca, built
from the homepage design mockup. Plain HTML, one stylesheet, two scripts. There
is no framework and no build step to run the site.

**Status:** front end runs in **demo mode**. Locations and open times are sample
data, and bookings are kept in the viewer's browser (localStorage). A yellow bar
at the top of every page says so. Remove it when the pages are wired to Slot IQ.

## Pages

| URL | File | What it does |
|---|---|---|
| `/` | `index.html` | Homepage: hero, live counter, 3 steps, lab search, clinic and AI assistant cards, health authorities |
| `/how-to-book/` | `how-to-book/index.html` | Step-by-step instructions ("See Step-by-Step Instructions") |
| `/locations/` | `locations/index.html` | Search by city or postal code (`?q=`), filter by health authority (`?ha=vch`) |
| `/book/` | `book/index.html` | Booking flow: lab, then date and time, then details, then confirmation. `?lab={id}` skips to step 2 |
| `/manage/` | `manage/index.html` | "Sign In / Manage Your Booking": look up with confirmation code + last name, then cancel or rebook |
| `/help/` | `help/index.html` | FAQs with anchors `#booking #before #changes #contact #privacy #accessibility` |
| `/for-clinics/` | `for-clinics/index.html` | Clinic resources, links to the existing `/clinic-portal/` |
| `/locations/{org}/` | `locations/fraser-health/index.html` etc. | **Health authority page** (one per authority): logo, stats, search limited to that authority, community filter, its locations with next opening, before-you-book info, other authorities |
| `/locations/{org}/{location}/` | `locations/fraser-health/surrey-central/index.html` etc. | **Location page** (one per lab): open/closed now, next available times (tap one to go straight to details), services, before you go, address and map, weekly hours with today highlighted, accessibility, parking and transit, nearby labs |

The AI Booking Assistant panel is on every page. It opens from **Chat Now** or from any URL ending in `#assistant`.

## Files

```
assets/css/lob.css     All styles. Design tokens are at the top (:root).
data/sample-data.json  SAMPLE data: authorities, locations, postal prefixes. Edit this one.
assets/js/data.js      GENERATED from the JSON by build.py, for the scripts.
assets/js/lob.js       Header menus, counter, search, booking flow, manage, assistant.
assets/img/            hero-lab.webp (cropped from the mockup), favicon.svg, ha/ (authority logos)
assets/fonts/          Hanken Grotesk (variable, self-hosted)
build.py               Regenerates every page from one header/footer and the JSON data,
                       including one page per health authority and per location.
```

Header and footer are the same on every page, between `<!-- partial: header -->`
and `<!-- partial: footer -->` markers. In Laravel, cut each block into a Blade
partial (`@include('lob.header')`) and drop `build.py`. To change the header
without Laravel, edit `build.py` and run `python3 build.py`.

All paths are relative, so the folder works at a domain root or in a subfolder.

### Organization and location templates

`build.py` holds the two templates (search for `ORGANIZATION + LOCATION TEMPLATES`).
In Laravel they become two Blade views fed by the existing records:

| Route | View | Data it needs |
|---|---|---|
| `/locations/{organization:slug}` | `lob.organization` | name, slug, logo, short description, its locations |
| `/locations/{organization:slug}/{location:slug}` | `lob.location` | name, organization, city, address, where in the building, services, per-day hours, accessibility list, parking/transit text |

Open/closed status, "Next" tags and next available times are filled in the browser
from the availability API, so the page HTML can be cached. Book links pass
`?lab=`, `?ha=`, or `?lab=&date=YYYY-MM-DD&time={minutes}` into `/book/`.
Address, building and parking text in the sample data are placeholders.

## Design tokens

| Token | Value | Used for |
|---|---|---|
| `--blue-700` | `#0b4ea8` | Buttons, links, icons |
| `--grad-btn` | `#1462c7` → `#0a479c` | Primary buttons, Sign In, step numbers |
| `--blue-50` | `#f1f6fd` | Step cards, search panel, clinic card |
| `--ink` | `#0b1a33` | Headings |
| `--sky` | `#4fc3f0` | Title underline, hero wave |
| `--red` | `#d6202b` | Maple leaf |
| `--green` | `#18a44a` | LIVE badge |
| `--footer` | `#0a1f44` | Footer |
| Font | Hanken Grotesk 400–800 | Everything |
| Radius | 10px buttons, 20px cards | |

Breakpoints: 1080px (tighter nav), 920px (mobile menu, hero image above text),
820px (steps stack), 560px (small phones).

## Wiring to Slot IQ

Every place that needs the API is marked `API:` in `lob.js`.

| Demo code | Replace with |
|---|---|
| `LOB_CONFIG.appointmentsSince2018` | `GET /api/stats/appointments` (hero counter) |
| `LOB_LOCATIONS`, `LOB_AUTHORITIES` | `GET /api/locations`, organization records |
| `searchLocations()` | Server search with real geocoding of postal codes |
| `slotsFor()`, `nextAvailable()` | `GET /api/locations/{id}/availability?date=` |
| Booking submit in `stepDetails()` | `POST /api/bookings` (returns the confirmation code) |
| `initManage()` lookup and cancel | `POST /api/bookings/lookup`, `DELETE /api/bookings/{code}`, rate-limited |
| `reply()` in `initAssistant()` | Slot IQ Assist endpoint |

The booking form asks for name, date of birth, PHN (10 digits), phone or email,
an optional note, a reminder opt-in, and confirmation that the patient has a requisition.
Match these to the fields the production booking flow already collects.

## Before launch

1. **Health authority logos** are in `assets/img/ha/`, the same files the TSB site uses (`assets/img/partner-*.png`). They are small (about 100–180px wide), so get higher-resolution or SVG versions for sharp display on high-density screens.
2. **Counter figure.** The mockup says 4,500,000+. The case study says 4M+ across four providers, and the mockup lists five authorities. Confirm the number and the list.
3. **Hero photo.** `hero-lab.webp` is cropped from the mockup at low resolution. Replace it with the full-resolution original.
4. **Copy.** The FAQ, privacy and accessibility text is placeholder. Have it reviewed.
5. Remove the demo bar and `<meta name="robots" content="noindex">`.
