// Address-based sign-up: the health authority comes from the address, not a dropdown.
// Run: python3 -m http.server 8765 (repo root), then node clinic-portal/tests/address.js
const { chromium } = require('playwright');
const B = process.env.PORTAL_URL || 'http://localhost:8765/clinic-portal/';
let fails = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };

async function startRegister(page) {
  await page.goto(B + '#/register'); await page.waitForSelector('#a1');
  await page.fill('#name', 'Dana'); await page.fill('#clinicName', 'Test Clinic');
}

(async () => {
  const br = await chromium.launch();
  const errs = [];

  { // Typed address, no Google key
    const ctx = await br.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await startRegister(p);
    ok(!(await p.locator('#region').isVisible()), 'no region dropdown by default');
    ok(await p.locator('#gsearch-w').isHidden(), 'no Google search without a key');
    await p.fill('#city', 'North Vancouver');
    ok((await p.textContent('#where')).includes('Vancouver Coastal Health'), 'North Vancouver -> Vancouver Coastal Health');
    await p.fill('#city', 'City of Burnaby');
    ok((await p.textContent('#where')).includes('Fraser Health'), '"City of Burnaby" -> Fraser Health');
    await p.fill('#city', 'Kelowna');
    ok((await p.textContent('#where')).includes('Interior Health is coming later'), 'Kelowna -> not in program yet');
    await p.fill('#email', 'k@clinic.ca'); await p.fill('#a1', '1 Main St'); await p.fill('#pc', 'V1Y 1A1'); await p.check('input[name=terms]');
    await p.click('button[type=submit]');
    ok((await p.textContent('.form-msg')).includes('coming later'), 'Kelowna clinic cannot register yet');
    await p.fill('#city', 'Smalltown');
    ok(await p.locator('#region').isVisible(), 'unknown city shows the region chooser');
    await p.selectOption('#region', 'fraser');
    ok((await p.textContent('#where')).includes('Fraser Health'), 'chosen region confirmed');
    await p.fill('#pc', 'K1A 0A6'); await p.fill('#email', 's@clinic.ca'); await p.click('button[type=submit]');
    ok((await p.textContent('.form-msg')).includes('BC postal code'), 'non-BC postal code rejected');
    await p.fill('#pc', 'v3t2w1'); await p.click('button[type=submit]');
    await p.waitForSelector('.demo-link');
    const c = await p.evaluate(() => JSON.parse(localStorage.getItem('lobcp:v1')).clinics.pop());
    ok(c.region_id === 'fraser' && c.region_source === 'chosen' && c.postal_code === 'V3T 2W1' && c.city === 'Smalltown' && c.address_line1 === '1 Main St', 'clinic saved with address, region and tidy postal code');
    // admin can correct the region while pending
    await p.goto(B + '#/admin'); await p.reload(); await p.selectOption('[data-region]', 'vch');
    const c2 = await p.evaluate(() => JSON.parse(localStorage.getItem('lobcp:v1')).clinics.pop());
    ok(c2.region_id === 'vch' && c2.region_source === 'admin' && c2.slug === 'test', 'admin changed region; slug rebuilt');
    await p.click('[data-act=approve]');
    ok(!(await p.locator('[data-region]').count()), 'region locked after approval');
    await ctx.close();
  }

  { // Google autocomplete (mocked) fills the fields and the region
    const ctx = await br.newContext(); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
    await p.route('**/clinic-portal/config.js', async r => {
      const res = await r.fetch(); const body = (await res.text()).replace('googleMapsApiKey: ""', 'googleMapsApiKey: "test-key"');
      r.fulfill({ response: res, body });
    });
    await p.route('https://maps.googleapis.com/**', r => {
      const cb = new URL(r.request().url()).searchParams.get('callback');
      r.fulfill({ contentType: 'text/javascript', body: `
        class FakeAC extends HTMLElement { constructor(o) { super(); window.__acOpts = o; window.__ac = this; } }
        customElements.define('fake-place-autocomplete', FakeAC);
        window.google = { maps: { importLibrary: async () => ({ PlaceAutocompleteElement: FakeAC }) } };
        window[${JSON.stringify(cb)}]();` });
    });
    await startRegister(p);
    await p.waitForSelector('#gsearch-w:not([hidden]) fake-place-autocomplete', { state: 'attached' });
    ok(true, 'Google search appears when a key is set');
    const opts = await p.evaluate(() => window.__acOpts);
    ok(opts.includedRegionCodes[0] === 'ca' && opts.locationRestriction.north === 60, 'search limited to Canada / BC');
    await p.evaluate(() => {
      const comps = [
        { types: ['street_number'], longText: '2150' }, { types: ['route'], longText: 'Kingsway' },
        { types: ['subpremise'], longText: '200' }, { types: ['locality'], longText: 'Port Coquitlam' },
        { types: ['administrative_area_level_2'], longText: 'Metro Vancouver' },
        { types: ['administrative_area_level_1'], shortText: 'BC', longText: 'British Columbia' },
        { types: ['postal_code'], longText: 'V3C 1T5' }, { types: ['country'], shortText: 'CA' }];
      const ev = new Event('gmp-select');
      ev.placePrediction = { toPlace: () => ({ addressComponents: comps, location: { lat: () => 49.2621234, lng: () => -122.7812345 }, fetchFields: async () => {} }) };
      window.__ac.dispatchEvent(ev);
    });
    await p.waitForFunction(() => document.querySelector('#city').value === 'Port Coquitlam');
    ok((await p.inputValue('#a1')) === '2150 Kingsway' && (await p.inputValue('#pc')) === 'V3C 1T5', 'picking a place fills street and postal code');
    ok((await p.textContent('#where')).includes('Fraser Health'), 'Port Coquitlam -> Fraser Health');
    await p.fill('#email', 'pc@clinic.ca'); await p.check('input[name=terms]'); await p.click('button[type=submit]');
    await p.waitForSelector('.demo-link');
    const c = await p.evaluate(() => JSON.parse(localStorage.getItem('lobcp:v1')).clinics.pop());
    ok(c.region_id === 'fraser' && c.address_line2 === '200' && c.lat === 49.26212 && c.lng === -122.78123, 'Google address and rounded location saved');
    await ctx.close();
  }

  ok(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await br.close();
  console.log(fails ? fails + ' FAILED' : 'ALL PASSED');
})();
