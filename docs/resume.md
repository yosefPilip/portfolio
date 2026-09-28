# Yosef Pilip — résumé

> **This file is the single source of truth for every fact and number on the site.**
> Supplied by the owner on 2026-09-13, transcribed from `Yosef Pilip Resume 2026.pdf`.
> Where the site and this file disagree, this file wins. Never put a number on the
> site that is not on this page. Where a value is unknown, ship a literal `—` plus an
> HTML comment naming what belongs there — never a fabrication.

**Computer Science Student · San Diego State University**

- yosefpilip@gmail.com
- yosefpilip.com
- linkedin.com/in/yosefpilip
- github.com/yosefPilip

Computer Science student and AI developer who builds full-stack, LLM-powered
applications and internal automation tools — turning messy, real-world workflows into
clean, reliable systems.

---

## Education

### San Diego State University — B.S. Computer Science
**Aug 2024 – Jun 2028 (Expected)**

GPA: 3.8 | Alpha Epsilon Pi Fraternity | Aztec Robotics Club | Hillel Business
Initiative | AI Club

### Homestead High School & De Anza College (Dual Enrollment)
**Graduated 2024**

GPA: 3.8 | 5 AP courses (scores 4+): Physics, Calculus, Computer Science | Varsity
Water Polo

- Dual-enrolled in Manufacturing Engineering at De Anza — CAD/SolidWorks, 3D printing
  (FDM, VAT, powder-bed fusion), CNC machining, and manual metalwork; designed and
  manufactured working parts end to end.

---

## Experience

### CloudGeometry (Part-time)
**May 2025 – Present** · one employer, continuous, with a promotion

#### AI Software Developer
**Jan 2026 – Present**

- **Built a natural-language HR automation.** Engineered a Slack bot (Python, Gemini
  API) that parses HR requests into structured records, persists them, and routes
  approvals to managers — replacing a manual email process for ~100 employees and
  cutting turnaround from 3 days to same-day.
- **Designed a role-based data platform.** Modeled a four-tier permission system and
  built an internal HR management app on top of it, replacing a paid third-party tool
  and saving $8,000 a year.
- **Partnered with the CEO on TIX**, the company's git-based ticketing system driven by
  Claude Code in plain English. Shipped fixes for a Windows crash that wiped ticket
  files (with regression tests), secret-safe publishing, and ticket archiving.

#### IT Automation Engineer
**May 2025 – Jan 2026**

- **Administered company IT** (Google Workspace, Slack, Hexnode) for a globally
  distributed company of about 100 people; worked with the CEO, CTO, and HR Director on
  security policy.
- **Automated security auditing.** Wrote a scheduled Google Apps Script service that
  audits every account for security gaps (2FA, recovery info, profile photo) and logs
  findings to Sheets — replacing a manual review that took 40 hours a month across ~100
  accounts.
- **Applied systems-level identity knowledge to internal tools.** Used deep knowledge of
  org-wide identity and device-management systems (Google Workspace, Slack, Hexnode) to
  inform the permission model behind the HR platform and the account-auditing script
  above.

### Founder & CEO · Cache It
**Aug 2026 – Present** · cache-it-one.vercel.app

- **Founded and built a location-based NFC art discovery app.** Solo-designed and
  engineered the product end to end (React/Vite, FastAPI); selected for SDSU's Zip
  Launchpad startup incubator (starting Fall 2026).
- **Built a live discovery map.** Implemented real-time, geolocation-based area tracking
  so explorers can track down artwork hidden around a city and tap in to collect it.
- **Designed a collaborator system.** Built a role that lets outside artists place their
  own artwork independently, decoupling collection growth from core development.
- **Engineered for anti-cheat security.** Architected around iOS/Web NFC constraints with
  an upgrade path to NTAG 424 DNA chips to keep finds authentic.

---

## Leadership & Volunteering

### Events & External Relations Manager · Alpha Epsilon Pi Fraternity
**May 2025 – Dec 2025**

- Directed a 50-person team across construction, logistics, and creative roles to plan
  and execute large-scale themed events on a $13,000 budget.
- Drove turnout to 400+ attendees per event through campus-organization partnerships —
  double the previous years' average.

### Operations & Web Development Lead · Hillel Business Initiative, SDSU
**Jul 2025 – Dec 2025**

- Designed and automated the club's participation- and attendance-tracking system,
  replacing manual sign-in with a self-updating pipeline that gave organizers a live view
  of member engagement.
- Built automated member-communication and event-operations workflows, eliminating the
  recurring manual work behind running each event.

---

## Personal Projects

### Batch Podcast Generator
*Python · Anthropic API · SQLite*

- Generates multi-episode podcast batches from prompts using the Anthropic API and a
  pluggable TTS adapter layer (Fish Audio, ElevenLabs).
- Handles bounded concurrency for 100-episode runs via an asyncio semaphore; SQLite
  backend, deployed on Vercel.

### Portfolio Site — yosefpilip.com
*HTML · CSS · JS*

- Hand-built personal site showcasing projects and writing; zero framework, fully
  self-contained.

### Resell Assistant — Claude MCP
*MCP · Google Sheets API · OAuth 2.0 · In development*

- **Building a conversational resale-price assistant.** Powered by a custom Claude MCP
  server that answers natural-language pricing questions and keeps a live
  financial/inventory tracker in Google Sheets updated automatically via per-user OAuth
  (no shared credentials) — built for my own reselling business.

---

## Skills & Languages

- **Programming:** Python, JavaScript, Java, SQL, HTML/CSS
- **Frameworks & Tools:** FastAPI, React/Vite, SQLite, Node, Git, Vercel
- **AI & Automation:** Anthropic API, OpenAI API, Claude MCPs, Custom GPTs, Google Apps
  Script, Cursor, Claude Code
- **Systems & Identity:** Google Workspace, Slack, Hexnode — account lifecycle, permission
  modeling, security auditing
- **Languages:** English Native · Russian Advanced/Conversational · Hebrew Basic ·
  Spanish Basic

---

## Notes for anyone building the site from this

- **Aztec Robotics** appears here only as a *club membership* under SDSU education. It is
  NOT a leadership role. The old site's "President & Software Lead" claim has no source
  here and stays dropped.
- **Russian is Advanced/Conversational**, never "Native".
- **Cache It uses NFC**, with an upgrade path to NTAG 424 DNA chips — never image
  recognition.
- **CloudGeometry is one continuous employer**, May 2025 – Present, with a promotion
  (2026-09-28 CV) from IT Automation Engineer (May 2025 – Jan 2026) to AI Software
  Developer (Jan 2026 – Present). Show it as ONE entry with the promotion inside it,
  never as two separate jobs.
- **Cache It is an Experience entry here** (Founder & CEO, Aug 2026 – Present). The Home
  page's Experience section deliberately lists only the three non-Cache-It roles, because
  Cache It gets its own full case study. That is a layout decision, not a contradiction.
- **Thrifting figures (owner-supplied, 2026-09-22), used on Workshop:** no clothing
  purchase over $15 since about 2023, with one exception — a $60 leather jacket.
- Still not on this résumé, so still unknown and still `—` on the site: a **city**
  (the owner has declined to publish one), **eBay and Mercari handles** (Depop is
  `depop.com/explosef`), and a one-line description of the **DJ Music Sorter**.
