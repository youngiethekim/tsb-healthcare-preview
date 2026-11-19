const { chromium } = require('playwright');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const fs = require('fs');
const B = process.env.PORTAL_URL || 'http://localhost:8765/clinic-portal/';
const OUT = (process.env.SHOTS_DIR || require('os').tmpdir() + '/clinic-portal-shots') + '/';
fs.mkdirSync(OUT, { recursive: true });
let fails = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1', acceptDownloads: true, viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  page.on('dialog', d => d.accept(d.type() === 'prompt' ? 'Not a referring clinic' : undefined));

  await page.goto(B + '#/register');
  await page.fill('#name', 'Dana MOA'); await page.fill('#email', 'dana@pacificblvd.ca');
  await page.fill('#clinicName', 'Pacific Blvd Clinic'); await page.selectOption('#region', 'vch');
  await page.click('button[type=submit]');
  ok(await page.locator('.err').isVisible(), 'terms checkbox required');
  await page.check('input[name=terms]'); await page.click('button[type=submit]');
  const link = await page.locator('.demo-link').getAttribute('href');
  ok(/#\/auth\/[0-9a-f]{64}$/.test(link), 'sign-in link issued');
  await page.goto(link); await page.waitForSelector('[data-npc=pending]');
  ok(true, 'pending banner shown after sign-in');
  await page.screenshot({ path: OUT + '1-pending.png' });
  // single-use
  await page.goto(link); await page.waitForSelector('text=Link not valid');
  ok(true, 'sign-in link fails on second use');
  await page.goto(B + '#/kit'); await page.waitForSelector('.locked');
  ok(true, 'kit locked while pending');
  const code = await page.evaluate(() => JSON.parse(localStorage.getItem('lobcp:v1')).clinics[0].short_code);
  ok(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(code), 'short code format ' + code);
  // public link while pending -> fallback
  const p2 = await ctx.newPage();
  await p2.route('https://labonlinebooking.ca/**', r => r.fulfill({ body: 'LOB HOME' }));
  await p2.goto(B + 'c/?code=' + code + '&m=qr'); await p2.waitForURL(/labonlinebooking\.ca\/$/);
  ok(true, 'pending clinic link falls back to booking home');

  // profile save
  await page.goto(B + '#/profile');
  await page.fill('#a1', '123 Pacific Blvd'); await page.fill('#city', 'Vancouver'); await page.fill('#pc', 'V6B 1A1');
  await page.fill('#display_name', 'Pacific Blvd <script>alert(1)</script>');
  await page.click('#f button[type=submit]'); await page.waitForSelector('.toast');
  ok((await page.textContent('.who')).includes('<script>'), 'clinic name escaped (rendered as text)');
  await page.fill('#display_name', 'Pacific Blvd Clinic'); await page.click('#f button[type=submit]');
  // logo upload (1x1 png)
  const png = new PNG({ width: 40, height: 20 }); png.data.fill(120); fs.writeFileSync(OUT + 'logo.png', PNG.sync.write(png));
  fs.writeFileSync(OUT + 'fake.png', '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
  await page.setInputFiles('#logo', OUT + 'fake.png'); await page.click('#lf button[type=submit]');
  await page.waitForSelector('#lf .form-msg:not([hidden])');
  ok((await page.textContent('#lf .form-msg')).includes('PNG or JPG'), 'rejects non-image disguised as .png');
  await page.setInputFiles('#logo', OUT + 'logo.png'); await page.click('#lf button[type=submit]');
  await page.waitForSelector('.pill.pending');
  ok(true, 'logo pending review');

  // admin approve
  await page.goto(B + '#/admin'); await page.click('[data-act=approve]');
  await page.waitForSelector('text=Your clinic is approved');
  ok(true, 'approval email in outbox');
  await page.screenshot({ path: OUT + '2-admin.png', fullPage: true });

  // kit
  await page.goto(B + '#/kit'); await page.waitForSelector('#qr svg');
  ok((await page.inputValue('#l-share')) === 'https://labonlinebooking.ca/vch/pacific-blvd', 'shareable link /vch/pacific-blvd');
  await page.screenshot({ path: OUT + '3-kit.png', fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#png')]);
  const pth = OUT + 'qr.png'; await dl.saveAs(pth);
  const img = PNG.sync.read(fs.readFileSync(pth));
  ok(img.width === 1024 && img.height === 1024, 'PNG is 1024px');
  const dec = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  ok(dec && dec.data === 'https://labonlinebooking.ca/c/' + code + '?m=qr', 'QR decodes to ' + (dec && dec.data));
  const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('#svg')]);
  ok(dl2.suggestedFilename().endsWith('.svg'), 'SVG download');

  // printables: every clinic format, QR >= 1 inch, required copy, exact page size, one page
  const SIZES = { poster: [612, 792], tabloid: [792, 1224], counter: [360, 504], card: [288, 432], tent: [612, 792], handouts: [612, 792] };
  for (const t of Object.keys(SIZES)) {
    const pp = await ctx.newPage(); await pp.goto(B + 'print/?type=' + t); await pp.waitForSelector('.sheet .qrcard svg');
    const txt = (await pp.textContent('.sheet')).toLowerCase();
    ok(txt.includes('need bloodwork?') && txt.includes('book your lab visit') && txt.includes('pacific blvd clinic') &&
       txt.includes(('labonlinebooking.ca/c/' + code).toLowerCase()) && txt.includes('bc services card'), t + ' copy + name + short link');
    const widths = await pp.$$eval('.qrcard svg', els => els.map(e => e.getBoundingClientRect().width));
    ok(Math.min(...widths) >= 96, t + ' every QR >= 1in (' + Math.round(Math.min(...widths)) + 'px)');
    ok(!(await pp.locator('.sheet img.clogo').count()), t + ' unapproved logo not printed');
    const pdf = await pp.pdf({ preferCSSPageSize: true, printBackground: true });
    const s2 = pdf.toString('latin1'); const mb = s2.match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
    ok((s2.match(/\/Type \/Page\b/g) || []).length === 1 && mb && Math.abs(mb[1] - SIZES[t][0]) < 1 && Math.abs(mb[2] - SIZES[t][1]) < 1, t + ' PDF is one page at ' + SIZES[t].join('x'));
    await pp.close();
  }
  { const pp = await ctx.newPage(); await pp.goto(B + 'print/?type=label'); await pp.waitForSelector('.sheet');
    ok(await pp.locator('.sheet.hero').count() === 1, 'stand label is not offered to clinics'); await pp.close(); }

  // Vee: tip shows, "Got it" hides it for good, header "Tips" brings it back
  await page.goto(B + '#/kit'); await page.waitForSelector('[data-npc=kit]');
  await page.click('[data-npc=kit] [data-npc-close]'); await page.waitForTimeout(250);
  await page.reload(); await page.waitForSelector('.print-tiles');
  ok(!(await page.locator('[data-npc=kit]').count()), 'dismissed tip stays dismissed');
  await page.click('#tips'); await page.waitForSelector('[data-npc=kit]');
  ok(true, 'Tips button restores tips');

  // landing + attribution
  const land = await ctx.newPage();
  await land.route('https://labonlinebooking.ca/**', r => r.fulfill({ body: 'LOB HOME' }));
  await land.goto(B + 'c/?code=' + code + '&m=qr'); await land.waitForSelector('#land:not([hidden])');
  ok((await land.textContent('#name')) === 'Pacific Blvd Clinic', 'landing shows clinic');
  ok(await land.locator('#logo').isHidden(), 'unapproved logo not public');
  await land.screenshot({ path: OUT + '5-landing.png' });
  await land.reload(); await land.waitForSelector('#land:not([hidden])');
  await land.click('#sim');
  const ev = await page.evaluate(() => JSON.parse(localStorage.getItem('lobcp:v1')).clinic_link_events);

  const cnt = t => ev.filter(e => e.event_type === t && e.medium === 'qr').length;
  ok(cnt('visit') === 1 && cnt('booking_started') === 1 && cnt('booking_completed') === 1, 'refresh = 1 visit; 1 started; 1 completed under QR');
  ok(ev.every(e => Object.keys(e).sort().join() === 'clinic_id,event_type,id,medium,occurred_at'), 'events hold no patient fields');

  // stand
  await page.goto(B + '#/stand'); await page.fill('#sn', 'Dana MOA');
  await page.check('input[name=display_confirm]'); await page.click('#f button[type=submit]');
  await page.waitForSelector('.pill.requested');
  ok(!(await page.locator('#f').count()), 'only one open stand request');
  await page.goto(B + '#/admin');
  ok((await page.textContent('body')).includes('https://labonlinebooking.ca/c/' + code + '?m=nfc'), 'admin queue shows NFC link');
  await page.click('[data-act=st-approved]'); await page.click('[data-act=st-programmed]');
  await page.fill('[id^=uid]', '04A1B2C3D4E5F6'); await page.fill('[id^=trk]', '1Z999AA10123456784');
  await page.click('[data-act=st-shipped]');
  ok((await page.textContent('body')).includes('Tracking number: 1Z999AA10123456784'), 'shipped email with tracking');

  // approved logo prints, and can be switched off per format
  await page.goto(B + '#/admin'); await page.click('[data-act=logo-ok]');
  { const pp = await ctx.newPage(); await pp.goto(B + 'print/?type=counter'); await pp.waitForSelector('.sheet img.clogo');
    ok(true, 'approved logo appears on printables');
    await pp.uncheck('#opt-logo'); ok(!(await pp.locator('.sheet img.clogo').count()), 'logo can be turned off');
    await pp.uncheck('#opt-vee'); ok(!(await pp.locator('.sheet .vremind').count()) && (await pp.textContent('.sheet')).includes('BC Services Card'), 'Vee off keeps the reminder line');
    await pp.close(); }

  // dashboard
  await page.goto(B + '#/'); await page.click('#seed'); await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '6-dashboard.png', fullPage: true });

  // isolation: second clinic
  await page.evaluate(() => localStorage.removeItem('lobcp:session'));
  await page.goto(B + '#/register');
  await page.fill('#name', 'Sam'); await page.fill('#email', 'sam@other.ca'); await page.fill('#clinicName', 'Other Clinic');
  await page.selectOption('#region', 'fraser'); await page.check('input[name=terms]'); await page.click('button[type=submit]');
  await page.goto(await page.locator('.demo-link').getAttribute('href')); await page.waitForSelector('[data-npc=pending]');
  ok(!(await page.textContent('body')).includes('Pacific Blvd'), 'clinic B sees nothing of clinic A');
  // suspend A
  await page.goto(B + '#/admin');
  await page.locator('tr', { hasText: 'Pacific Blvd Clinic' }).locator('[data-act=suspend]').click();
  const p3 = await ctx.newPage(); await p3.route('https://labonlinebooking.ca/**', r => r.fulfill({ body: 'LOB HOME' }));
  await p3.goto(B + 'c/?r=vch&s=pacific-blvd'); await p3.waitForURL(/labonlinebooking\.ca\/$/);
  ok(true, 'suspended clinic link falls back');
  // rate limit
  await page.goto(B + '#/login');
  for (let i = 0; i < 6; i++) { await page.fill('#email', 'sam@other.ca'); await page.click('button[type=submit]'); await page.waitForTimeout(80); }
  ok(!(await page.locator('.demo-link').count()), 'sign-in links rate limited to 5/hour');
  // mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await m.goto(B + '#/login'); const sw = await m.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, 'no horizontal scroll at phone width');
  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await browser.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
