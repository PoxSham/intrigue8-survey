# Voice-to-Invoice — Add-On Systems Design

**Date:** 2026-05-02
**Project:** Intrigue8 — Voice-to-Invoice
**Status:** In progress — Add-on 1 locked, Add-ons 2–4 pending
**Stack:** n8n · Claude API · Notion · Twilio · Stripe · PDF generation

---

## Background

The core Voice-to-Invoice system captures job activity via voice and converts it to Notion records and invoices. It stops at the invoice draft. These four add-ons extend it to close the full money cycle for Irish contractors.

---

## Research Basis

Eight parallel research agents investigated pain points for Irish contractors across all major trades (electrician, plumber, carpenter, tiler, plasterer, painter, builder, HVAC). All eight trades ranked the same top pain points in the same order:

| Rank | Pain Point | Evidence |
|------|-----------|----------|
| #1 | Late payments / cash flow | 56–83 day average delays; 67% of Irish SMEs delayed beyond 2 months |
| #2 | RCT complexity | 20–35% withheld at source; cash flow hit before payment received |
| #3 | Manual invoicing & admin | Pen, paper, WhatsApp, Excel; ~2.5 hrs/week lost |
| #4 | Quoting — slow and error-prone | No system; estimates from memory; scope disputes follow |

**Gap analysis:** The core system solves #3 (capture and invoice). It does not send the invoice to the client, does not chase payment, does not help win the job in the first place, and does not help at tax time. These are the four add-ons.

---

## The Four Add-On Systems

| # | Name | Pain Addressed | Revenue Model |
|---|------|---------------|---------------|
| 1 | Quote/Estimate Module | Winning work, underpricing | Tier 2 upsell |
| 2 | Invoice Delivery + Payment Links | Last-mile invoice delivery | Stripe passthrough |
| 3 | Automated Payment Chasing | Late payments, cash flow | Tier 2/3 |
| 4 | RCT & VAT Tax Summary | RCT complexity, tax admin | Tier 3 / annual |

---

## Add-On 1: Quote/Estimate Module — LOCKED

### Overview

Contractor dictates a job quote by voice. Claude extracts a structured, fully-priced quote with labour, materials, overhead, margin, VAT, deposit, and all professional terms. A PDF is generated and sent to the client via WhatsApp. Client acceptance auto-creates a Job in Notion.

### Data Flow

```
Voice/WhatsApp → Normalise → Client Lookup → Transcribe → Claude Extract
→ quote_request intent
→ Lookup/Create Customer in Notion
→ Create Quote record in Notion (Quotes database)
→ Generate PDF (contractor-branded, professional layout)
→ Send PDF to client via Twilio WhatsApp or email
→ Contractor confirmation: "Quote QUO-004 sent to Mrs Murphy — €2,503 total"
→ Client acceptance → webhook → Quote status: Accepted → Job auto-created
```

### New Notion Database: Quotes

| Field | Type | Notes |
|-------|------|-------|
| Quote Number | Text | QUO-001 — sequential per contractor |
| Customer | Relation → Customers | |
| Job Description | Text | Narrative scope of works |
| Line Items | Text (JSON) | Stored as structured JSON |
| Cost Subtotal | Number | Sum of all line item amounts (contractor-only view) |
| Margin % | Number | Default from client profile; overridable per quote |
| Margin Amount | Formula | Cost subtotal × margin % |
| Subtotal ex-VAT | Formula | Cost subtotal + margin amount |
| VAT Rate | Number | 13.5% (construction services); 23% if goods-only |
| VAT Amount | Formula | Subtotal ex-VAT × VAT rate |
| Total inc VAT | Formula | Subtotal ex-VAT + VAT amount |
| Deposit % | Number | Default 50%; overridable per quote |
| Deposit Amount | Formula | Total inc VAT × deposit % |
| Payment Terms | Text | e.g. "Balance within 14 days of completion" |
| Stage Payments | Text (JSON) | For multi-week jobs: milestones + amounts |
| Exclusions | Text | What is NOT included — line by line |
| Assumptions | Text | Conditions the price depends on |
| Provisional Sums | Text (JSON) | Items priced as allowances, not fixed |
| Contingency % | Number | 0% default; suggested 5–10% for jobs over €1,500 |
| Contingency Amount | Formula | Cost subtotal × contingency % |
| Warranty | Text | e.g. "12-month workmanship guarantee" |
| Price Validity Days | Number | Default 14 |
| Expiry Date | Formula | Sent date + validity days |
| Cancellation Terms | Text | e.g. "Deposit non-refundable if cancelled within 48hrs" |
| SEAI Grant Deduction | Number | HVAC only — grant amount deducted from client price |
| Contractor VAT No | Text | Pulled from client profile |
| Contractor Reg No | Text | RECI / RGII / SEAI number — pulled from client profile |
| Status | Select | Draft / Sent / Accepted / Declined / Expired |
| Sent Date | Date | |
| Accepted Date | Date | Set on acceptance |
| Converted Job | Relation → Jobs | Set on acceptance |
| Missing Items Flagged | Text | Items Claude detected as absent from the quote |

