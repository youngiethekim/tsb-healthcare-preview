/* Works out a clinic's BC health authority from its address, so clinics never
 * have to know which region they're in.
 *
 * Order of evidence: municipality, then Google's regional district
 * (administrative_area_level_2). Health authority lines don't follow
 * municipal lines everywhere, so the TSB admin can correct a region before
 * approving. In the Laravel build this lookup runs on the server, ideally
 * against the official health authority boundary polygons (BC Data Catalogue),
 * using the latitude and longitude Google returns.
 */
(function () {
  "use strict";
  var HA = {
    vch: "Vancouver Coastal Health", fraser: "Fraser Health", interior: "Interior Health",
    island: "Island Health", northern: "Northern Health"
  };
  var CITY = {
    vch: ["vancouver", "richmond", "north vancouver", "west vancouver", "bowen island", "lions bay", "squamish", "whistler", "pemberton",
      "sechelt", "gibsons", "roberts creek", "halfmoon bay", "madeira park", "pender harbour", "powell river", "bella bella", "bella coola",
      "university endowment lands", "ubc", "britannia beach", "sea island"],
    fraser: ["burnaby", "new westminster", "coquitlam", "port coquitlam", "port moody", "anmore", "belcarra", "maple ridge", "pitt meadows",
      "surrey", "white rock", "delta", "ladner", "tsawwassen", "north delta", "langley", "fort langley", "aldergrove", "walnut grove", "cloverdale",
      "abbotsford", "mission", "chilliwack", "sardis", "agassiz", "kent", "harrison hot springs", "hope", "boston bar", "yale"],
    interior: ["kelowna", "west kelowna", "lake country", "peachland", "kamloops", "vernon", "coldstream", "armstrong", "enderby", "penticton",
      "summerland", "oliver", "osoyoos", "keremeos", "princeton", "salmon arm", "sicamous", "revelstoke", "golden", "invermere", "cranbrook",
      "kimberley", "fernie", "sparwood", "creston", "nelson", "castlegar", "trail", "rossland", "nakusp", "grand forks", "williams lake",
      "100 mile house", "merritt", "lillooet", "clearwater", "chase", "ashcroft", "logan lake", "cache creek"],
    island: ["victoria", "saanich", "oak bay", "esquimalt", "langford", "colwood", "view royal", "sooke", "sidney", "central saanich",
      "north saanich", "metchosin", "highlands", "duncan", "north cowichan", "lake cowichan", "ladysmith", "chemainus", "nanaimo", "lantzville",
      "parksville", "qualicum beach", "port alberni", "tofino", "ucluelet", "courtenay", "comox", "cumberland", "campbell river", "port hardy",
      "port mcneill", "salt spring island", "ganges", "gabriola"],
    northern: ["prince george", "fort st. john", "fort st john", "dawson creek", "chetwynd", "tumbler ridge", "fort nelson", "terrace", "kitimat",
      "prince rupert", "smithers", "houston", "burns lake", "vanderhoof", "fort st. james", "fort st james", "fraser lake", "quesnel",
      "mackenzie", "valemount", "mcbride", "hazelton", "stewart", "dease lake", "masset", "daajing giids", "queen charlotte"]
  };
  // Regional districts that sit inside one health authority. Metro Vancouver
  // and Cariboo are split between two, so they are left out on purpose.
  var DISTRICT = {
    "fraser valley": "fraser", "squamish-lillooet": "vch", "sunshine coast": "vch", "qathet": "vch", "powell river": "vch", "central coast": "vch",
    "capital": "island", "cowichan valley": "island", "nanaimo": "island", "comox valley": "island", "strathcona": "island",
    "alberni-clayoquot": "island", "mount waddington": "island",
    "central okanagan": "interior", "north okanagan": "interior", "okanagan-similkameen": "interior", "thompson-nicola": "interior",
    "columbia-shuswap": "interior", "kootenay boundary": "interior", "central kootenay": "interior", "east kootenay": "interior",
    "fraser-fort george": "northern", "peace river": "northern", "bulkley-nechako": "northern", "kitimat-stikine": "northern",
    "north coast": "northern", "northern rockies": "northern"
  };
  var byCity = {};
  Object.keys(CITY).forEach(function (r) { CITY[r].forEach(function (c) { byCity[c] = r; }); });

  function norm(s) {
    return String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
      .replace(/^(city|district|township|town|village|corporation) of (the )?/, "").replace(/\s+/g, " ").trim();
  }
  function district(s) { return norm(s).replace(/^regional district of /, "").replace(/ regional district$/, "").replace(/^(the )?/, ""); }

  // lookup({ city, district }) -> { id, name, source } or null
  function lookup(a) {
    var c = norm(a && a.city);
    if (c && byCity[c]) return { id: byCity[c], name: HA[byCity[c]], source: "city" };
    var d = district(a && a.district);
    if (d && DISTRICT[d]) return { id: DISTRICT[d], name: HA[DISTRICT[d]], source: "district" };
    return null;
  }

  window.ClinicRegions = { lookup: lookup, names: HA };
})();
