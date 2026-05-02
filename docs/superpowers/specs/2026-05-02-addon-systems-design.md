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

## Add-On 4: RCT & VAT Tax Summary — PENDING DESIGN

---

*Spec continues as each add-on design is approved.*