### Claude Intent: `quote_request`

```json
{
  "type": "quote_request",
  "confidence": 0.95,
  "customer_name": "Murphy",
  "address": "14 Shantalla Road, Galway",
  "job_description": "Bathroom tiling — floor and walls",
  "line_items": [
    { "category": "labour", "description": "Tiling — floor and walls", "quantity": 3, "unit": "days", "unit_rate": 250.00, "amount": 750.00 },
    { "category": "materials", "description": "Floor tiles (inc 15% waste)", "quantity": 11.5, "unit": "m²", "unit_rate": 18.00, "amount": 207.00 },
    { "category": "materials", "description": "Wall tiles (inc 15% waste)", "quantity": 23, "unit": "m²", "unit_rate": 22.00, "amount": 506.00 },
    { "category": "materials", "description": "Adhesive and grout", "quantity": 1, "unit": "lot", "unit_rate": 120.00, "amount": 120.00 },
    { "category": "materials", "description": "Tile trim and edging", "quantity": 1, "unit": "lot", "unit_rate": 45.00, "amount": 45.00 },
    { "category": "overhead", "description": "Travel — 3 days", "quantity": 3, "unit": "days", "unit_rate": 25.00, "amount": 75.00 },
    { "category": "overhead", "description": "Waste disposal", "quantity": 1, "unit": "skip", "unit_rate": 180.00, "amount": 180.00 }
  ],
  "contingency_percent": 5,
  "margin_percent": null,
  "deposit_percent": 50,
  "payment_terms": "Balance within 14 days of completion",
  "stage_payments": null,
  "exclusions": ["removal of existing tiles", "floor levelling", "decoration after completion"],
  "assumptions": ["existing substrate is sound and level", "site access Mon–Fri 8am–5pm", "client to clear room before work commences"],
  "provisional_sums": null,
  "warranty_months": 12,
  "seai_grant_deduction": null,
  "vat_rate": 13.5,
  "price_validity_days": 14,
  "cancellation_terms": "Deposit non-refundable if cancelled within 48 hours of agreed start date",
  "missing_items_flagged": ["cert_fee"],
  "notes": null
}
```

### Line Item Categories

| Category | Examples |
|----------|----------|
| `labour` | Day rate, hourly rate, return visits |
| `materials` | Tiles, pipe, cable, paint, plaster — always with waste factor noted |
| `subcontractor` | Labourer, specialist trade brought in |
| `cert` | RECI completion cert, RGII gas cert, BER assessment |
| `overhead` | Travel, waste disposal, skip hire, tool hire, site protection, parking |
| `provisional` | Items priced as allowances — flagged clearly on PDF |

### Waste Factors by Trade (Claude applies automatically)

| Trade | Material | Waste Factor |
|-------|----------|-------------|
| Tiler | Tiles | +15% |
| Plasterer | Plaster bags | +10% |
| Painter | Paint | +10% |
| Carpenter | Timber | +10% |
| Builder | Brick/block | +5% |

### Missing Items Check

Before confirming quote sent, Claude's reply to contractor flags missing categories:

> *"Quote for Murphy — 3 days tiling, tiles and materials included. I haven't included: travel, waste disposal, or RECI cert fee. Reply YES to send as-is, or add those now."*

### PDF Document Structure

The client-facing PDF contains:
1. **Header** — contractor name, logo, address, phone, email, VAT number, reg number (RECI/RGII/SEAI)
2. **Quote reference + date + expiry date**
3. **Client details** — name, address, phone, email
4. **Scope of works** — job description paragraph
5. **Line items table** — description, quantity, unit, unit rate, amount (no cost/margin split visible to client)
6. **Pricing summary** — subtotal ex-VAT, VAT amount + rate, total inc VAT
7. **SEAI grant deduction** (if applicable) — shown prominently
8. **Payment schedule** — deposit due on acceptance, stage payments (if any), balance terms
9. **Exclusions** — bulleted list
10. **Assumptions** — bulleted list
11. **Provisional sums** — clearly marked as estimates
12. **Warranty** — workmanship guarantee statement
13. **Price validity** — "valid until [date]"
14. **Cancellation terms**
15. **Acceptance section** — dated acceptance link or signature line
16. **Terms & conditions** — payment terms, retention of title on materials, dispute resolution reference

The contractor-facing Notion record additionally shows: cost subtotal, margin amount, margin %, cost vs. sell split.

### Client Acceptance Flow

- Client taps acceptance link → timestamps recorded in Notion → Quote status: Accepted
- n8n webhook fires → auto-creates Job from Quote data → Contractor notified: *"Mrs Murphy accepted QUO-004. Job MRP-SHA-02 created."*
- WhatsApp "yes" reply also accepted → same flow, slightly weaker legal record (noted in Notion)

### n8n Nodes Required

