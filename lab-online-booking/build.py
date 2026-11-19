#!/usr/bin/env python3
"""Generates the static Lab Online Booking pages. Header and footer are
written once here and stamped into every page between partial markers."""
import os, sys
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.dirname(os.path.abspath(__file__))

LEAF = '''<svg class="leaf" viewBox="-2450 -2420 4900 4900" aria-hidden="true"><path fill="currentColor" d="m-90 2030 45-863a95 95 0 0 0-111-98l-859 151 116-320a65 65 0 0 0-20-73l-941-762 212-99a65 65 0 0 0 34-79l-186-572 542 115a65 65 0 0 0 73-38l105-247 423 454a65 65 0 0 0 111-57l-204-1052 327 189a65 65 0 0 0 91-27l332-652 332 652a65 65 0 0 0 91 27l327-189-204 1052a65 65 0 0 0 111 57l423-454 105 247a65 65 0 0 0 73 38l542-115-186 572a65 65 0 0 0 34 79l212 99-941 762a65 65 0 0 0-20 73l116 320-859-151a95 95 0 0 0-111 98l45 863z"/></svg>'''
CHEV = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'
EXT = '<svg class="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>'
USER = '<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="16" cy="11" r="6"/><path d="M4.5 28c1.6-5.6 6-8.5 11.5-8.5S25.9 22.4 27.5 28" stroke-linecap="round"/></svg>'
ARR = '<svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
FLASK = '<svg viewBox="0 0 48 52" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true"><path d="M17 3h14M19 3v15L5 44a4 4 0 0 0 3.5 6h31A4 4 0 0 0 43 44L29 18V3"/><path d="M11 34h26"/></svg>'
SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>'
PIN = '<svg viewBox="0 0 38 48" aria-hidden="true"><path fill="currentColor" d="M19 0C8.5 0 0 8.3 0 18.6 0 32.3 19 48 19 48s19-15.7 19-29.4C38 8.3 29.5 0 19 0Zm0 26a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"/></svg>'
BOT = '''<svg class="bot" viewBox="0 0 96 96" aria-hidden="true">
  <g stroke="#1462c7" stroke-width="4" stroke-linecap="round"><path d="M38 10l3 8M48 6v9M58 10l-3 8M28 16l5 6M68 16l-5 6"/></g>
  <rect x="14" y="40" width="10" height="22" rx="5" fill="#0b4ea8"/><rect x="72" y="40" width="10" height="22" rx="5" fill="#0b4ea8"/>
  <rect x="20" y="28" width="56" height="48" rx="20" fill="#1d7be0"/>
  <rect x="28" y="38" width="40" height="28" rx="12" fill="#fff"/>
  <circle cx="40" cy="50" r="4" fill="#0b4ea8"/><circle cx="56" cy="50" r="4" fill="#0b4ea8"/>
  <path d="M41 58c4 3.5 10 3.5 14 0" stroke="#0b4ea8" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>'''

def header(r, active=""):
    return f'''<!-- partial: header -->
<a class="skip" href="#main">Skip to content</a>
<div class="demo-bar" role="note">Preview build with sample locations and times. Bookings made here are not real.</div>
<header class="site-header">
  <div class="wrap hdr">
    <a class="brand" href="{r}" aria-label="Lab Online Booking.ca home">
      {LEAF}
      <span><span class="brand-name">Lab Online Booking.ca</span><span class="brand-tag">Accessible laboratory appointments for BC</span></span>
    </a>
    <nav class="nav" aria-label="Main">
      <div class="nav-item">
        <button class="nav-link" aria-expanded="false" aria-haspopup="true">Lab Locations {CHEV}</button>
        <div class="menu">
          <a href="{r}locations/">All participating locations<small>Search by city or postal code</small></a>
          <hr>
          <a href="{r}locations/?ha=vch">Vancouver Coastal Health</a>
          <a href="{r}locations/?ha=fh">Fraser Health</a>
          <a href="{r}locations/?ha=ih">Interior Health</a>
          <a href="{r}locations/?ha=phc">Providence Health Care</a>
          <a href="{r}locations/?ha=phsa">Provincial Health Services Authority</a>
        </div>
      </div>
      <span class="nav-sep" aria-hidden="true"></span>
      <div class="nav-item">
        <button class="nav-link" aria-expanded="false" aria-haspopup="true">Help &amp; FAQs {CHEV}</button>
        <div class="menu">
          <a href="{r}how-to-book/">How to book<small>Step-by-step instructions</small></a>
          <a href="{r}help/#before">What to bring</a>
          <a href="{r}help/#changes">Change or cancel a booking</a>
          <a href="{r}help/">All FAQs</a>
          <hr>
          <a href="{r}help/#contact">Contact support</a>
        </div>
      </div>
      <a class="nav-link" href="{r}for-clinics/">For Clinics {EXT}</a>
      <a class="signin-mobile" href="{r}manage/">{USER} Sign In · Manage Your Booking</a>
    </nav>
    <a class="signin" href="{r}manage/">{USER}<span><b>Sign In</b><span>Manage Your Booking</span></span></a>
    <button class="menu-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
  </div>
</header>
<!-- /partial: header -->'''

