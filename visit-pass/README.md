# Slot IQ — Digital Visit Pass

One pass and one call number for a hospital visit with several appointments.
The patient scans in once at the entrance, joins one pooled queue, and is
called to whichever of their rooms is free first. Visit rules decide what must
come first. Staff see the floor live. Nothing clinical is stored.

**Status:** working front end in **demo mode**, built from the "Slot IQ Digital
Visit Pass" prototype artifact. A fictional hospital plays a full clinic day in
the browser with fake patients. Nothing is sent or saved. To go live, the data
layer (`store.js`) switches to `mode: "api"` and the Laravel routes below
replace the simulator. The screens don't change. This is the same pattern as
`/clinic-portal/`.

## Try it

Open `/visit-pass/` (from a server, or straight from disk). Tap the glowing
button under the phone to play each step, or **Or watch it play by itself**.
Switch to **I am staff** for the staff app.

| URL | What you get |
|---|---|
| `index.html` | Patient phone, staff app and video, every component |
| `index.html#journeys` | Staff app open on one component (any component id) |
| `index.html?components=pass,kiosk,display` | Only those components. Use it to show a site its own setup |
| `index.html?only=display` | One component full screen, no app chrome. For a TV or a kiosk tablet |
| `index.html?invite=TOKEN#pass` | The patient's pick-your-time link (api mode) |

**Your setup** in the staff app picks components and builds the `?components=` link.

## Components: pick and choose

Every component is one file in `views/` and registers itself with the shell.
They all run on the same engine, so any mix works together. A component is left
out of a site in any of three ways:

