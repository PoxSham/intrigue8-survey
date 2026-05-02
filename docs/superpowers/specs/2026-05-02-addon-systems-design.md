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

## Add-On 2: Invoice Delivery + Payment Links — PENDING DESIGN

---

## Add-On 3: Automated Payment Chasing — PENDING DESIGN

---

## Add-On 4: RCT & VAT Tax Summary — PENDING DESIGN

---

*Spec continues as each add-on design is approved.*