def footer(r):
    return f'''<!-- partial: footer -->
<footer class="site-footer">
  <div class="wrap">
    <div class="ftr">
      <a class="brand" href="{r}">{LEAF}<span class="brand-name">Lab Online Booking.ca</span></a>
      <ul class="ftr-nav">
        <li><a href="{r}how-to-book/">How to Book</a></li>
        <li><a href="{r}locations/">Lab Locations</a></li>
        <li><a href="{r}help/">Help &amp; FAQs</a></li>
        <li><a href="{r}for-clinics/">For Clinics</a></li>
      </ul>
      <p class="powered">Powered by<a href="https://www.tsbhealthcare.com/slot-iq/">Slot IQ patient scheduling</a></p>
    </div>
    <div class="land">
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M8 34C10 20 20 8 34 5c-1 14-10 25-24 27"/><path d="M8 34 26 14M15 26l-4-5M19 22l-2-7M22 18l4 0M18 23l6 1"/></svg>
      <p>We respectfully acknowledge that laboratory services across British Columbia are provided on the traditional, ancestral and unceded territories of the First Nations, Inuit and Métis Peoples throughout the province.</p>
    </div>
    <div class="legal">
      <span>© <span data-year>2026</span> TSB Healthcare Inc.</span>
      <a href="{r}help/#privacy">Privacy</a>
      <a href="{r}help/#accessibility">Accessibility</a>
      <span>Lab Online Booking.ca schedules appointments. Laboratory testing is performed by the lab you book.</span>
    </div>
  </div>
</footer>
<div class="chat" id="chat" role="dialog" aria-label="AI Booking Assistant" hidden>
  <div class="chat-head">{BOT}<div><b>AI Booking Assistant</b><small>Finds labs and open times</small></div><button class="chat-close" aria-label="Close assistant">×</button></div>
  <div class="chat-log" aria-live="polite"></div>
  <form class="chat-form"><label class="sr-only" for="chat-in">Message</label><input id="chat-in" autocomplete="off" placeholder="Type a city, postal code or question"><button class="btn btn-primary">Send</button></form>
  <p class="chat-note">Demo assistant. Don’t share health details in chat.</p>
</div>
<script src="{r}assets/js/data.js"></script>
<script src="{r}assets/js/lob.js"></script>
<!-- /partial: footer -->'''

def page(path, title, desc, page_id, body):
    depth = len(path.split("/")) if path else 0
    r = "../" * depth if depth else "./"
    html = f'''<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0b4ea8">
<link rel="icon" href="{r}assets/img/favicon.svg" type="image/svg+xml">
<link rel="preload" href="{r}assets/fonts/hanken.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{r}assets/css/lob.css">
</head>
<body data-page="{page_id}" data-root="{r}">
{header(r)}
<main id="main">
{body.replace("{r}", r)}
</main>
{footer(r)}
</body>
</html>
'''
    d = os.path.join(OUT, path)
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "index.html"), "w").write(html)

def hero(crumb, h1, p):
    return f'''<section class="page-hero"><div class="wrap">
  <p class="crumbs"><a href="{{r}}">Home</a> / {crumb}</p>
  <h1>{h1}</h1>
  <p>{p}</p>
</div></section>'''

