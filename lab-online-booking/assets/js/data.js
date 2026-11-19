/* Lab Online Booking.ca — site configuration and SAMPLE data.
   ---------------------------------------------------------------
   Everything below is placeholder content for the front-end build.
   In production these come from the booking platform (Slot IQ):
     - LOB_CONFIG.appointmentsSince2018 -> GET /api/stats/appointments
     - LOB_AUTHORITIES                  -> organization records
     - LOB_LOCATIONS                    -> GET /api/locations
     - time slots                       -> GET /api/locations/{id}/availability?date=YYYY-MM-DD
   Location names below are SAMPLE names, not real site records. */

window.LOB_CONFIG = {
  // Demo mode keeps bookings in this browser (localStorage). Set to false
  // once the pages call the real API.
  demo: true,

  // Hero counter. Replace with the live figure from platform reporting.
  appointmentsSince2018: 4500000,

  supportEmail: "support@labonlinebooking.ca"
};

window.LOB_AUTHORITIES = [
  { id: "vch",  name: "Vancouver Coastal Health" },
  { id: "fh",   name: "Fraser Health" },
  { id: "ih",   name: "Interior Health" },
  { id: "phc",  name: "Providence Health Care" },
  { id: "phsa", name: "Provincial Health Services Authority" }
];

// Postal code prefixes (FSA, first 2 characters) -> nearest sample city.
window.LOB_FSA = {
  V5: "Vancouver", V6: "Vancouver", V7: "North Vancouver",
  V3: "Surrey", V4: "Langley", V2: "Abbotsford",
  V1: "Kelowna", V0: "Kamloops"
};

window.LOB_LOCATIONS = [
  { id: "van-downtown",   ha: "vch",  name: "Downtown Vancouver Outpatient Lab", city: "Vancouver",       services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Fri 7:00–15:30" },
  { id: "van-westside",   ha: "vch",  name: "Westside Community Lab",            city: "Vancouver",       services: ["Blood collection", "Urine"],               hours: "Mon–Fri 7:30–15:00" },
  { id: "richmond",       ha: "vch",  name: "Richmond Hospital Outpatient Lab",  city: "Richmond",        services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Sat 7:00–15:00" },
  { id: "north-van",      ha: "vch",  name: "North Shore Outpatient Lab",        city: "North Vancouver", services: ["Blood collection", "Urine"],               hours: "Mon–Fri 7:00–15:00" },
  { id: "sechelt",        ha: "vch",  name: "Sunshine Coast Lab",                city: "Sechelt",         services: ["Blood collection"],                        hours: "Mon–Fri 8:00–14:00" },
  { id: "surrey-central", ha: "fh",   name: "Surrey Central Lab",                city: "Surrey",          services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Sat 6:30–16:00" },
  { id: "burnaby",        ha: "fh",   name: "Burnaby Outpatient Lab",            city: "Burnaby",         services: ["Blood collection", "Urine"],               hours: "Mon–Fri 7:00–15:30" },
  { id: "langley",        ha: "fh",   name: "Langley Community Lab",             city: "Langley",         services: ["Blood collection", "Urine"],               hours: "Mon–Fri 7:00–15:00" },
  { id: "abbotsford",     ha: "fh",   name: "Abbotsford Outpatient Lab",         city: "Abbotsford",      services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Sat 7:00–15:00" },
  { id: "new-west",       ha: "fh",   name: "New Westminster Lab",               city: "New Westminster", services: ["Blood collection"],                        hours: "Mon–Fri 7:30–15:00" },
  { id: "kelowna",        ha: "ih",   name: "Kelowna Outpatient Lab",            city: "Kelowna",         services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Fri 7:00–16:00" },
  { id: "kamloops",       ha: "ih",   name: "Kamloops Community Lab",            city: "Kamloops",        services: ["Blood collection", "Urine"],               hours: "Mon–Fri 7:00–15:00" },
  { id: "penticton",      ha: "ih",   name: "Penticton Outpatient Lab",          city: "Penticton",       services: ["Blood collection"],                        hours: "Mon–Fri 7:30–14:30" },
  { id: "phc-downtown",   ha: "phc",  name: "Providence Downtown Outpatient Lab", city: "Vancouver",      services: ["Blood collection", "Urine", "ECG"],        hours: "Mon–Fri 7:00–15:30" },
  { id: "phc-east",       ha: "phc",  name: "Providence East Vancouver Lab",     city: "Vancouver",       services: ["Blood collection"],                        hours: "Mon–Fri 7:30–15:00" },
  { id: "phsa-women",     ha: "phsa", name: "Provincial Specialty Outpatient Lab", city: "Vancouver",     services: ["Blood collection", "Prenatal screening"],  hours: "Mon–Fri 8:00–15:00" }
];
