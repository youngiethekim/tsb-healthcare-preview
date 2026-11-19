const { chromium } = require('playwright');
const B = process.env.PORTAL_URL || 'http://localhost:8765/clinic-portal/', OUT = (process.env.SHOTS_DIR || require('os').tmpdir() + '/clinic-portal-shots') + '/';
require('fs').mkdirSync(OUT, { recursive: true });
let f = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) f++; };
(async () => {
  const { PNG } = require('pngjs'); const png = new PNG({ width: 120, height: 40 }); png.data.fill(90); require('fs').writeFileSync(OUT + 'logo.png', PNG.sync.write(png));
  const br = await chromium.launch();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B + '#/register');
  await p.fill('#name', 'Dana'); await p.fill('#email', 'dana@pb.ca'); await p.fill('#clinicName', 'Pacific Blvd Clinic');
  await p.selectOption('#region', 'vch'); await p.check('input[name=terms]'); await p.click('button[type=submit]');
  await p.goto(await p.locator('.demo-link').getAttribute('href')); await p.waitForSelector('[data-npc=pending]');
  await p.goto(B + '#/admin'); await p.click('[data-act=approve]');
  const q = await ctx.newPage(); q.on('pageerror', e => errs.push(e.message));
  for (const t of ['poster', 'card', 'tent', 'handouts']) {
    await q.goto(B + 'print/?type=' + t); await q.waitForSelector('.sheet');
    ok(await q.locator('.sheet [data-logo-slot]').first().isVisible(), t + ': "Your logo here" visible on screen');
    if (t === 'poster' || t === 'card') await q.screenshot({ path: OUT + t + '-slot.png' });
    await q.emulateMedia({ media: 'print' });
    ok((await q.locator('.sheet [data-logo-slot]').first().isVisible()) === false, t + ': slot hidden when printing');
    if (t === 'poster') ok(await q.locator('.sheet .cname.print-only').first().isVisible(), 'poster: clinic name prints in the logo spot');
    const pdf = await q.pdf({ preferCSSPageSize: true, printBackground: true }); require('fs').writeFileSync(OUT + t + '.pdf', pdf);
    await q.emulateMedia({ media: 'screen' });
  }
  // upload by clicking the slot
  await q.goto(B + 'print/?type=poster'); await q.waitForSelector('[data-logo-slot]');
  const [fc] = await Promise.all([q.waitForEvent('filechooser'), q.click('.sheet [data-logo-slot]')]);
  await fc.setFiles(OUT + 'logo.png');
  await q.waitForSelector('.logo-slot.has-img');
  ok((await q.textContent('.logo-slot')).includes('In review'), 'uploaded logo shows "In review" in the slot');
  ok(!(await q.locator('.sheet img.clogo').count()), 'pending logo does not print');
  await q.screenshot({ path: OUT + 'poster-pending.png' });
  // bad file through slot
  require('fs').writeFileSync(OUT + 'bad.png', 'not an image');
  const [fc2] = await Promise.all([q.waitForEvent('filechooser'), q.click('.sheet [data-logo-slot]')]);
  await fc2.setFiles(OUT + 'bad.png'); await q.waitForSelector('#note.bad');
  ok((await q.textContent('#note')).includes('PNG or JPG'), 'bad file rejected with a message');
  // approve -> real logo replaces slot
  await p.goto(B + '#/admin'); await p.reload(); await p.click('[data-act=logo-ok]');
  await q.goto(B + 'print/?type=poster'); await q.waitForSelector('.sheet img.clogo');
  ok(!(await q.locator('[data-logo-slot]').count()), 'approved logo replaces the placeholder');
  await q.uncheck('#opt-logo'); ok(!(await q.locator('[data-logo-slot]').count()) && await q.locator('.sheet .cname').isVisible(), 'logo off shows clinic name, no placeholder');
  await q.check('#opt-logo'); await q.screenshot({ path: OUT + 'poster-approved.png' });
  ok(errs.length === 0, 'no page errors ' + errs.join('|'));
  console.log(f ? f + ' FAILED' : 'ALL PASSED'); await br.close();
})();