# ------------------------------------------------------------------ HOME
CAL = '<svg class="cal" viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><rect x="3" y="6" width="28" height="25" rx="4"/><path d="M3 13h28M10 3v6M24 3v6"/><g fill="currentColor" stroke="none"><circle cx="10" cy="19" r="1.7"/><circle cx="17" cy="19" r="1.7"/><circle cx="24" cy="19" r="1.7"/><circle cx="10" cy="25" r="1.7"/><circle cx="17" cy="25" r="1.7"/><circle cx="24" cy="25" r="1.7"/></g></svg>'
ICO_FIND = '<svg class="step-ico" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M30 54H10a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v14"/><path d="M6 22h48M18 4v10M42 4v10"/><circle cx="44" cy="44" r="10"/><path d="m51.5 51.5 7 7"/></svg>'
ICO_CAL = '<svg class="step-ico" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="10" width="52" height="46" rx="5"/><path d="M6 22h52M19 4v12M45 4v12"/><path d="m22 38 7 7 14-14"/></svg>'
ICO_OK = '<svg class="step-ico" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="32" cy="32" r="27"/><path d="m19 33 9 9 18-19"/></svg>'
STEP_ARR = '<svg class="step-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'
PEOPLE = '<svg class="ico-people" viewBox="0 0 82 64" fill="currentColor" aria-hidden="true"><circle cx="41" cy="13" r="11"/><path d="M22 52c0-12 8.5-20 19-20s19 8 19 20v4a3 3 0 0 1-3 3H25a3 3 0 0 1-3-3Z"/><circle cx="15" cy="22" r="8.5"/><path d="M0 54c0-9 6-15 14.5-15 3.5 0 6.5 1 9 3-3.5 4-5.5 9.5-5.5 15H3a3 3 0 0 1-3-3Z"/><circle cx="67" cy="22" r="8.5"/><path d="M82 54c0-9-6-15-14.5-15-3.5 0-6.5 1-9 3 3.5 4 5.5 9.5 5.5 15h15a3 3 0 0 0 3-3Z"/></svg>'