- New Switch branch: `quote_request` intent handler
- HTTP Request → PDF generation service (PDF.co or equivalent)
- Twilio send (WhatsApp or SMS) — quote PDF as attachment
- Notion create Quote record
- Webhook receiver for acceptance link
- Sub-workflow: Quote accepted → Create Job

### Error Handling

- PDF generation failure → retry × 2 → notify Intrigue8 via error workflow
- Client email bounce → fallback to WhatsApp delivery
- Acceptance link expired → contractor notified to re-send

---

## Add-On 2: Invoice Delivery + Payment Links — LOCKED

### Overview

When `invoice_trigger` fires, the system generates a professional PDF invoice, creates a Stripe payment link, and delivers both to the client directly (Mode A) or via the contractor for forwarding (Mode C). Cash and bank transfer are supported alongside Stripe. Payment confirmation auto-triggers `payment_received`.

### Two Delivery Modes

**Mode A — Direct to client** (default when client contact is on file):
```
invoice_trigger fires → Invoice created in Notion
→ Pull labour + cost rollups → Generate PDF
→ Create Stripe payment link
→ Send PDF + link to client WhatsApp or email
→ Contractor confirmed: "Invoice INV-007 sent to Mrs Murphy — €2,503 due"
→ Client pays → Stripe webhook → n8n → payment_received auto-triggered
→ Invoice status: Paid → Contractor + client notified
```

**Mode C — Via contractor** (no client contact on file, or contractor requests it):
```
invoice_trigger fires → Invoice created in Notion
→ Generate PDF → Create Stripe payment link
→ Send PDF + link to contractor's WhatsApp:
  "Here's Mrs Murphy's invoice INV-007 for €2,503. Forward this to her."
→ Contractor forwards manually
→ Same Stripe webhook flow when paid
```

Contractor triggers Mode C by saying: *"Invoice Murphy — send it to me"* or *"Invoice Murphy — I'll forward it."*
If client contact is missing, system falls back to Mode C automatically and tells the contractor why.

### Mandatory Client Contact on `job_setup`

Client phone or email must be captured when creating a customer. Claude flags if missing:
> *"New job created for Mrs Murphy — MRP-SHA-02. I don't have her phone or email. Add it now or I'll ask again when you invoice her."*

**Updated `job_setup` intent fields:**
```json
{
  "client_phone": "+353851234567",
  "client_email": "murphy@example.com"
}
```
At least one is required. Both stored in the Customers database.

### Payment Methods Supported

| Method | How triggered |
|--------|--------------|
| Stripe (card) | Client taps payment link — webhook auto-triggers `payment_received` |
| Bank transfer (SEPA) | Contractor logs manually via voice: "Murphy paid by transfer" |
| Cash | Contractor logs via voice: "Murphy paid cash" |
| Cheque | Contractor logs via voice: "Murphy paid by cheque" |

Cash is the default assumption when a contractor logs payment manually — if they're logging it, it wasn't Stripe.

### `payment_received` Intent — Updated

```json
{
  "type": "payment_received",
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "amount": 2503.00,
  "date": "2026-05-02",
  "payment_method": "cash",
  "notes": "paid on site"
}
```
`payment_method` values: `"cash"` | `"stripe"` | `"bank_transfer"` | `"cheque"`

### Cash Receipt Flow

When `payment_method == "cash"`:
- System generates a simple cash receipt PDF
- Sends to contractor's WhatsApp: *"Here's Mrs Murphy's cash receipt for €2,503 — forward to her if needed."*
- Contractor forwards on site or keeps for records
- Cash income logged to VAT/RCT summary (Add-on 4) with timestamp and audit trail

### Quote-to-Invoice Continuity

If the job originated from a Quote (Add-on 1) with a deposit already paid:
- Invoice pulls deposit amount from linked Quote record
- PDF shows: Total: €2,503 / Deposit paid: (€1,251) / Balance due: €1,252
- Stripe payment link is generated for balance due only, not full amount
- Balance due field on Invoice = Invoice Total − Amount Already Paid

### New Notion Fields

**Invoices database additions:**

| Field | Type | Notes |
|-------|------|-------|
| PDF URL | URL | Generated invoice PDF |
| Stripe Payment Link | URL | Unique per invoice — for balance due |
| Stripe Payment ID | Text | For webhook reconciliation |
| Delivery Mode | Select | Direct / Via Contractor |
| Sent To | Text | Client phone or email used |
| Sent Date | Date | When PDF + link dispatched |
| Due Date | Date | Sent date + payment terms (e.g. +14 days) — trigger for Add-on 3 |
| Paid Date | Date | Set by Stripe webhook or manual log |
| Payment Method | Select | Cash / Stripe / Bank Transfer / Cheque |
| Cash Receipt Sent | Checkbox | Logged when cash receipt generated |

**Customer database additions:**

| Field | Type | Notes |
|-------|------|-------|
| Phone | Text | E.164 — for WhatsApp delivery |
| Email | Text | Fallback if no WhatsApp |

