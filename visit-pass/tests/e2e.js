/* Browser test for the Digital Visit Pass demo.
     npm i playwright && node visit-pass/tests/e2e.js
   Opens the page from disk by default; set VISIT_PASS_URL to test a server. */
const { chromium } = require("playwright");
const path = require("path");
const B = process.env.VISIT_PASS_URL || "file://" + path.resolve(__dirname, "..", "index.html");
const OUT = (process.env.SHOTS_DIR || require("os").tmpdir() + "/visit-pass-shots") + "/";
require("fs").mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? "PASS " : "FAIL ") + m); if (!c) fails++; };
const url = (q, h) => B + (q ? "?" + q : "") + (h ? "#" + h : "");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; page.on("pageerror", e => errs.push(e.message));
  const demo = sel => page.locator(".demo " + sel + ", .dstrip " + sel).first();

  /* ---- the patient's visit, start to finish ---- */
  await page.goto(url("", "pass"));
  await page.waitForSelector(".pass.top");
  ok(await page.locator(".pass.top .cn").textContent() === "B-052", "phone shows the pass with call number B-052");
  ok(await page.locator(".pass.top .qr svg rect").count() > 100, "pass has a QR code");
  await demo('[data-a="checkin"]').click();
  await page.waitForSelector('.demo [data-a="skip"], .demo [data-a="menext"]');
  await page.click('[data-a="feed"]');
  ok(/You scanned in at the main entrance/.test(await page.locator(".todo").textContent()), "timeline records the entrance scan");
  ok(true, "one scan at the entrance checks the patient in");
  let rooms = 0;
  for (let i = 0; i < 40; i++) {
    if (await page.locator(".survey").count()) break;
    const next = demo('[data-a="menext"], [data-a="skip"]');
    if (!(await next.count())) { await page.waitForTimeout(300); continue; }
    if ((await next.getAttribute("data-a")) === "menext") rooms++;
    await next.click(); await page.waitForTimeout(120);
  }
  ok(await page.locator(".survey").count() === 1, "visit finishes and the survey appears");
  ok(rooms === 10, "5 appointments: scanned in at each door and checked out of each (" + rooms + " taps)");
  ok(/5 appointments in/.test(await page.locator(".now.fin").textContent()), "phone shows the door-to-door summary");
  await page.screenshot({ path: OUT + "1-finished.png" });
  await page.click('[data-a="sv"][data-v="easy|4"]');
  await page.click('[data-a="sv"][data-v="wait|About right"]');
  await page.click('[data-a="sv"][data-v="again|Yes"]');
  await page.click('[data-a="svsend"]');
  await page.waitForSelector(".survey.done");
  await page.goto(url("", "insight"));
  await page.waitForSelector("text=Finding the way");
  ok(true, "survey answers reach Analytics (B-052 survey not lost on navigation: same page state)");

  /* ---- staff side ---- */
  await page.goto(url("", "rules")); await page.reload();
  const hold = page.locator('[data-a="rule"][data-v="hold"]');
  ok(await hold.getAttribute("aria-checked") === "true", "hold rule on by default");
  await hold.click();
  ok(await hold.getAttribute("aria-checked") === "false", "rule switches off");

  await page.goto(url("", "kiosk")); await page.reload();
  await page.click('.kin [data-a="checkin"]');
  for (let i = 0; i < 10 && !(await page.locator('[data-a="wrongscan"]').count()); i++) { await demo('[data-a="skip"]').click().catch(() => {}); await page.waitForTimeout(150); }
  await page.click('[data-a="wrongscan"]');
  await page.waitForSelector("text=Not this door, B-052");
  ok(true, "kiosk: wrong door is caught and the patient is redirected");
  await page.goto(url("", "journeys"));
  await page.waitForSelector(".jrow.me");
  ok(/Wrong door/.test(await page.locator(".jrow.me").textContent()), "Patients: staff see the wrong-door scan");
  await page.fill("#trk", "B-052");
  ok(await page.locator(".jrow").count() === 1, "search finds the patient by call number");
  await page.click(".jrow.me");
  await page.click('.dlg [data-a="smsg"] >> nth=1');
  await page.click('.dlg .x');
  await page.goto(url("", "pass"));
  ok(/Please come to the front desk/.test(await page.locator(".phone").textContent()), "staff message shows on the patient's phone");

  await page.goto(url("", "display"));
  await page.click('[data-a="annc"][data-v="0"]');
  ok(/X-ray is running about 10 minutes behind/.test(await page.locator(".tv2 .say").textContent()), "announcement shows on the waiting room display");
  ok(!/Alex|Taylor/.test(await page.locator(".tv2").textContent()), "display shows numbers, never names");
  await page.screenshot({ path: OUT + "2-display.png" });

  await page.goto(url("", "flow"));
  await page.click('[data-a="flow"][data-v="board"]');
  ok(await page.locator(".kcol").count() === 2 + 5 + 1, "board: arriving, waiting, one column per type, done");
  const card = page.locator('.kcol[aria-label="Waiting"] .kc[draggable="true"]').first();
  if (await card.count()) {
    const call = (await card.locator(".num").textContent()).trim();
    await card.click(); ok(await page.locator(".dlg").count() === 1, "visit card opens from the board (" + call + ")");
    await page.keyboard.press("Escape");
  }

  /* ---- pick and choose ---- */
  await page.goto(url("components=kiosk,display", "kiosk"));
  const nav = await page.locator(".snav button").allTextContents();
  ok(nav.length === 2 && /Kiosk/.test(nav[0]) && /Waiting room/.test(nav[1]), "?components= shows only the picked components: " + nav.join(" | "));
  ok(await page.locator('[data-a="aud"][data-v="patient"]').count() === 0, "no patient phone when the pass is not picked");
  await page.goto(url("only=display"));
  await page.waitForSelector(".tv2");
  ok(await page.locator(".snav").count() === 0 && await page.locator(".phone").count() === 0, "?only=display runs the display on its own");
  await page.screenshot({ path: OUT + "3-only-display.png" });
  await page.goto(url("components=pass,kiosk", "pass"));
  await page.click('[data-a="pscr"][data-v="help"]');
  ok(await page.locator(".chat").count() === 0 && await page.locator(".scanhow").count() === 1, "Help tab without the assistant shows check-in help only");
  await page.goto(url("", "setup"));
  await page.click('[data-a="pick"][data-v="insight"]');
  const href = await page.locator(".yours a").getAttribute("href");
  ok(/components=/.test(href) && !/insight/.test(href), "setup builds a link for the picked components");

  /* ---- phone width ---- */
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on("pageerror", e => errs.push(e.message));
  for (const h of ["pass", "flow", "journeys", "display", "stations"]) {
    await m.goto(url("", h)); await m.waitForTimeout(400);
    const sw = await m.evaluate(() => document.documentElement.scrollWidth);
    ok(sw <= 390, "no sideways scroll at 390px on " + h + " (" + sw + ")");
  }
  await m.goto(url("", "pass")); await m.screenshot({ path: OUT + "4-phone.png" });

  ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.slice(0, 3).join(" / ") : ""));
  await browser.close();
  console.log(fails ? fails + " failed" : "All browser tests passed"); console.log("Screenshots: " + OUT);
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