home = f'''
<section class="hero">
  <div class="hero-media" role="img" aria-label="A bright laboratory reception desk"></div>
  <div class="wrap">
    <div class="hero-inner">
      <h1>Book a Laboratory Appointment in British Columbia</h1>
      <svg class="squiggle" viewBox="0 0 300 18" fill="none" aria-hidden="true"><path d="M3 14C70 3 190 1 297 9" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>
      <p class="hero-lede">{FLASK}<span>A <strong>free</strong>, province-wide resource for public laboratory services in BC.</span></p>
      <div class="hero-cta"><a class="btn btn-primary btn-lg" href="{{r}}book/">{CAL} Book an Appointment {ARR}</a></div>
      <div class="counter">
        <span class="digits" data-counter role="img" aria-label="4,500,000 plus"></span>
        <p class="counter-label"><b>Appointments</b>in BC since 2018 <span class="live"><i></i>LIVE</span></p>
      </div>
    </div>
  </div>
  <svg class="hero-wave" viewBox="0 0 1440 110" preserveAspectRatio="none" aria-hidden="true">
    <path d="M0 70C260 20 520 10 780 40s470 50 660-10v80H0Z" fill="#fff"/>
    <path d="M0 74C260 24 520 14 780 44s470 50 660-10" fill="none" stroke="#4fc3f0" stroke-width="5" opacity=".9"/>
    <path d="M0 86C300 40 600 34 860 58s430 30 580-16" fill="none" stroke="#bfe6f7" stroke-width="3"/>
  </svg>
</section>

<section class="section" aria-labelledby="how">
  <div class="wrap">
    <h2 class="section-title" id="how">How to Book a Lab Appointment</h2>
    <p class="section-sub">Book in 3 simple steps:</p>
    <div class="steps">
      <a class="step" href="{{r}}locations/"><span class="step-num">1</span>{ICO_FIND}<h3>Find a Lab <br>Near You</h3></a>
      {STEP_ARR}
      <a class="step" href="{{r}}book/"><span class="step-num">2</span>{ICO_CAL}<h3>Choose a <br>Date and Time</h3></a>
      {STEP_ARR}
      <div class="step"><span class="step-num">3</span>{ICO_OK}<h3>Get Your <br>Confirmation</h3></div>
    </div>
    <p class="steps-cta"><a class="btn btn-outline" href="{{r}}how-to-book/"><svg class="play" viewBox="0 0 30 30" aria-hidden="true"><circle cx="15" cy="15" r="15" fill="currentColor"/><path d="M12 9.5v11l9-5.5Z" fill="#fff"/></svg> See Step-by-Step Instructions {ARR}</a></p>
  </div>
</section>

<section class="section" style="padding-top:8px" aria-labelledby="find">
  <div class="wrap">
    <div class="find">
      <h2 id="find">{PIN} Find a Lab Near You</h2>
      <form class="find-form" id="home-find" role="search" action="{{r}}locations/">
        <div class="field-search">{SEARCH}<label class="sr-only" for="home-q">City or postal code</label><input id="home-q" name="q" autocomplete="postal-code" placeholder="Enter your city or postal code (e.g. Vancouver, V6B 1A1)"></div>
        <button class="btn btn-primary">Find Labs {ARR}</button>
      </form>
    </div>
  </div>
</section>

<section class="section" style="padding-top:4px">
  <div class="wrap duo">
    <a class="card" href="{{r}}for-clinics/">{PEOPLE}<div><h3>Resources for Clinics</h3><p>Tools and materials to help your patients book lab appointments.</p></div>{ARR.replace('class="arr"','class="go"')}</a>
    <div class="card card-ai">{BOT}<div class="ai-body"><h3>AI Booking Assistant</h3><div class="ai-row"><p>Need help booking?<br>I can find a lab, check availability, and book an appointment for you.</p><button class="btn btn-primary" data-chat aria-controls="chat" aria-expanded="false">Chat Now {ARR}</button></div></div></div>
  </div>
</section>

<section class="section" aria-labelledby="ha">
  <div class="wrap">
    <h2 class="ha-title" id="ha">Participating Health Authorities</h2>
    <!-- Replace each text wordmark with the authority's official logo file
         (assets/img/ha/*.svg) once usage approval is in hand. -->
    <ul class="ha-list">
      <li><a class="ha ha--vch" href="{{r}}locations/?ha=vch"><span class="ha-name">Vancouver<b>Coastal<span>Health</span></b></span></a></li>
      <li><a class="ha ha--fh" href="{{r}}locations/?ha=fh"><span class="ha-name">fraserhealth</span></a></li>
      <li><a class="ha ha--ih" href="{{r}}locations/?ha=ih"><span class="ha-name">Interior Health</span></a></li>
      <li><a class="ha ha--ph" href="{{r}}locations/?ha=phc"><span class="ha-name">Providence<small>Health Care</small></span></a></li>
      <li><a class="ha ha--phsa" href="{{r}}locations/?ha=phsa"><span class="ha-name">Provincial Health<br>Services Authority<br>(PHSA)</span></a></li>
    </ul>
  </div>
</section>
'''
page("", "Lab Online Booking.ca | Book a Lab Appointment in British Columbia",
     "Book a free appointment at a participating public laboratory in British Columbia. Find a lab near you, choose a time, and get your confirmation.", "home", home)

# ------------------------------------------------------------------ HOW TO BOOK
howto = hero("How to book", "How to book a lab appointment",
  "It takes about two minutes. You don’t need an account.") + f'''
<section class="section"><div class="wrap prose">
  <div class="callout"><b>Before you start:</b> have your laboratory requisition from your doctor or nurse practitioner, and your BC Services Card for your Personal Health Number.</div>
  <ol class="howto">
    <li><h3>Find a lab near you</h3><p>Search by city or postal code. Choose a location that can do the test on your requisition, not only the one with the earliest opening.</p></li>
    <li><h3>Choose a date and time</h3><p>Pick a day, then an open time. Times shown are live openings at that lab.</p></li>
    <li><h3>Enter your details</h3><p>Your name, date of birth, Personal Health Number, and a phone number or email for your confirmation.</p></li>
    <li><h3>Get your confirmation</h3><p>You’ll see a confirmation code on screen and receive it by text or email. A reminder follows before your visit.</p></li>
    <li><h3>Go to your appointment</h3><p>Arrive at the lab a few minutes early with your requisition and BC Services Card. Check your requisition for fasting or other instructions.</p></li>
  </ol>
  <p style="margin-top:28px"><a class="btn btn-primary btn-lg" href="{{r}}book/">Book an Appointment {ARR}</a></p>
  <h2>Need to change or cancel?</h2>
  <p>Use <a href="{{r}}manage/">Manage Your Booking</a> with your confirmation code and last name. Cancelling releases the time for another patient.</p>
</div></section>'''
page("how-to-book", "How to Book a Lab Appointment | Lab Online Booking.ca", "Step-by-step instructions for booking a public lab appointment in BC.", "howto", howto)