**Client Mapping table additions (contractor profile):**

| Field | Type | Notes |
|-------|------|-------|
| IBAN | Text | For bank transfer details on invoice |
| BIC | Text | |
| Stripe Account ID | Text | Set during Stripe Connect onboarding |

### Invoice PDF Structure (Client-Facing)

1. **Header** — contractor name, logo, address, VAT number, reg number (RECI/RGII/SEAI)
2. **Invoice reference + date + due date**
3. **Client details** — name, address, phone, email
4. **Job reference** — job code, description
5. **Line items** — labour (hours × rate), materials (itemised from Costs), subtotals
6. **Pricing summary** — subtotal ex-VAT, VAT @ 13.5%, total inc VAT
7. **Deposit already paid** (if applicable — from Quote)
8. **Balance due** — prominently displayed
9. **Payment options:**
   - Stripe: "Pay securely online: [link]"
   - Bank transfer: IBAN, BIC, payment reference (INV-007)
   - Cash: "Cash accepted — request a receipt on payment"
10. **Payment terms** — due date, late payment notice
11. **Thank you note**

### Partial Payment Handling

Stripe webhook fires for any payment amount. If amount < balance due:
- Amount Paid updated in Notion
- Invoice status → Part Paid
- Contractor notified: *"Mrs Murphy paid €1,000 of €2,503 — €1,503 still outstanding."*
- Add-on 3 (payment chasing) continues to chase the remaining balance

### On Full Payment

- Invoice status → Paid, Paid Date set
- Contractor notified: *"Mrs Murphy paid €2,503 in full — INV-007 closed."*
- Client receives WhatsApp/email: *"Payment received — thank you, Mrs Murphy."*
- Add-on 3 chasing stops automatically

### Stripe Architecture

- **Stripe Connect** — each contractor onboards their own Stripe account; money goes directly to contractor, never through Intrigue8
- **One-time setup** — contractor provides Stripe credentials during onboarding; stored in Client Mapping table
- **Fees** — Stripe charges ~1.5% + €0.25 per EU card transaction; absorbed by contractor or noted on invoice

### Add-on 3 Handoff

`Due Date` is written to the Invoice record when the invoice is sent. Add-on 3 reads this field to know when to begin chasing. No additional trigger needed.

### n8n Nodes Required

- Extend existing `invoice_trigger` handler
- HTTP Request → PDF generation service
- HTTP Request → Stripe API (create payment link for balance due)
- Twilio send — PDF + link to client (Mode A) or contractor (Mode C)
- Cash receipt PDF generation + Twilio send (when payment_method == cash)
- New webhook receiver — Stripe payment confirmation (full and partial)
- Auto-trigger `payment_received` intent on Stripe webhook
- Notion update — Invoice status, paid date, payment method, Stripe fields
- New intent handler: `invoice_resend` — re-fires PDF + link to same contact

### Error Handling

- PDF generation failure → retry × 2 → notify Intrigue8
- Stripe link creation failure → retry × 2 → fall back to Mode C with bank transfer details only
- Client WhatsApp delivery failure → fallback to email
- Stripe webhook duplicate → idempotency check on Stripe Payment ID before updating Notion

---

## Add-On 3: Automated Payment Chasing — LOCKED

### Overview

When an invoice goes unpaid past its due date, the system automatically chases the client through a structured escalation sequence — email, then physical posted letters, then recorded delivery final demand. Every step is timestamped and logged, building a documented legal paper trail. If the debt ever goes to the Small Claims Court or beyond, the contractor has full evidence of every contact attempt, the dates they were made, and proof of delivery.

### Selling Point: Built-In Debt Recovery Insurance

This is not just a reminder system. It is a documented evidence trail — every email sent, every letter posted, every recorded delivery receipt — all timestamped and stored in Notion. If a client refuses to pay and the matter goes to:

- **Small Claims Court** (up to €2,000) — the chase log is the evidence file
- **District Court** — formal letters of demand with proof of delivery satisfy the legal requirement to demonstrate reasonable attempts to recover payment
- **Debt collection agency** — a complete chase log with dates and delivery confirmations significantly strengthens the case and reduces agency fees

The system effectively replaces a solicitor's letter for the first four stages of debt recovery, at a cost of €4–6 in postage versus €150–300 for a solicitor's letter. For a contractor owed €2,500, that is the difference between writing the debt off and recovering it.

---

### How It Works

When Add-on 2 writes a `Due Date` to an Invoice record, the chasing schedule starts. n8n runs a daily check at 8am.

```
Daily 8am check → find all invoices where:
  Status = Sent OR Part Paid
  AND Due Date has passed
  AND Chase Enabled = true
  AND Chase Paused = false

For each overdue invoice → check Chase Stage → send next message
→ Log chase sent → update Chase Stage, Last Chased Date, Next Chase Date
→ If status = Paid → stop all chasing automatically
```

---

### Chase Schedule