1. `components: [...]` in `config.js` (the site's build),
2. delete its `<script>` line in `index.html` (the code isn't shipped at all),
3. `?components=` in the URL (demos only).

| id | File | Product | What it is | Needs |
|---|---|---|---|---|
| `pass` | `views/pass.js` | Slot IQ Arrive | **Digital Visit Pass**, the patient's phone: QR code and call number, what to do now, journey, map and directions, staff messages, language and accessibility, Apple Wallet, ride, end-of-visit survey | — |
| `assist` | `views/assist.js` | Slot IQ Assist | AI assistant on the pass's Help tab (chat or call). Where and when only | `pass` |
| `flow` | `views/flow.js` | Slot IQ Flow | Live floor: animated engine view, drag-and-drop board, every clinic worst first | — |
| `journeys` | `views/journeys.js` | Slot IQ Flow | **Patients**: each visit as a line of stops, search by name, reference or number | — |
| `booking` | `views/booking.js` | Slot IQ Book | Clerk books every appointment on a request form as one visit | — |
| `selfbook` | `views/selfbook.js` | Slot IQ Book | **Pick-your-time invitations** for imaging and other exams not open to the public: staff send one patient a private link, the patient picks a time that fits every exam | `pass` for the patient side |
| `kiosk` | `views/kiosk.js` | Slot IQ Arrive | Entrance kiosk and door scanners, including the wrong-door case | — |
| `display` | `views/display.js` | Slot IQ Arrive | Waiting room display: numbers, never names. Staff announcements, voice | — |
| `stations` | `views/stations.js` | Slot IQ Flow | Station hub: "Patient arrived" and "Check out" per room | — |
| `rules` | `views/rules.js` | Slot IQ Flow | Visit rules, switchable live | — |
| `insight` | `views/insight.js` | Slot IQ Insight | Waits, room use, survey results | — |
| `setup` | `views/setup.js` | — | Component picker (sales and onboarding) | — |

The engine (`engine.js`) is always included. Without `pass` there is no patient
phone; without `kiosk` the demo still checks the patient in from the demo strip.

## Files

| File | What it does |
|---|---|
| `index.html` | Page skeleton and script order. Core first, then one line per component |
| `config.js` | Everything site-specific: appointment types, rooms, visit rules, floor plan, patient-facing text, which components are on, `mode` |
| `scheduler.js` | **Slot finding** for pick-your-time booking: times where every exam on an invitation fits back to back, in an order the visit rules allow. No DOM; runs in Node |
| `engine.js` | **The queue engine.** Pooled queue, dispatch rule, visit rules, wait and arrival estimates. No DOM; runs in Node. This is what the server must reproduce |
| `demo-sim.js` | Demo only. A fictional clinic day: fake patients, a clock, and the staff taps real people make |
| `store.js` | **Data layer.** One interface, two adapters: `demo` (engine + simulator in the browser) and `api` (fetch to the routes below) |
| `app.js` | Shell: shared helpers, component registry, routing, rendering, the shared patient visit card, demo controls |
| `views/*.js` | One file per component (table above) |
| `visit-pass.css` | Styles, TSB white-and-teal. Uses the site's Hanken font from `/assets/fonts/` |
| `vendor/qrcode.js` | qrcode-generator 2.0.4 (MIT), same copy as the clinic portal |
| `img/video.jpg` | Poster for the explainer video |
| `tests/engine.js` | Engine unit tests (Node, no dependencies) |
| `tests/scheduler.js` | Scheduler and invitation rules (Node, no dependencies) |
| `tests/e2e.js` | Browser test of the whole demo (Playwright) |

## How it fits together

```
config.js ─┐
           ├─> engine.js ──> store.js ──> app.js (shell) ──> views/*.js
demo-sim.js┘   (rules,       (demo | api)   registry,         one per
                dispatch)                   render, card      component
```

Screens only **read** `store.state()` and only **change** things through store
methods. In api mode the browser still loads `engine.js`, but only to label
state (what is on hold and why, wait estimates). The server makes every decision.

## State the server sends

`GET /visit-api/floor` (staff screens) returns the floor. `GET /visit-api/visit/{token}`
(the patient's pass) returns the same shape, cut down to what that patient may
see, plus `meId`. Times are **minutes after midnight, clinic local time**
(`545` is 9:05), which keeps the estimates simple; convert at the API boundary.

```js
{
  now: 545,
  rules: { last: true, hold: true, ecgFirst: true },          // on/off per rule id in config
  rooms: [{ id: "b1", name: "Blood test 1", type: "blood", level: 1,
            state: "free" | "called" | "in", pid: "v123" | null, since: 540 }],
  patients: [{
    id: "v123", name: "Alex Taylor", call: "B-052", ref: "HV-P56R-U9ZW", token: "…",
    state: "expected" | "waiting" | "called" | "in" | "finished",
    dueAt: 540, arrivedAt: 541, cur: "b1" | null, finishedAt: null, bump: null,
    source: "Online booking", bookedOn: "2026-11-18",           // optional, shown on Patients
    steps: [{ type: "blood", status: "todo" | "called" | "in" | "done",
              room: "b1", calledAt: 541, start: 543, end: null, d: 5 }],
    feed: [{ t: 541, x: "Please come to the front desk when you can.", k: "staff" }]
  }],
  log: [{ t: 541, call: "B-052", room: "Blood test 1" }],      // newest first, last 8
  announcement: "",                                            // shown on the display
  surveys: [{ pid: "v123", t: 610, answers: { easy: 4, wait: "About right", again: "Yes", fix: {} } }],
  meId: "v123"                                                 // patient pass only
}
```

No field holds anything clinical: a name, a call number, a place and a time.
The pass itself carries no name (the QR code is `{qrPrefix}{token}`).
`tests/engine.js` checks the state for unexpected fields.

## Porting to the Laravel app (for John)

Set `mode: "api"` in `config.js` and implement these routes. Method names match `store.js`.

| Store method | Route | Engine function |
|---|---|---|
| `state()` (staff) | `GET /visit-api/floor` | — |
| `state()` (patient, `?pass=TOKEN`) | `GET /visit-api/visit/{token}` | — |
| `book(types)` | `POST /visit-api/visits` `{types}` | `addVisit` |
| `unbook()` | `DELETE /visit-api/visits/{id}` (only before check-in) | `removeVisit` |
| `checkIn(pid)` | `POST /visit-api/visits/{id}/check-in` (entrance kiosk) | `checkIn` |
| `scanDoor(pid, room)` | `POST /visit-api/rooms/{room}/scan` `{visit}` (door scanner) | `scanDoor` |
| `roomNext(room)` | `POST /visit-api/rooms/{room}/next` ("Patient arrived", then "Check out") | `roomNext` |
| `bump(pid, type)` | `POST /visit-api/visits/{id}/bump` `{type}` → `{ok, msg}` | `bump` |
| `setRule(id, on)` | `PUT /visit-api/rules/{id}` `{on}` | `setRule` |
| `message(pid, text)` | `POST /visit-api/visits/{id}/messages` `{text}` (preset texts only) | — |
| `announce(text)` | `PUT /visit-api/announcement` `{text}` | — |
| `survey(pid, answers)` | `POST /visit-api/visits/{id}/survey` | — |

The api adapter sends the CSRF token from `<meta name="csrf-token">` and polls
every `pollSeconds`. It has **not** been run against a real backend yet: treat
it as the contract, not as tested code.

### Pick-your-time booking (by invitation)

For imaging and other custom appointments. **Not public**: unlike Lab Online
Booking there is no open booking page. Only a patient with a link can book,
and only the exams on it.

1. Staff (Invitations screen) tick the exams and how soon: Urgent 2 days,
   Soon 7, Routine 30 (`selfBooking.priorities`). Slot IQ texts the patient a
   link with a random token. Exams that can be booked this way have
   `selfBook: true` in `config.js`; blood tests stay walk-in.
2. The patient opens the link and enters their **date of birth**. Nothing about
   the visit shows before that. 5 wrong tries lock the link; staff resend to unlock.
3. The patient sees days in the window (closed days greyed) and start times.
   Every time shown fits **all** the exams back to back: each in a free room of
   its type, in an order the visit rules allow (cardiologist last, and so on),
   with 5 minutes to walk between rooms, the whole visit within 2.5 hours.
   Same-day times start at least 2 hours from now.
4. They check the times and prep notes and book. The server re-checks the rooms
   (someone may have just taken them). They can add it to their calendar
   (a real `.ics` file), change it or cancel up to 24 hours before.
5. On the day the booking is a normal visit: it gets a call number and the
   Digital Visit Pass, with the booked arrival time.

| Store method | Route | Who |
|---|---|---|
| `invite({types, priority})` | `POST /visit-api/invites` → `{id, token, …}`; send the SMS here | staff |
| `resendInvite(id)` | `POST /visit-api/invites/{id}/resend` (new SMS, unlocks) | staff |
| `revokeInvite(id)` | `DELETE /visit-api/invites/{id}` (frees booked rooms) | staff |
| `state().invites` | in `GET /visit-api/floor` | staff |
| `openInvite(token)` | `GET /visit-api/i/{token}` → `{ok, locked, verified}`, nothing personal | patient |
| `verifyInvite(token, dob)` | `POST /visit-api/i/{token}/verify` `{answer}` → `{ok, invite}` or `{ok:false, reason, left}`; starts a session | patient |
| `slots(token, day)` | `GET /visit-api/i/{token}/slots?day=N` → plans | patient |
| `bookInvite(token, plan)` | `POST /visit-api/i/{token}/book` `{day, start}` → `{ok}` or `{ok:false, reason:"taken"}` | patient |
| `cancelInvite(token)` | `POST /visit-api/i/{token}/cancel` (refused inside 24 h) | patient |

A plan is `{day, start, end, arrive, steps: [{type, room, start, end}]}`; `day`
is days from today (send ISO dates on the wire if you prefer and convert in the
adapter). `tests/scheduler.js` is the spec for the server.

Server side, beyond the demo:

- **Room calendars.** The demo invents other patients' bookings. In production
  the scheduler needs each room's real booked time. **Open question for John:**
  do imaging rooms already have a calendar in another system (RIS/PACS
  scheduling), or does Slot IQ own it? That decides whether `busy(room, day)`
  reads our table or calls theirs.
- **No double booking.** Re-check and insert in one transaction with a lock per
  room and day (or a unique index on room + start).
- **Identity.** Check the date of birth against the patient record, count
  attempts per token, expire the token at the end of the window, and keep the
  patient's session short. Never return exams or names before verification.
- **Holidays** and per-room hours (`open`, `close`, `closedWeekdays` are site-wide in the demo).
- **On the day** the pooled queue still runs: a booked patient joins it when
  they scan in. Booked times reserve capacity; they don't skip the queue.

### Porting the engine

`engine.js` is about 220 lines and is the spec. Two options:

- **Port it to PHP** (a `VisitEngine` service). `tests/engine.js` lists the
  behaviours to keep; turn each into a PHPUnit test.
- **Run `engine.js` itself** in a small Node worker the Laravel app calls. Less
  to keep in sync, one more service to run.

What it must do:

- **One pooled queue.** When a room is free, call the patient who checked in
  earliest among those whose step for that room's type is open. A staff
  **bump** puts one patient first for one type, once.
- **Visit rules** (data in `config.js`, so a new clinic needs no code):
  `last` (this type only after every other step), `gap` (open N minutes after
  another step ends, e.g. 20 min after the blood test), `before` (this type
  only once another is done). Order and timing only; no rule reads a result.
- **Dispatch again** whenever a room frees up, a patient checks in, a rule
  changes, and **when the clock passes a gap's end** (a scheduled job every
  minute, or a delayed job at `end + minutes`).
- Wrong-door scans change nothing and return the right room.

The demo uses the clinic-day simulator for patients other than the demo
patient. In production that file is not loaded.

## Simulated in this demo

These parts look real on screen but need real work before launch:

1. **Sign-in and access.** Staff screens need the admin area's authentication.
   The patient pass link (`passBaseUrl` + token) needs a long random token,
   expiry at the end of the visit, and rate limiting on `/visit/{token}`.
2. **Live updates.** The api adapter polls. For the display and the station
   hub, a push channel (Laravel Echo / Reverb) is better.
3. **Pick-your-time SMS and identity check.** Links are shown, not texted; the
   date of birth is checked against a demo value (see "Pick-your-time booking").
4. **Scanning.** The QR code encodes `SLOTIQ-VISIT-{token}`; kiosks and door
   scanners need hardware and a check-in endpoint per device. NFC tap is shown, not built.
5. **Notifications.** "Your turn" texts and phone notifications are simulated
   (an SMS provider and web push are needed). Voice uses the browser's speech.
6. **Apple Wallet, ride booking, Google Maps directions** are simulated or link-only.
7. **AI assistant** replies are scripted from the live visit. A real assistant
   should get the same facts (where, when, what is on hold) as its only context.
8. **Translations** are a sample on the pass only.
9. **Map** is an example floor plan in `config.js`.
10. **Other clinics** on the Flow "Clinics" view are simulated; only this
   site's six rooms are live.
11. **Analytics** are computed in the browser from today's state. Production
    needs stored events (check-in, called, in, done per step) to report over time.

## Changes from the prototype artifact

- Split one 2,100-line file into the engine, data layer, shell and one file per component.
- The three heart-clinic rules became rule data with three kinds, so other clinics configure rules instead of coding them.
- Hospital name, address, rooms, floor plan, texts and colours moved to `config.js`.
- Announcements, staff messages and surveys go through the store, so they reach other devices.
- Removed screens that could no longer be reached (hero banner, badges, an older staff table, unused helpers).
- Added the **Booking** and **Your setup** screens to the staff app (they existed but had no way in), plus `?components=` and `?only=`.
- The engine is checked against the original: same calls, rooms and times through a whole day with every rule combination tried.

## Running the tests

```bash
node visit-pass/tests/engine.js
```

```bash
node visit-pass/tests/scheduler.js
```

```bash
npm i playwright && node visit-pass/tests/e2e.js
```

The browser test opens the page from disk (set `VISIT_PASS_URL` to test a
server). It plays the demo patient through all five appointments, sends the
survey and checks it in Analytics, switches a rule, scans at the wrong door,
sends a staff message to the phone, posts an announcement, drags on the
board, sends a pick-your-time link and books it as the patient (wrong date of
birth first, then a future day, then jumps to that day and checks the pass),
checks `?components=` and `?only=`, and checks phone width (390px)
for sideways scrolling. Screenshots go to `SHOTS_DIR` (default: the system temp folder).