# ------------------------------------------------------------------ LOCATIONS
checks = "".join(f'<label><input type="checkbox" value="{i}" checked> {n}</label>' for i, n in [("vch","Vancouver Coastal Health"),("fh","Fraser Health"),("ih","Interior Health"),("phc","Providence Health Care"),("phsa","PHSA")])
locs = hero("Lab locations", "Find a lab near you", "Participating public and hospital outpatient laboratories across British Columbia.") + f'''
<section class="section"><div class="wrap">
  <div class="find" style="margin-bottom:24px">
    <form class="find-form" id="loc-form" role="search" style="margin-top:0">
      <div class="field-search">{SEARCH}<label class="sr-only" for="loc-q">City or postal code</label><input id="loc-q" name="q" autocomplete="postal-code" placeholder="Enter your city or postal code (e.g. Vancouver, V6B 1A1)"></div>
      <button class="btn btn-primary">Find Labs {ARR}</button>
    </form>
  </div>
  <div class="loc-layout">
    <aside class="filters"><h2>Health authority</h2>{checks}</aside>
    <div><p class="loc-count" id="loc-count" aria-live="polite"></p><div class="loc-list" id="loc-list"></div></div>
  </div>
</div></section>'''
page("locations", "Lab Locations | Lab Online Booking.ca", "Search participating laboratory locations in British Columbia.", "locations", locs)

# ------------------------------------------------------------------ BOOK
book = hero("Book an appointment", "Book an appointment", "Free for patients. No account needed.") + '''
<section class="section" style="padding-top:10px"><div class="wrap" style="max-width:940px">
  <ol class="progress" aria-label="Booking steps">
    <li><span>Find a lab</span></li><li><span>Date &amp; time</span></li><li><span>Your details</span></li><li><span>Confirmation</span></li>
  </ol>
  <div id="book-app"><noscript><p class="panel">Booking needs JavaScript. Please turn it on, or call your lab.</p></noscript></div>
</div></section>'''
page("book", "Book an Appointment | Lab Online Booking.ca", "Book a lab appointment: choose a location, date and time.", "book", book)

# ------------------------------------------------------------------ MANAGE
manage = hero("Manage your booking", "Manage your booking", "Look up, change or cancel an appointment with your confirmation code and last name.") + f'''
<section class="section"><div class="wrap" style="max-width:720px">
  <form class="panel" id="manage-form" style="margin-top:0">
    <div class="form-grid">
      <div class="fld"><label for="m-code">Confirmation code</label><input id="m-code" name="code" required autocomplete="off" placeholder="ABCD-1234" style="text-transform:uppercase"></div>
      <div class="fld"><label for="m-last">Last name</label><input id="m-last" name="last" required autocomplete="family-name"></div>
    </div>
    <div class="actions"><span style="font-size:15px;color:var(--muted)">Your code is in your confirmation text or email.</span><button class="btn btn-primary">Find my booking {ARR}</button></div>
  </form>
  <div id="manage-out" aria-live="polite"></div>
</div></section>'''
page("manage", "Manage Your Booking | Lab Online Booking.ca", "Change or cancel a lab appointment.", "manage", manage)

# ------------------------------------------------------------------ HELP
def q(qs, a):
    return f'<details><summary>{qs}</summary><div>{a}</div></details>'