| Stage | Trigger | Channel | Tone | Cost |
|-------|---------|---------|------|------|
| Reminder 1 | Due + 1 day | Email | Friendly — "just a reminder" | — |
| Reminder 2 | Due + 7 days | Email | Neutral — "this remains outstanding" | — |
| Reminder 3 | Due + 14 days | Email + Posted letter | Firm — "please arrange payment this week" | ~€2 |
| Reminder 4 | Due + 21 days | Email + Posted letter | Formal demand — specific deadline stated | ~€2 |
| Final notice | Due + 30 days | Email + Recorded post | Final — legal language, 7-day ultimatum | ~€4 |
| Escalation alert | Due + 37 days | Contractor WhatsApp only | No further automated contact — contractor decides next step | — |

After the escalation alert, automated client contact stops. The contractor has a complete documented trail and can choose to: call the client directly, engage a debt collector, or file a Small Claims Court application.

---

### Message Templates

**Reminder 1 — Email (friendly):**
> Subject: Invoice INV-007 — Friendly Reminder
>
> Hi [Client Name],
>
> Just a friendly reminder that invoice INV-007 from [Contractor Name] for €[amount] was due yesterday.
>
> You can pay securely online: [Stripe link]
> Or by bank transfer: IBAN [IBAN] / Ref: INV-007
>
> If you've already made payment, many thanks — please ignore this message.
>
> [Contractor Name] | [Phone]

**Reminder 3 — Posted letter (firm):**
```
[Contractor letterhead — name, address, VAT no, reg no]
[Date]                                    [Reference: INV-007]

Re: Outstanding Invoice — €[amount]

Dear [Client Name],

We write regarding invoice INV-007 dated [invoice date] for works
completed at [site address], which remains unpaid and is now 14 days
overdue.

We ask that you arrange payment of €[balance due] within 7 days.

Payment options:
  Online: [Stripe link]
  Bank transfer: IBAN [IBAN] / BIC [BIC] / Ref: INV-007
  Cash: Please contact us to arrange

If you have already made payment, please accept our thanks and
disregard this letter.

Yours sincerely,
[Contractor Name]
[Phone] | [Email]
```

**Final notice — Recorded post (legal language):**
```
[Contractor letterhead]
[Date]                          NOTICE OF FINAL DEMAND

Re: Debt Recovery — Invoice INV-007 — €[amount]

Dear [Client Name],

This is a formal final demand for payment of €[amount] outstanding
under invoice INV-007 dated [date] for works at [address].

Despite previous correspondence dated [dates of prior letters],
this invoice remains unpaid [X] days after the due date.

You are required to make payment in full within 7 days of this
letter. Failure to do so will result in this matter being referred
for formal debt recovery proceedings, which may result in additional
costs being sought against you.

Payment: [Stripe link] / IBAN [IBAN] / Ref: INV-007

Yours faithfully,
[Contractor Name]
[Phone] | [Email]
```

---

### Postal Mail Integration

**Provider:** PostGrid or Lob (both cover Ireland, both have REST APIs)

**Flow:**
```
Chase Stage 3, 4, or 5 reached
→ n8n generates letter PDF (contractor letterhead template)
→ HTTP Request → PostGrid API with PDF + client address
→ PostGrid prints, envelopes, stamps, posts next working day
→ Notion updated: letter posted, date logged
→ Stage 5 (Final notice): recorded delivery option — PostGrid returns tracking reference
→ Tracking reference stored in Notion as proof of delivery
```

**Cost per letter:** ~€1.50–3.00 (PostGrid rate) + Irish postage ~€1.25 = ~€2–4 per letter
**Recorded delivery surcharge:** ~€1–2 extra for Stage 5

**Address source:** Customer record (already in system from `job_setup`). No extra data required from contractor.

---

### Legal Paper Trail — What Gets Stored

Every chase action is logged in Notion with full detail:

| Record | What's stored |
|--------|--------------|
| Each email sent | Date, time, recipient address, message text, stage number |
| Each letter posted | Date posted, PostGrid confirmation ID, delivery address |
| Recorded delivery | Tracking reference, proof of delivery date |
| Payment received | Date, amount, method — auto-logged via Stripe or voice |
| Chase paused/stopped | Date, reason (if given by contractor) |

**Chase Log field** on the Invoice record builds automatically:
```
2026-05-16 08:01 — Reminder 1 sent via email to murphy@example.com
2026-05-22 08:01 — Reminder 2 sent via email to murphy@example.com
2026-05-29 08:01 — Reminder 3 sent via email + letter posted (PostGrid ref: PG-00123)
2026-06-05 08:01 — Reminder 4 sent via email + letter posted (PostGrid ref: PG-00187)
2026-06-12 08:01 — Final notice sent via email + recorded post (An Post ref: IE123456789)
2026-06-19 08:01 — Escalation alert sent to contractor — no further automated contact
```

This log can be printed or exported directly from Notion as an evidence document for court.

---

### New Notion Fields on Invoices

