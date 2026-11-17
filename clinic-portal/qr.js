/* QR rendering for the clinic portal.
   Rules from the brief: error correction H, quiet zone of four modules,
   black on white only, no logo inside the code. SVG and a 1024 px PNG. */
(function () {
  "use strict";
  var QUIET = 4;

  function matrix(text) {
    var q = qrcode(0, "H"); // type 0 = smallest version that fits
    q.addData(text, "Byte");
    q.make();
    var n = q.getModuleCount();
    return { n: n, dark: function (r, c) { return q.isDark(r, c); } };
  }

  function svg(text, opts) {
    opts = opts || {};
    var m = matrix(text), size = m.n + QUIET * 2, d = "";
    for (var r = 0; r < m.n; r++) {
      for (var c = 0; c < m.n; c++) {
        if (!m.dark(r, c)) continue;
        // merge horizontal runs to keep the file small
        var start = c; while (c + 1 < m.n && m.dark(r, c + 1)) c++;
        d += "M" + (start + QUIET) + " " + (r + QUIET) + "h" + (c - start + 1) + "v1h-" + (c - start + 1) + "z";
      }
    }
    var attrs = opts.px ? ' width="' + opts.px + '" height="' + opts.px + '"' : "";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + size + " " + size + '"' + attrs +
      ' shape-rendering="crispEdges" role="img" aria-label="QR code"><rect width="' + size + '" height="' + size +
      '" fill="#ffffff"/><path fill="#000000" d="' + d + '"/></svg>';
  }

  function canvas(text, px) {
    px = px || 1024;
    var m = matrix(text), size = m.n + QUIET * 2;
    var scale = Math.floor(px / size), off = Math.floor((px - scale * size) / 2) + QUIET * scale;
    var cv = document.createElement("canvas"); cv.width = px; cv.height = px;
    var g = cv.getContext("2d");
    g.fillStyle = "#ffffff"; g.fillRect(0, 0, px, px);
    g.fillStyle = "#000000";
    for (var r = 0; r < m.n; r++) for (var c = 0; c < m.n; c++) if (m.dark(r, c)) g.fillRect(off + c * scale, off + r * scale, scale, scale);
    return cv;
  }

  function download(name, blob) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  window.ClinicQR = {
    svg: svg,
    downloadSVG: function (text, name) { download(name, new Blob([svg(text)], { type: "image/svg+xml" })); },
    downloadPNG: function (text, name) { canvas(text, 1024).toBlob(function (b) { download(name, b); }, "image/png"); }
  };
})();