help_ = hero("Help &amp; FAQs", "Help &amp; FAQs", "Answers to common questions about booking a lab appointment.") + f'''
<section class="section"><div class="wrap prose faq">
  <h2 id="booking">Booking</h2>
  {q("Is Lab Online Booking.ca free?", "<p>Yes. Booking is free for patients. Lab tests covered by the BC Medical Services Plan are also free when you have a valid requisition.</p>")}
  {q("Do I need an account?", "<p>No. You book with your name, date of birth, Personal Health Number and a phone number or email.</p>")}
  {q("Which labs can I book here?", "<p>Participating public and hospital outpatient laboratories run by BC health authorities. Private community labs have their own booking sites.</p>")}
  {q("Does Lab Online Booking.ca do the lab test?", "<p>No. Lab Online Booking.ca schedules your appointment. The laboratory you book collects your sample and does the testing.</p>")}
  <h2 id="before">Before your visit</h2>
  {q("What should I bring?", "<p>Your laboratory requisition and your BC Services Card. If your requisition says to fast or collect a sample at home, follow those instructions.</p>")}
  {q("Can I walk in without an appointment?", "<p>Participating labs expect the time you booked unless a location says otherwise. Booking ahead is the most reliable way to be seen quickly.</p>")}
  {q("I need help at the lab (accessibility, interpreter, mobility).", "<p>Add a note in the booking form under “Anything the lab should know?” so the team can prepare.</p>")}
  <h2 id="changes">Changes and cancellations</h2>
  {q("How do I change or cancel?", "<p>Go to <a href='{{r}}manage/'>Manage Your Booking</a> and enter your confirmation code and last name. Please cancel if you can’t make it, so another patient can use the time.</p>")}
  {q("I lost my confirmation code.", "<p>Check the text or email you got when you booked. If you can’t find it, contact the lab directly.</p>")}
  <h2 id="contact">Contact</h2>
  <p>For booking problems, email <a href="mailto:support@labonlinebooking.ca">support@labonlinebooking.ca</a>. For questions about your test or results, contact the clinician who ordered it.</p>
  <h2 id="privacy">Privacy</h2>
  <p>Your details are used only to schedule your appointment and send confirmations and reminders. They are stored in Canada.</p>
  <h2 id="accessibility">Accessibility</h2>
  <p>This site is built to meet WCAG 2.1 AA. It works with screen readers, keyboard navigation and browser zoom. Tell us about any barrier at <a href="mailto:support@labonlinebooking.ca">support@labonlinebooking.ca</a>.</p>
</div></section>'''
page("help", "Help & FAQs | Lab Online Booking.ca", "Answers about booking, what to bring, and changing or cancelling a lab appointment.", "help", help_)

# ------------------------------------------------------------------ CLINICS
def res(icon, t, p):
    return f'<div class="res">{icon}<h3>{t}</h3><p>{p}</p></div>'
I_QR = '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><rect x="4" y="4" width="12" height="12" rx="2"/><rect x="24" y="4" width="12" height="12" rx="2"/><rect x="4" y="24" width="12" height="12" rx="2"/><path d="M24 24h5v5h-5zM31 31h5v5h-5zM31 24h5M24 36h3"/></svg>'
I_PRINT = '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" aria-hidden="true"><path d="M10 14V4h20v10"/><rect x="4" y="14" width="32" height="14" rx="3"/><path d="M10 24h20v12H10z"/></svg>'
I_CHART = '<svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M5 35h30M10 28V18M18 28V10M26 28V20M34 28V6"/></svg>'
clinics = hero("For clinics", "Resources for clinics", "Help your patients book their lab work before they leave your office.") + f'''
<section class="section"><div class="wrap">
  <div class="res-grid">
    {res(I_QR, "Your clinic’s booking link and QR code", "A short link and QR code that open booking with your region already selected.")}
    {res(I_PRINT, "Print-ready materials", "Posters, counter cards, table tents and patient handouts in the Lab Online Booking style.")}
    {res(I_CHART, "See where bookings come from", "A simple count of visits and bookings started from your clinic’s link.")}
  </div>
  <div class="find" style="margin-top:28px;display:flex;gap:20px;align-items:center;justify-content:space-between;flex-wrap:wrap">
    <div><h2 style="font-size:26px">Get your clinic’s booking kit</h2><p style="margin-top:6px">Register your clinic. Once approved, download your link, QR code and printables.</p></div>
    <a class="btn btn-primary btn-lg" href="{{r}}../clinic-portal/">Open the Clinic Portal {EXT.replace('class="ext"','class="arr"')}</a>
  </div>
</div></section>'''
page("for-clinics", "For Clinics | Lab Online Booking.ca", "Booking links, QR codes and printables for referring clinics.", "clinics", clinics)
print("built")
