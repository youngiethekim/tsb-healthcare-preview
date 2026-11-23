/* Slot IQ Digital Visit Pass: site configuration.
   Everything that changes from one hospital or clinic to the next lives here,
   so the engine and the screens stay the same. In the Laravel build these
   values come from the site's records (appointment types, rooms, rules) and
   are sent to the browser in the first GET (see README.md). */
window.VISIT_PASS_CONFIG = {
  // "demo" runs the whole floor in this browser with fake patients and a
  // simulated clock. "api" talks to the routes listed in README.md.
  mode: "demo",

  // Which components this site runs (ids from views/*.js). null means all of
  // them. A URL can narrow it for a demo: ?components=pass,kiosk,display
  //   pass      Digital Visit Pass (patient phone)   assist    AI assistant (in the pass)
  //   flow      Live floor, board, clinics           journeys  Patients (visit lines)
  //   booking   Book a visit                         kiosk     Check-in kiosk + door scanners
  //   display   Waiting room display                 stations  Station hub (staff)
  //   rules     Visit rules                          insight   Analytics
  //   setup     Pick components
  components: null,
  apiBase: "/visit-api",
  pollSeconds: 3,

  site: {
    name: "Harbourview Hospital",
    note: "(fictional)",
    address: "Main entrance, Door A · 1200 Harbour Road (example address)",
    mapsUrl: "https://www.google.com/maps/dir/?api=1&destination=hospital+main+entrance",
    assistantPhone: "604-555-0142 (demo number)",
    passBaseUrl: "https://slotiq.example/v/",   // shareable visit link: {passBaseUrl}{token}
    qrPrefix: "SLOTIQ-VISIT-",                  // the QR code encodes {qrPrefix}{token}
    refPrefix: "HV-"
  },

  // Appointment types. dur is the typical length in minutes; where is shown
  // to the patient. The array order is the order a visit is listed in.
  types: [
    { id: "blood",   name: "Blood test",     short: "Blood",  dur: 5,  where: "Level 1, Lab",          color: "#e0605e", dark: "#c94a48", colorName: "red" },
    { id: "ecg",     name: "Cardiogram",     short: "ECG",    dur: 10, where: "Level 2, Heart tests",  color: "#12a89d", dark: "#0e877e", colorName: "teal" },
    { id: "xray",    name: "X-ray",          short: "X-ray",  dur: 10, where: "Level 1, Imaging",      color: "#4f86e8", dark: "#3a6fd0", colorName: "blue" },
    { id: "echo",    name: "Echocardiogram", short: "Echo",   dur: 25, where: "Level 2, Heart tests",  color: "#9a63d8", dark: "#8350c4", colorName: "purple" },
    { id: "consult", name: "Cardiologist",   short: "Doctor", dur: 15, where: "Level 3, Heart clinic", color: "#d98a14", dark: "#b56f08", colorName: "orange" }
  ],

  // Rooms. Each serves one appointment type. level is the floor (for directions).
  rooms: [
    { id: "b1", name: "Blood test 1",        type: "blood",   level: 1 },
    { id: "b2", name: "Blood test 2",        type: "blood",   level: 1 },
    { id: "e1", name: "Cardiogram room",     type: "ecg",     level: 2 },
    { id: "x1", name: "X-ray room",          type: "xray",    level: 1 },
    { id: "h1", name: "Echo room",           type: "echo",    level: 2 },
    { id: "c1", name: "Consultation room 3", type: "consult", level: 3 }
  ],

  // Visit rules: what must come first. Order and timing only; no rule ever
  // reads a result. Three kinds:
  //   last   - `type` is called only after every other step on the visit is done
  //   gap    - `before` opens `minutes` after `after` ends (`after` first, then a wait)
  //   before - `then` is offered only once `first` is done
  // `on` is the default; staff can switch each rule in Visit rules.
  rules: [
    { id: "last",     kind: "last",   type: "consult", on: true,
      label: "Cardiologist comes last",
      desc: "The patient is not called to the cardiologist until every selected test is done." },
    { id: "hold",     kind: "gap",    after: "blood", before: "consult", minutes: 20, why: "lab needs", on: true,
      label: "Hold 20 minutes after the blood test",
      desc: "The lab needs time before the consult. Slot IQ starts a timer when the blood appointment ends. It never reads a result." },
    { id: "ecgFirst", kind: "before", first: "ecg", then: "echo", on: true,
      label: "Cardiogram before Echocardiogram",
      desc: "The echo room is only offered once the cardiogram is done." }
  ],

  // Example floor plan for the patient map: [id, x, y, w, h, label, level].
  // Room ids match `rooms`; kiosk, w1-w3 and cafe are landmarks.
  map: {
    places: [
      ["kiosk", 34, 244, 66, 52, "Check-in", 1], ["w1", 108, 244, 180, 52, "Waiting area", 1],
      ["b1", 352, 244, 84, 52, "Blood test 1", 1], ["b2", 442, 244, 84, 52, "Blood test 2", 1], ["x1", 532, 244, 92, 52, "X-ray room", 1],
      ["e1", 34, 138, 124, 52, "Cardiogram room", 2], ["h1", 164, 138, 124, 52, "Echo room", 2], ["w2", 352, 138, 130, 52, "Lounge", 2], ["cafe", 488, 138, 136, 52, "Café", 2],
      ["w3", 352, 32, 130, 52, "Lounge", 3], ["c1", 488, 32, 136, 52, "Consultation room 3", 3]
    ],
    corridors: { 1: 308, 2: 202, 3: 96 },
    floors: [[3, 10, "LEVEL 3 · HEART CLINIC"], [2, 116, "LEVEL 2 · HEART TESTS"], [1, 222, "LEVEL 1 · ENTRANCE, LAB, IMAGING"]],
    beacons: [[26, 308], [320, 308], [320, 202], [320, 96], [198, 308], [417, 202], [417, 96]]
  },

  // Patient-facing content written by the clinic.
  content: {
    bring: ["This pass, on your phone or printed", "Your health card", "Your request form, if you were given a paper one", "Something to read. Your visit may take about 2 hours."],
    prep: ["Arrive 10 minutes before your first time.", "Do not eat for 8 hours before your blood test. Water is fine.", "Wear a top that is easy to open for the cardiogram."],
    staffMessages: ["We are running about 10 minutes behind. Thank you for waiting.", "Please come to the front desk when you can.", "Please return to the waiting area. You are up soon."],
    screenNotes: ["Have your Digital Visit Pass ready to scan at the door.", "We call numbers, never names. Your number is on your pass.", "The café and washrooms are beside the elevator on Level 2."],
    announcements: ["X-ray is running about 10 minutes behind.", "Flu shots are available today on Level 1."],
    // End-of-visit survey: question 4 choices. About the visit, never about care.
    surveyFix: ["Signs were unclear", "Calls were easy to miss", "The phone was confusing", "Nothing, all good"]
  },

  // Demo only: the clinic day the simulator plays, in minutes after midnight.
  demo: {
    seed: 20261110, open: 510, lastArrival: 750, warmUp: 25, arriveBy: "9:00",
    patientName: "Alex Taylor", patientCall: "B-052", clinicName: "Heart clinic",
    // Share of fake patients who need each type.
    mix: { blood: 0.9, ecg: 0.5, xray: 0.35, echo: 0.2, consult: 0.35 }
  },

  videoUrl: "https://d2ol7oe51mr4n9.cloudfront.net/user_35Csi86aAx3UXarzpDpouDyxXNc/90de0ca4-418a-4329-bf4a-a6e34d759d6f.mp4"
};