| Field | Type | Notes |
|-------|------|-------|
| Chase Enabled | Checkbox | Default true when invoice sent |
| Chase Stage | Number | 0–5 |
| Last Chased Date | Date | When last message was sent |
| Next Chase Date | Date | Calculated from schedule |
| Chase Log | Text | Full timestamped log of all actions |
| Chase Paused | Checkbox | Temporary pause |
| Letters Posted | Number | Count of physical letters sent |
| Recorded Delivery Ref | Text | An Post / PostGrid tracking reference |
| Proof of Delivery Date | Date | Confirmed delivery of recorded letter |

---

### Contractor Controls (Voice)

| Voice command | Action |
|---|---|
| *"Stop chasing Murphy"* | Chase Enabled → false |
| *"Pause chasing Murphy"* | Chase Paused → true, auto-resumes in 7 days |
| *"Chase Murphy now"* | Sends next stage immediately |
| *"What does Murphy owe?"* | Returns balance + chase stage + last contact date |
| *"Send Murphy a final notice"* | Jumps to Stage 5 immediately |

---

### Weekly Cash Flow Summary — Monday 8am

Contractor receives a WhatsApp summary every Monday:

> *"Good morning. Outstanding invoices:*
> *• Mrs Murphy — INV-007 — €2,503 — 21 days overdue (Stage 3 — letter posted)*
> *• Joe Brennan — INV-009 — €840 — 3 days overdue (Stage 1)*
> *• Total outstanding: €3,343*
> *• Paid this month: €6,200*
> *• Paid this week: €1,450"*

---

### Partial Payment Handling

If client pays part of the invoice:
- Chase continues for remaining balance only
- Messages reference remaining amount
- Chase Log records partial payment with date and amount

### n8n Nodes Required

- Scheduled trigger — daily 8am
- Notion query — all overdue open invoices
- Loop — per invoice, check stage and dates
- Email send (SMTP or SendGrid) — Stages 1, 2, 3, 4, 5
- HTTP Request → PostGrid API — Stages 3, 4, 5 (letter PDF)
- Twilio WhatsApp — escalation alert to contractor at Stage 6
- Notion update — Chase Stage, Last Chased, Next Chase, Chase Log
- Scheduled trigger — Monday 8am weekly summary
- New intent handlers: `chase_stop`, `chase_pause`, `chase_now`, `balance_query`, `chase_final`

---

## Add-On 4: RCT & VAT Tax Summary — LOCKED

### What It Is

