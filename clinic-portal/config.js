/* Lab Online Booking — Clinic Portal configuration.
   Mirrors the env values in the build brief so the Laravel port maps 1:1. */
window.CLINIC_PORTAL_CONFIG = {
  // CLINIC_PORTAL_ENABLED — the whole module is dark when false.
  enabled: true,

  // "demo" keeps everything in this browser (localStorage) so the flow can be
  // reviewed on a static host. "api" calls the Laravel routes in README.md.
  mode: "demo",
  apiBase: "/clinic-api",

  // Base domain for every link and QR code. Never hard-code it elsewhere.
  baseUrl: "https://labonlinebooking.ca",

  // Where a printed code falls back to when a clinic is unknown, pending,
  // rejected or suspended. A printed code must never dead-end.
  fallbackUrl: "https://labonlinebooking.ca/",

  // Existing booking flow entry. {region} is replaced for the preselect.
  bookingUrl: "https://labonlinebooking.ca/?region={region}",

  // Health authority regions. In the real build these come from the existing
  // organization records, not from this list.
  regions: [
    { id: "vch", name: "Vancouver Coastal Health" },
    { id: "fraser", name: "Fraser Health" }
  ],

  // Google Maps JavaScript API key for address autocomplete at sign-up.
  // Leave empty to have clinics type their address. Restrict the key to this
  // site's HTTP referrers and enable "Maps JavaScript API" + "Places API (New)".
  googleMapsApiKey: "",

  emrOptions: ["Accuro", "MedAccess", "OSCAR Pro", "Juno EMR", "Profile EMR", "Wolf", "CHR", "Other"],

  // CLINIC_STAND_MONTHLY_CAP — approvals per month before requests wait.
  standMonthlyCap: 25,

  supportEmail: "clinics@labonlinebooking.ca",

  loginLinkMinutes: 15,
  loginLinksPerHour: 5,
  sessionIdleHours: 12,
  attributionHours: 24
};
