/* Google address autocomplete for clinic sign-up.
 *
 * Off until config.googleMapsApiKey is set. With a key it loads the Maps
 * JavaScript API and shows Google's place search; picking a result fills the
 * ordinary address fields, which stay editable. Without a key (or if Google
 * fails to load) clinics just type their address, and the health authority is
 * still worked out from the city.
 *
 * Key setup: enable "Maps JavaScript API" and "Places API (New)", and restrict
 * the key to the site's HTTP referrers (labonlinebooking.ca/*).
 */
(function () {
  "use strict";
  var CFG = window.CLINIC_PORTAL_CONFIG;
  var BC = { north: 60.0, south: 48.2, east: -114.0, west: -139.1 };
  var loading = null;

  function load() {
    if (window.google && google.maps && google.maps.importLibrary) return Promise.resolve();
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      var cb = "__lobPlacesReady";
      window[cb] = function () { resolve(); };
      var s = document.createElement("script");
      s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(CFG.googleMapsApiKey) +
        "&v=weekly&loading=async&libraries=places&region=CA&language=en&callback=" + cb;
      s.async = true; s.onerror = function () { reject(new Error("Google Maps did not load")); };
      document.head.appendChild(s);
      setTimeout(function () { reject(new Error("Google Maps timed out")); }, 10000);
    });
    return loading;
  }

  // Normalise Google's address components (new and legacy shapes) into our fields.
  function parse(components, location) {
    var get = function (type, short) {
      var c = (components || []).filter(function (x) { return (x.types || []).indexOf(type) >= 0; })[0];
      if (!c) return "";
      return short ? (c.shortText || c.short_name || "") : (c.longText || c.long_name || "");
    };
    var lat = location && (typeof location.lat === "function" ? location.lat() : location.lat);
    var lng = location && (typeof location.lng === "function" ? location.lng() : location.lng);
    return {
      address_line1: [get("street_number"), get("route")].filter(Boolean).join(" "),
      address_line2: get("subpremise"),
      city: get("locality") || get("sublocality") || get("administrative_area_level_3"),
      district: get("administrative_area_level_2"),
      province: get("administrative_area_level_1", true),
      postal_code: get("postal_code"),
      country: get("country", true),
      lat: lat == null ? null : Math.round(lat * 1e5) / 1e5,
      lng: lng == null ? null : Math.round(lng * 1e5) / 1e5
    };
  }

  // attach(container, onPick) — resolves true when Google search is shown.
  async function attach(container, onPick) {
    if (!CFG.googleMapsApiKey || !container) return false;
    try {
      await load();
      var places = await google.maps.importLibrary("places");
      container.innerHTML = "";
      if (places.PlaceAutocompleteElement) {
        var el = new places.PlaceAutocompleteElement({ includedRegionCodes: ["ca"], locationRestriction: BC });
        el.setAttribute("aria-label", "Search for your clinic's address");
        el.addEventListener("gmp-select", async function (ev) {
          var place = ev.placePrediction.toPlace();
          await place.fetchFields({ fields: ["addressComponents", "location"] });
          onPick(parse(place.addressComponents, place.location));
        });
        container.appendChild(el);
      } else {
        var input = document.createElement("input");
        input.type = "text"; input.placeholder = "Start typing your clinic's address"; input.setAttribute("aria-label", "Search for your clinic's address");
        container.appendChild(input);
        var ac = new places.Autocomplete(input, { componentRestrictions: { country: "ca" }, bounds: BC, strictBounds: true, fields: ["address_components", "geometry"], types: ["address"] });
        ac.addListener("place_changed", function () { var p = ac.getPlace(); onPick(parse(p.address_components, p.geometry && p.geometry.location)); });
      }
      return true;
    } catch (e) {
      container.innerHTML = "";
      return false;
    }
  }

  window.ClinicPlaces = { attach: attach, parse: parse };
})();