A real-time tax intelligence module that automatically tracks every invoice raised, every cost logged, every RCT deduction made, and every payment received — then produces clean, structured summaries on a bi-monthly schedule (aligned to Revenue's VAT return cycle) and a full annual summary for the Form 11. The contractor hands their accountant a professional document instead of a shoebox of receipts.

All data comes from the system the contractor is already using. No extra data entry. No new habits. It runs in the background and surfaces what the accountant needs, when they need it.

---

### Why It Works as an Upsell

**The pain is universal and unavoidable.** Every contractor in the research cited RCT and VAT compliance as a major burden. Unlike some pain points that only affect certain trades or business sizes, Revenue compliance affects 100% of the target market. There is no contractor who does not have this problem.

**The alternative has a price tag.** Irish contractors pay €500–€1,500 per year to an accountant to organise exactly what this module does automatically. A contractor paying €800/year to an accountant for bookkeeping preparation can see immediately that this module costs a fraction of that and delivers the same output in real time rather than once a year in a panic before the October deadline.

**It reduces accountancy fees.** When the contractor hands their accountant a structured, itemised bi-monthly summary rather than a bag of receipts and a rough spreadsheet, the accountant spends significantly less time on data organisation. That time saving shows up on the accountant's invoice. The module effectively pays for itself through reduced accountancy costs — a point that can be demonstrated in a sales conversation.

**Revenue compliance is not optional.** Missing a bi-monthly VAT return triggers a surcharge of 10% of the VAT due, plus interest at 0.0274% per day. Missing multiple returns triggers an audit. The fear of Revenue is acute for sole traders — it is cited in almost every piece of Irish SME research as a top stress factor. This module removes that fear with a concrete system rather than wishful thinking.

**It creates the highest retention of any add-on.** Once a contractor's bi-monthly VAT data, RCT ledger, and cost history live in this system, switching to anything else means losing that history and rebuilding it manually. This is the module that makes the contractor permanently dependent on the platform in the best possible way — their entire financial record is here.

**The accountant becomes a referral channel.** When a contractor's accountant starts receiving clean, professional quarterly summaries from Intrigue8 — labelled with the platform name — the accountant notices. Accountants in the West of Ireland serve dozens of trade contractors. A tool that saves them preparation time and reduces client errors is one they will recommend to other clients. Add-on 4 turns the accountant into a passive sales channel.

**Upsell timing is natural.** A contractor who is already using the core system (Tier 1) and has added invoice delivery and payment chasing (Tier 2) is now organised, getting paid faster, and has a complete job history in Notion. The tax summary (Tier 3) is the obvious next question: *"All this data is already in the system — can it do my VAT return prep too?"* The answer is yes, and the sale is easy.

---

### Overview

The module runs automatically on a bi-monthly schedule and produces:
1. **Bi-monthly VAT summary** — aligned to Revenue's return cycle
2. **Annual year-end summary** — full year data for the Form 11 (delivered every January)
3. **On-demand queries** — contractor can ask any time via voice

All figures are pulled from existing Notion databases. No new data entry required beyond two small additions to the data model.

---

### VAT Filing Periods — Ireland

Revenue's default VAT return cycle is bi-monthly. Summaries trigger automatically:

| Period | Summary generated | VAT due date |
|--------|------------------|-------------|
| Jan–Feb | 1st March | 23rd March |
| Mar–Apr | 1st May | 23rd May |
| May–Jun | 1st July | 23rd July |
| Jul–Aug | 1st September | 23rd September |
| Sep–Oct | 1st November | 23rd November |
| Nov–Dec | 1st January | 23rd January |

Contractor receives their summary three weeks before the Revenue deadline — enough time to review, query anything, and hand to their accountant.

Quarterly filing (by Revenue arrangement) available as a configuration option in the Client Mapping table: `vat_period: "bimonthly" | "quarterly" | "annual"`.

---

### VAT Treatment — Direct vs. Principal Contractor Work

This is the critical split that most manual systems get wrong.

**Direct client work** (homeowner, business — no RCT):
- Contractor charges VAT at 13.5% on services
- VAT collected → declared on VAT return → paid to Revenue

**Principal contractor work** (RCT applies — `Principal Contractor` flag set on Customer):
- Contractor issues invoice **without VAT** (reverse charge applies)
- Principal pays VAT directly to Revenue
- Contractor reclaims VAT on their own costs as normal
- This income appears in the summary but **does not contribute to VAT collected**

The summary separates these clearly so the accountant sees the correct VAT position immediately.

---

### What It Tracks

**Income — Direct client work:**
- All invoices raised to non-principal clients
- VAT collected at 13.5%
- Payments received (all methods — cash, Stripe, bank transfer, cheque)
- Outstanding balances

**Income — Principal contractor work (RCT):**
- All invoices to principal contractors (no VAT charged)
- Gross invoice value
- RCT withheld at source (0%, 20%, or 35% — logged via `payment_received` intent)
- Net received after RCT deduction
- RCT: reported as "tax paid on your behalf" — offsets income tax liability at year-end via ROS

**Expenditure — Job costs (from Costs database):**
- Materials: VAT-reclaimable at 13.5% or 23% (inferred from item type, overridable)
- Labour-only subcontractor payments: no VAT, RCT may apply
- Other job costs: skip hire, tool hire, certs — VAT rate per item

**Expenditure — General business expenses (new input channel):**
Items not tied to a specific job. Contractor logs these by voice:
*"Log business expense — van insurance €840 for the year"*
*"Log mileage — 340 kilometres this month"*

Categories tracked:
- Mileage (Revenue rate: €0.43/km for first 1,500km, €0.24/km thereafter)
- Phone (business portion — contractor states percentage)
- Insurance (van, public liability, tool, employers)
- Professional subscriptions (RECI, RGII, CIF, Safe Electric fees)
- Tools and equipment
- Training and CPD
- Accountancy fees
- Other

These feed into the annual Form 11 summary as deductible business expenses.

---

### RCT Tracking

When payment arrives from a principal contractor client, the system prompts:

> *"Payment received from Lydon Construction — €3,200. Was RCT withheld? If so, how much?"*

Contractor replies: *"Yes, 20% — €640."* System logs:
- Gross: €3,200
- RCT withheld: €640 (20%)
- Net received: €2,560
- Tax paid on your behalf: €640 → added to RCT running total

The running total is visible on-demand and appears in every summary. At year-end, the contractor knows exactly how much has been paid on their behalf via RCT before they open ROS.

**RCT rate context stored per client:**
If a contractor's RCT rate is 0% (full compliance), 20% (standard), or 35% (non-compliant), the Client Mapping table stores this so payment receipts from that client automatically flag the expected deduction.

---

### Bi-Monthly VAT Summary PDF

```
[Contractor Name] — VAT Summary
Period: 01 Jan – 28 Feb 2026          VAT No: IE [number]
Generated: 01 Mar 2026                Due date: 23 Mar 2026

─────────────────────────────────────────────────
INCOME — DIRECT CLIENT WORK (VAT applicable)

  Invoices raised (ex-VAT):            €12,400.00
  VAT collected @ 13.5%:               € 1,674.00
  Gross invoiced (inc VAT):            €14,074.00
  Payments received:                   €11,200.00
  Outstanding:                         € 2,874.00

─────────────────────────────────────────────────
INCOME — PRINCIPAL CONTRACTOR WORK (Reverse charge — no VAT)

  Invoices raised (no VAT):            € 6,400.00
  RCT withheld (20%):                  € 1,280.00
  Net received:                        € 5,120.00
  Tax paid on your behalf (RCT):       € 1,280.00

─────────────────────────────────────────────────
EXPENDITURE — COSTS & MATERIALS

  VAT-reclaimable costs (ex-VAT):      € 3,840.00
  VAT on purchases @ 13.5%:           €   518.40
  VAT on purchases @ 23%:             €   115.00
  Total VAT reclaimable:              €   633.40
  Non-VAT costs:                      €   620.00

─────────────────────────────────────────────────
VAT RETURN SUMMARY

  VAT collected (direct work):         € 1,674.00
  VAT reclaimable on costs:           €  (633.40)
  ─────────────────────────────────────────────
  NET VAT PAYABLE TO REVENUE:         € 1,040.60
  Due: 23rd March 2026 via ROS

─────────────────────────────────────────────────
RCT POSITION (year to date)

  RCT withheld Jan–Feb 2026:          € 1,280.00
  Cumulative YTD (Jan–Feb):           € 1,280.00
  Note: RCT offsets your income tax
  liability at year-end via Form 11.
  Consult your accountant.

─────────────────────────────────────────────────
Prepared automatically by Intrigue8 Voice-to-Invoice.
All figures derived from job records, invoices, and cost logs.
Income tax, USC, and PRSI liability are calculated by your
accountant on your annual Form 11 return. This document does
not constitute tax advice.
```

---

### Annual Year-End Summary (January)

Generated every 1st January covering the full previous year. This is the primary document for the accountant preparing the Form 11 (due 31 October / 15 November via ROS).

Covers:
- Total income — direct and principal contractor work
- Total VAT paid bi-monthly (reconciliation)
- Total RCT withheld across the year
- All job costs — categorised by VAT rate
- All general business expenses — mileage, insurance, subscriptions, etc.
- Full invoice list with status (paid / outstanding)
- Full cost list with supplier and date

Delivered via WhatsApp PDF to contractor on 1st January with message:
> *"Your 2025 year-end summary is ready. Forward this to your accountant — it covers everything they need for your Form 11. Total income: €[X] / RCT paid on your behalf: €[X] / Outstanding invoices: €[X]."*

---

### On-Demand Voice Queries

| Voice query | Response |
|---|---|
| *"What's my VAT this period?"* | VAT collected, VAT on costs, net payable + due date |
| *"How much RCT has been taken from me?"* | Total RCT YTD + by client |
| *"What did I earn this month?"* | Total invoiced + total received |
| *"What's outstanding?"* | All unpaid invoices with ages |
| *"Send my tax summary"* | Generates and sends current period PDF immediately |
| *"Log mileage — X kilometres"* | Logs to general business expenses |
| *"Log business expense — [item] €[amount]"* | Logs to general business expenses |

---

### New Data Fields Required

**Customer record:**

| Field | Type | Notes |
|-------|------|-------|
| Principal Contractor | Checkbox | True = RCT applies, no VAT on invoices |
| RCT Rate | Select | 0% / 20% / 35% — stored for payment prompts |

**Cost record:**

| Field | Type | Notes |
|-------|------|-------|
| VAT Rate on Purchase | Select | 0% / 13.5% / 23% / Exempt |

**New database — General Business Expenses:**

| Field | Type | Notes |
|-------|------|-------|
| Date | Date | |
| Category | Select | Mileage / Phone / Insurance / Subscriptions / Tools / Training / Accountancy / Other |
| Description | Text | Contractor's wording preserved |
| Amount | Number | € |
| VAT Rate | Select | 0% / 13.5% / 23% / Exempt |
| VAT Amount | Formula | |
| Period | Text | Which bi-monthly period this falls into |

**Client Mapping table:**

| Field | Type | Notes |
|-------|------|-------|
| VAT Period | Select | Bimonthly (default) / Quarterly / Annual |

---

### Phase 2 — Contractor as Principal

For builders and general contractors who hire subcontractors: they become principal contractors and must withhold RCT from subcontractor payments and notify Revenue via ROS. Tracking RCT withheld on payments made (not just received) is a Phase 2 addition — flagged but out of MVP scope.

---

### n8n Nodes Required

- Scheduled trigger — bi-monthly (1st of month following each period end)
- Scheduled trigger — 1st January (annual summary)
- Notion query — invoices, costs, payments, general expenses for period
- Calculation node — VAT collected, VAT on costs, net payable, RCT YTD
- Split by client type — direct vs. principal (VAT treatment differs)
- PDF generation — bi-monthly VAT summary + annual year-end summary
- Twilio send — PDF to contractor WhatsApp with summary message
- New intent handlers: `tax_query`, `vat_query`, `rct_query`, `income_query`, `summary_request`, `expense_log`, `mileage_log`
- RCT prompt flow — triggered on `payment_received` from principal contractor client

---

*Spec continues as each add-on design is approved.*
