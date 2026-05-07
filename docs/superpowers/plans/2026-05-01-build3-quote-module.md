# Quote/Estimate Module — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Agent guidance:** Use specialist agents in `.claude/agents/` for domain work — `ai-prompt-engineer` for the complex quote extraction prompt, `backend-developer` for PDF.co template and acceptance link security, `automation-engineer` for n8n workflow, `solutions-architect` for any design decisions, `contrarian` before major decisions. Use other Claude agent types and superpowers skills freely where they fit.

**Goal:** Allow contractors to dictate a job quote by voice. Claude extracts a fully-structured, correctly-priced quote with labour, materials (inc. waste factors), overhead, margin, VAT, deposit, exclusions, and assumptions. A professional PDF is generated and delivered to the client. Client acceptance auto-creates a Job in Notion.

**Architecture:** New `quote_request` intent added to Claude taxonomy. New Notion Quotes database created. Three n8n sub-workflows: quote PDF generation, quote delivery, and quote acceptance webhook. The acceptance link is an opaque token resolved server-side — client data never appears in the URL.

**Tech Stack:** n8n · Claude API (Haiku for extraction, Sonnet for complex multi-item quotes) · PDF.co API · SendGrid API · Twilio WhatsApp API · Notion API

**Prerequisites:**
- Core voice-to-invoice workflow is built and passing all 6 test scenarios
- PDF.co and SendGrid already configured (Add-on 2)
- Notion workspace accessible

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `n8n/templates/quote-template.html` | Create | PDF.co HTML template for client quote (16 sections) |
| `prompts/system-prompt-v5.md` | Create | Updated Claude prompt adding quote_request intent |
| `docs/N8N_PINNED_TEST_DATA_ADDON1.md` | Create | Test data for quote scenarios (min. 5 trades) |
| Quotes DB (Notion) | Create | New database with 27 fields |
| n8n: quote-request-handler | Create | Main quote intent handler |
| n8n: sub-wf-quote-delivery | Create | Email + WhatsApp fallback delivery |
| n8n: acceptance-webhook | Create | Client acceptance webhook receiver |
| n8n: sub-wf-quote-to-job | Create | Quote accepted → Job creation |

---

## Task 1: Create Quotes Notion Database

**This is a new database, not additions to existing ones.**

- [ ] **Step 1: Create the Quotes database in Notion**

Navigate to the contractor's Notion workspace → add a new full-page database called "Quotes".

Create all 27 properties:

| Property | Type | Notes |
|---|---|---|
| Quote Number | Title | QUO-001 format — auto-assigned by n8n on create |
| Customer | Relation → Customers | |
| Job Description | Text | Narrative scope of works |
| Line Items JSON | Text | Structured JSON — full line items array |
| Cost Subtotal | Number | Sum of all line item amounts |
| Margin % | Number | From contractor profile; overridable |
| Margin Amount | Formula | `prop("Cost Subtotal") * prop("Margin %") / 100` |
| Subtotal ex-VAT | Formula | `prop("Cost Subtotal") + prop("Margin Amount")` |
| VAT Rate | Number | 13.5 for construction; 23 if goods-only |
| VAT Amount | Formula | `prop("Subtotal ex-VAT") * prop("VAT Rate") / 100` |
| Total inc VAT | Formula | `prop("Subtotal ex-VAT") + prop("VAT Amount")` |
| SEAI Grant Deduction | Number | HVAC only; subtracted from client price |
| Deposit % | Number | Default 50; overridable |
| Deposit Amount | Formula | `prop("Total inc VAT") * prop("Deposit %") / 100` |
| Payment Terms | Text | e.g. "Balance within 14 days of completion" |
| Stage Payments JSON | Text | JSON array for multi-milestone jobs |
| Exclusions | Text | What is NOT included |
| Assumptions | Text | Conditions the price depends on |
| Provisional Sums JSON | Text | Items priced as allowances |
| Contingency % | Number | Default 0; suggest 5–10% for jobs > €1,500 |
| Contingency Amount | Formula | `prop("Cost Subtotal") * prop("Contingency %") / 100` |
| Warranty Months | Number | Default 12 |
| Price Validity Days | Number | Default 14 |
| Expiry Date | Formula | `dateAdd(prop("Sent Date"), prop("Price Validity Days"), "days")` — requires Sent Date to be set |
| Cancellation Terms | Text | e.g. "Deposit non-refundable if cancelled within 48 hours" |
| Contractor VAT No | Text | Pulled from Client Mapping at quote creation |
| Contractor Reg No | Text | RECI/RGII/SEAI — pulled from Client Mapping |
| Status | Select | Options: Draft, Sent, Accepted, Declined, Expired |
| Sent Date | Date | |
| Accepted Date | Date | Set on acceptance |
| Acceptance Token | Text | Opaque UUID — used for acceptance link |
| Converted Job | Relation → Jobs | Set on acceptance |
| Missing Items Flagged | Text | Categories Claude detected as absent |
| PDF URL | URL | Generated quote PDF |

- [ ] **Step 2: Get the new database ID**

After creating, open the database in full-page view. Copy the database ID from the URL (32-character string). Add to `docs/NOTION_DATABASE_IDS.md`:
```
- Quotes: [new-id]
DB_QUOTES=[new-id-no-hyphens]
```

- [ ] **Step 3: Share database with n8n integration**

In Notion → Settings → Integrations: ensure the Voice-to-Invoice integration has access to the new Quotes database.

- [ ] **Step 4: Commit docs update**

```bash
git add docs/NOTION_DATABASE_IDS.md
git commit -m "docs: Quotes database added to Notion — ID recorded"
```

---

## Task 2: Claude System Prompt v5 — quote_request Intent

**Files:**
- Create: `prompts/system-prompt-v5.md`

This is the most complex prompt addition. The `quote_request` intent requires Claude to:
1. Extract labour, materials, overhead as separate line items
2. Apply waste factors by trade automatically
3. Flag missing categories before the contractor sends
4. Handle Irish trade slang and approximations
5. Output a structured JSON array with all fields

- [ ] **Step 1: Write the test cases first (minimum 5 trades)**

Create `docs/N8N_PINNED_TEST_DATA_ADDON1.md`:

**Test 1 — Tiler (with waste factor):**
```
Transcript: "I need to quote Mrs Murphy on Shantalla for bathroom tiling — floor and walls. About three days' work at my rate. Floor is about ten square metres and walls about twenty square. Tiles are roughly eighteen euro a square metre for the floor and twenty-two for the walls. Adhesive and grout will be about a hundred and twenty, tile trim forty-five. I'll be travelling out there so that's twenty-five a day. Skip hire will be about a hundred and eighty."

Expected JSON:
{
  "type": "quote_request",
  "confidence": 0.94,
  "customer_name": "Murphy",
  "address": "Shantalla",
  "job_description": "Bathroom tiling — floor and walls",
  "line_items": [
    { "category": "labour", "description": "Tiling — floor and walls", "quantity": 3, "unit": "days", "unit_rate": 250.00, "amount": 750.00 },
    { "category": "materials", "description": "Floor tiles (inc 15% waste)", "quantity": 11.5, "unit": "m²", "unit_rate": 18.00, "amount": 207.00 },
    { "category": "materials", "description": "Wall tiles (inc 15% waste)", "quantity": 23.0, "unit": "m²", "unit_rate": 22.00, "amount": 506.00 },
    { "category": "materials", "description": "Adhesive and grout", "quantity": 1, "unit": "lot", "unit_rate": 120.00, "amount": 120.00 },
    { "category": "materials", "description": "Tile trim", "quantity": 1, "unit": "lot", "unit_rate": 45.00, "amount": 45.00 },
    { "category": "overhead", "description": "Travel — 3 days", "quantity": 3, "unit": "days", "unit_rate": 25.00, "amount": 75.00 },
    { "category": "overhead", "description": "Skip hire", "quantity": 1, "unit": "skip", "unit_rate": 180.00, "amount": 180.00 }
  ],
  "contingency_percent": 5,
  "margin_percent": null,
  "deposit_percent": 50,
  "missing_items_flagged": ["cert_fee"],
  "vat_rate": 13.5
}
```

**Test 2 — Plumber (with cert fee included):**
```
Transcript: "Quote for O'Brien on Prospect Hill — full bathroom fit-out. Two days labour, materials about four hundred, I'll need to get a cert after, that's usually a hundred and fifty. Travel fifty each day, parking twenty. Throw in a contingency — say five percent."

Expected JSON includes: cert line item at 150.00, missing_items_flagged: []
```

**Test 3 — Painter (with 10% waste):**
```
Transcript: "Painting quote for the Kellys — full house interior, five rooms. Three days at my rate. Paint — I'll need about twenty litres of ceiling white at twelve euro and thirty litres of wall paint at fifteen. Primer ten litres at eight."

Expected: paint quantities × 1.10 (10% waste), total calculated correctly
```

**Test 4 — HVAC installer (with SEAI grant):**
```
Transcript: "Heat pump quote for Lydon — supply and install a ten kilowatt unit. Materials about three grand, two days install. SEAI grant applies — they'll get eighteen hundred off. Register the cert through SEAI, that's two hundred."

Expected: seai_grant_deduction: 1800.00, cert_fee line item 200.00
```

**Test 5 — Multi-intent rejection:**
```
Transcript: "Done the Murphy job today — six hours. Quote Kelly for the extension, two weeks, ten grand materials, labour at three-fifty a day."

Expected: Two separate intents extracted — labour_log for Murphy AND quote_request for Kelly
```

Run all 5 against v4 prompt. Confirm all fail (quote_request not recognised). Record.

- [ ] **Step 2: Write the quote_request intent definition**

Copy `prompts/system-prompt-v4.md` → `prompts/system-prompt-v5.md`. Add:

```
quote_request: The contractor wants to produce a price quote for a client.
Signals: "quote", "price up", "estimate", "how much would it cost", "what would I charge"

Fields:
  customer_name: string
  address: string | null
  job_description: string — preserve contractor's exact wording
  line_items: array of objects, each:
    category: "labour" | "materials" | "overhead" | "subcontractor" | "cert" | "provisional"
    description: string — preserve contractor's exact wording
    quantity: number
    unit: string (e.g. "days", "hrs", "m²", "m", "lot", "item", "skip")
    unit_rate: number (€ per unit)
    amount: number (quantity × unit_rate)

WASTE FACTORS — apply automatically to materials:
  Tiles (tiling work): quantity × 1.15 (15% waste — note in description "inc 15% waste")
  Plaster/render: quantity × 1.10
  Paint: quantity × 1.10
  Timber/boarding: quantity × 1.10
  Brick/block: quantity × 1.05
  Other materials: no waste factor unless contractor specifies one

OVERHEAD category — always include as separate line items:
  Travel: distance or days × rate
  Skip hire / waste disposal
  Tool hire
  Parking / congestion
  Site protection (plastic sheeting, floor protection)

CERT category — always include if trade requires completion cert:
  Plumber: RGII gas cert (~€150), RECI (if electrical element)
  Electrician: RECI completion cert (~€150–300)
  HVAC: SEAI registration cert (~€200)
  If contractor does not mention a cert for a cert-eligible trade: add to missing_items_flagged: ["cert_fee"]

SEAI grant:
  If contractor mentions SEAI grant or home energy upgrade: set seai_grant_deduction to grant amount
  Note: grant is deducted from client-facing total, not from costs

MISSING ITEMS CHECK:
  Before flagging missing items, check what trade this is from job_description.
  missing_items_flagged is an array of category strings that appear absent for this trade type:
  ["cert_fee"] — no cert line item for a trade that requires one
  ["travel"] — no travel item for a job with a stated address
  ["waste_disposal"] — no waste/skip item for a full fit-out or demolition job

contingency_percent: number | null — if contractor says "add a contingency" extract the %; if over €1,500 job and no contingency mentioned, suggest 5 in confirmation but leave null in JSON
margin_percent: null always — margin is set from contractor profile, not voice
deposit_percent: 50 (default) — override if contractor specifies
vat_rate: 13.5 for construction services; 23 if goods only; 0 if contractor says "no VAT" or RCT client
price_validity_days: 14 (default)
notes: string | null — any other contractor observations
```

- [ ] **Step 3: Write the confirmation template for quote_request**

```
Confirmation format:
"Quote for {{ customer_name }}:
{{ line_items summary — each item: description, amount }}
Contingency: {{ contingency_percent }}% = €{{ contingency_amount }}
Total before margin: €{{ cost_subtotal }}
Missing from this quote: {{ missing_items_flagged | "None detected" }}
Reply YES to send as-is, or add missing items now."

Rule: Claude must never insert margin amount in confirmation — that is contractor-private.
```

- [ ] **Step 4: Run all 5 test cases against v5 prompt**

Expected: all 5 extract quote_request correctly. Waste factors applied correctly (verify: 10m² tiles → 11.5m² with 15% waste). Cert fee flagged in missing_items_flagged where appropriate.

- [ ] **Step 5: Run regression on all previous intents**

Scenarios 1–6 from `docs/N8N_PINNED_TEST_DATA.md` + Add-on 2 tests (Tests A–D) + Add-on 3 tests (Tests A–E). All must still pass.

- [ ] **Step 6: Commit**

```bash
git add prompts/system-prompt-v5.md docs/N8N_PINNED_TEST_DATA_ADDON1.md
git commit -m "feat: system prompt v5 — add quote_request intent with waste factors, cert flags, SEAI grant"
```

---

## Task 3: Quote PDF Template

**Files:**
- Create: `n8n/templates/quote-template.html`

This is the 16-section client-facing quote document. The contractor-facing data (cost subtotal, margin %) is NOT in this template.

- [ ] **Step 1: Create the template**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #2c2c2c; padding: 36px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; }
.logo { max-height: 70px; }
.quote-title { font-size: 26pt; font-weight: bold; color: #1a1a1a; }
.meta-box { background: #f7f7f7; padding: 14px 18px; margin: 16px 0; border-left: 4px solid #1a1a1a; }
.meta-box table { width: 100%; }
.meta-box td { padding: 3px 8px; }
.section-title { font-size: 10.5pt; font-weight: bold; color: #1a1a1a; margin: 18px 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; }
table.items { width: 100%; border-collapse: collapse; margin: 10px 0; }
table.items th { background: #1a1a1a; color: #fff; padding: 8px 10px; font-size: 9.5pt; text-align: left; }
table.items td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }
table.items .num { text-align: right; }
table.items .provisional td { font-style: italic; color: #666; }
.totals-block { width: 320px; margin-left: auto; margin-top: 14px; }
.totals-block table { width: 100%; border-collapse: collapse; }
.totals-block td { padding: 5px 8px; }
.totals-block .total-row td { border-top: 1px solid #ccc; font-weight: bold; }
.totals-block .grant-row td { color: #1a6b1a; }
.totals-block .main-total td { border-top: 2px solid #1a1a1a; font-size: 13pt; font-weight: bold; }
.deposit-box { background: #edf4ff; border: 1px solid #b5c9f5; border-radius: 4px; padding: 14px 18px; margin: 18px 0; }
.deposit-box h3 { margin-bottom: 10px; color: #1a4bbf; font-size: 11pt; }
.excl-list, .assump-list { padding-left: 20px; margin: 6px 0; }
.excl-list li, .assump-list li { margin: 3px 0; }
.acceptance-box { background: #f0f7f0; border: 2px solid #4caf50; border-radius: 6px; padding: 18px 22px; margin: 22px 0; text-align: center; }
.acceptance-box h3 { color: #2e7d32; margin-bottom: 10px; }
.acceptance-link { display: inline-block; background: #2e7d32; color: white; padding: 10px 24px; border-radius: 4px; text-decoration: none; font-weight: bold; font-size: 12pt; margin: 10px 0; }
.warranty-box { background: #fafafa; border-left: 3px solid #888; padding: 10px 14px; margin: 14px 0; font-size: 9.5pt; }
.validity-note { font-size: 9.5pt; color: #666; margin: 10px 0; }
.terms-box { margin-top: 18px; font-size: 9pt; color: #555; background: #fafafa; padding: 12px; border-top: 1px solid #e0e0e0; }
.footer { margin-top: 24px; border-top: 2px solid #1a1a1a; padding-top: 10px; font-size: 8.5pt; color: #777; text-align: center; }
</style>
</head>
<body>

<!-- Section 1: Header -->
<div class="header">
  <div>
    <img src="{{contractor_logo_url}}" class="logo" alt=""><br>
    <strong style="font-size:12pt;">{{contractor_name}}</strong><br>
    <span style="font-size:9.5pt; color:#555;">
      {{contractor_address_line1}}, {{contractor_address_line2}}<br>
      Tel: {{contractor_phone}} | {{contractor_email}}<br>
      VAT No: {{contractor_vat_number}}<br>
      {{contractor_reg_label}}: {{contractor_reg_number}}
    </span>
  </div>
  <div style="text-align:right;">
    <div class="quote-title">QUOTATION</div>
  </div>
</div>

<!-- Section 2: Quote reference + dates -->
<div class="meta-box">
  <table>
    <tr>
      <td><strong>Quote Ref:</strong></td><td>{{quote_number}}</td>
      <td><strong>Date:</strong></td><td>{{quote_date}}</td>
    </tr>
    <tr>
      <td><strong>Valid Until:</strong></td><td>{{expiry_date}}</td>
      <td></td><td></td>
    </tr>
  </table>
</div>

<!-- Section 3: Client details -->
<div class="section-title">Prepared For</div>
<p><strong>{{client_name}}</strong><br>
{{client_address}}<br>
{{client_phone}}</p>

<!-- Section 4: Scope of works -->
<div class="section-title">Scope of Works</div>
<p>{{job_description}}</p>

<!-- Section 5: Line items -->
<div class="section-title">Itemised Quotation</div>
<table class="items">
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:right;">Qty</th>
      <th>Unit</th>
      <th style="text-align:right;">Unit Rate (€)</th>
      <th style="text-align:right;">Amount (€)</th>
    </tr>
  </thead>
  <tbody>
    {{#line_items}}
    <tr{{#is_provisional}} class="provisional"{{/is_provisional}}>
      <td>{{description}}{{#is_provisional}} *{{/is_provisional}}</td>
      <td class="num">{{quantity}}</td>
      <td>{{unit}}</td>
      <td class="num">{{unit_rate}}</td>
      <td class="num">{{amount}}</td>
    </tr>
    {{/line_items}}
    {{#contingency_amount}}
    <tr>
      <td><em>Contingency ({{contingency_percent}}%)</em></td>
      <td></td><td></td><td></td>
      <td class="num">{{contingency_amount}}</td>
    </tr>
    {{/contingency_amount}}
  </tbody>
</table>

<!-- Provisional sums note -->
{{#has_provisional}}
<p style="font-size:9pt; color:#666; margin-top:6px;">* Items marked with an asterisk are provisional sums — estimates subject to confirmation on site. Final cost may vary.</p>
{{/has_provisional}}

<!-- Section 6: Pricing summary -->
<div class="totals-block">
  <table>
    <tr><td>Subtotal (ex. VAT)</td><td class="num">€{{subtotal_ex_vat}}</td></tr>
    <tr><td>VAT @ {{vat_rate}}%</td><td class="num">€{{vat_amount}}</td></tr>
    <tr class="total-row"><td>Total (inc. VAT)</td><td class="num">€{{total_inc_vat}}</td></tr>
    {{#seai_grant}}
    <tr class="grant-row"><td>SEAI Grant Deduction</td><td class="num">(€{{seai_grant}})</td></tr>
    <tr class="main-total"><td>Net Cost to You</td><td class="num">€{{net_after_grant}}</td></tr>
    {{/seai_grant}}
    {{^seai_grant}}
    <tr class="main-total"><td>TOTAL</td><td class="num">€{{total_inc_vat}}</td></tr>
    {{/seai_grant}}
  </table>
</div>

<!-- Section 8: Payment schedule -->
<div class="deposit-box">
  <h3>Payment Schedule</h3>
  <p><strong>Deposit ({{deposit_percent}}% on acceptance):</strong> €{{deposit_amount}}</p>
  {{#stage_payments}}
  <p><strong>{{stage_label}}:</strong> €{{stage_amount}}</p>
  {{/stage_payments}}
  <p><strong>Balance:</strong> {{payment_terms}}</p>
</div>

<!-- Section 9: Exclusions -->
{{#has_exclusions}}
<div class="section-title">Exclusions</div>
<ul class="excl-list">
  {{#exclusions_list}}
  <li>{{.}}</li>
  {{/exclusions_list}}
</ul>
{{/has_exclusions}}

<!-- Section 10: Assumptions -->
{{#has_assumptions}}
<div class="section-title">Assumptions</div>
<ul class="assump-list">
  {{#assumptions_list}}
  <li>{{.}}</li>
  {{/assumptions_list}}
</ul>
{{/has_assumptions}}

<!-- Section 11: Provisional sums (summary) -->
{{#has_provisional}}
<div class="section-title">Provisional Sums</div>
<p style="font-size:9.5pt; color:#555;">The following items have been priced as provisional allowances and are subject to variation on site. Any variation will be agreed in writing before work commences.</p>
{{/has_provisional}}

<!-- Section 12: Warranty -->
<div class="section-title">Workmanship Warranty</div>
<div class="warranty-box">{{contractor_name}} provides a {{warranty_months}}-month workmanship guarantee on all works included in this quotation. This warranty does not apply to materials supplied by the client or damage caused by third parties.</div>

<!-- Section 13: Price validity -->
<div class="validity-note">This quotation is valid until <strong>{{expiry_date}}</strong>. Prices may be subject to change after this date due to material cost variations.</div>

<!-- Section 14: Cancellation terms -->
<div class="section-title">Cancellation</div>
<p style="font-size:9.5pt;">{{cancellation_terms}}</p>

<!-- Section 15: Acceptance -->
<div class="acceptance-box">
  <h3>Accept This Quotation</h3>
  <p>To formally accept this quotation and proceed with the works, please click below or sign and return this document.</p>
  <a class="acceptance-link" href="{{acceptance_link}}">Accept Quotation — {{quote_number}}</a>
  <p style="font-size:9pt; color:#555; margin-top:8px;">Acceptance constitutes agreement to the scope of works, pricing, and terms outlined in this document. A deposit of €{{deposit_amount}} will be due upon acceptance.</p>
</div>

<!-- Section 16: Terms & conditions -->
<div class="terms-box">
  <strong>Terms & Conditions:</strong> Payment is due as per the schedule above. Title to all materials supplied remains with {{contractor_name}} until full payment is received. Any variation to the agreed scope of works will be quoted and agreed in writing before execution. Disputes should be raised within 7 days of the relevant milestone. This quotation is issued by {{contractor_name}}, VAT registered in Ireland under No. {{contractor_vat_number}}.
</div>

<div class="footer">
  {{contractor_name}} | VAT Reg: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}<br>
  This quotation is not a contract. A contract is formed upon written acceptance and receipt of deposit.
</div>

</body>
</html>
```

- [ ] **Step 2: Map all merge fields to Notion sources**

| Field | Source |
|---|---|
| `contractor_*` | Client Mapping |
| `quote_number` | Quotes DB — Quote Number |
| `quote_date` | Quotes DB — Created time |
| `expiry_date` | Quotes DB — Expiry Date (formula) |
| `client_name`, `client_address`, `client_phone` | Customers DB (via relation) |
| `job_description` | Quotes DB — Job Description |
| `line_items[]` | Quotes DB — Line Items JSON (parsed in n8n) |
| `contingency_percent`, `contingency_amount` | Quotes DB |
| `subtotal_ex_vat` | Quotes DB — Subtotal ex-VAT (formula) |
| `vat_rate`, `vat_amount` | Quotes DB |
| `total_inc_vat` | Quotes DB — Total inc VAT (formula) |
| `seai_grant`, `net_after_grant` | Quotes DB — SEAI Grant Deduction |
| `deposit_percent`, `deposit_amount` | Quotes DB |
| `stage_payments[]` | Quotes DB — Stage Payments JSON (parsed) |
| `payment_terms` | Quotes DB — Payment Terms |
| `exclusions_list[]` | Quotes DB — Exclusions (split by newline) |
| `assumptions_list[]` | Quotes DB — Assumptions (split by newline) |
| `warranty_months` | Quotes DB |
| `cancellation_terms` | Quotes DB |
| `acceptance_link` | Generated: `https://intrigue8.ie/accept/{{ acceptance_token }}` |

- [ ] **Step 3: Commit template**

```bash
git add n8n/templates/quote-template.html
git commit -m "feat: quote PDF HTML template — 16 sections, all merge fields documented"
```

---

## Task 4: quote_request Intent Handler

**In n8n:** Create a new workflow branch `quote-request-handler`.

- [ ] **Step 1: Write test pinned data**

Use Test 1 (tiler) from `docs/N8N_PINNED_TEST_DATA_ADDON1.md`:
```json
{
  "text": "I need to quote Mrs Murphy on Shantalla for bathroom tiling — floor and walls...",
  "callerPhone": "+353851234567",
  "callSid": "CA-QUOTE-001"
}
```

Expected Notion state after full run:
- Quotes DB: new record with Quote Number QUO-001, Status=Draft, all line items in Line Items JSON, Cost Subtotal=1883.00
- PDF URL populated
- Status updated to Sent (after delivery)

- [ ] **Step 2: Build the handler nodes**

Node 1 — `Fetch: Customer from Notion`
```
Query Customers DB by customer_name match (fuzzy — allow for phonetic variants).
If not found: create new Customer record with name + address, then continue.
```

Node 2 — `Fetch: Client Mapping`
```
Query Client Mapping by callerPhone.
Returns: contractor profile + IBAN + BIC + margin + Stripe Account ID.
```

Node 3 — `Compute: Quote Number`
```
Type: Code
Query Quotes DB — count existing records. QuoteNumber = "QUO-" + String(count + 1).padStart(3, '0').
```

Node 4 — `Compute: Cost Subtotal from Line Items`
```
Type: Code
const items = JSON.parse($json.intent.line_items_json || '[]');
const costSubtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
const contingency = costSubtotal * ($json.intent.contingency_percent || 0) / 100;
return [{ json: { costSubtotal, contingency, totalCost: costSubtotal + contingency } }];
```

Node 5 — `Generate: Acceptance Token`
```
Type: Code
const crypto = require('crypto');
const token = crypto.randomUUID(); // opaque, not guessable
return [{ json: { acceptanceToken: token } }];
```

Node 6 — `Create: Notion Quote Record`
```
HTTP Request POST to Notion create page in Quotes DB.
Properties to set:
  Quote Number: QUO-NNN
  Customer: relation to customer page ID
  Job Description: $json.intent.job_description
  Line Items JSON: JSON.stringify($json.intent.line_items)
  Cost Subtotal: $json.costSubtotal
  Margin %: $json.clientMapping.defaultMargin (from Client Mapping)
  VAT Rate: $json.intent.vat_rate
  Contingency %: $json.intent.contingency_percent || 0
  Deposit %: $json.intent.deposit_percent || 50
  Payment Terms: $json.intent.payment_terms || "Balance within 14 days of completion"
  Exclusions: $json.intent.exclusions?.join('\n') || ""
  Assumptions: $json.intent.assumptions?.join('\n') || ""
  Warranty Months: $json.intent.warranty_months || 12
  Price Validity Days: $json.intent.price_validity_days || 14
  Cancellation Terms: $json.intent.cancellation_terms || "Deposit non-refundable if cancelled within 48 hours of agreed start date"
  SEAI Grant Deduction: $json.intent.seai_grant_deduction || 0
  Contractor VAT No: $json.clientMapping.vatNumber
  Contractor Reg No: $json.clientMapping.regNumber
  Acceptance Token: $json.acceptanceToken
  Missing Items Flagged: $json.intent.missing_items_flagged?.join(', ') || ""
  Status: Draft
```

Node 7 — `Build: Rendered Quote HTML`
```
Type: Code
Render quote-template.html with all merge fields.
Parse Line Items JSON for the line_items array (render each row).
Parse exclusions, assumptions (split by '\n' → array).
Compute acceptance_link: `https://intrigue8.ie/accept/${$json.acceptanceToken}`
```

Node 8 — `Call: PDF Generation Sub-workflow`
```
Execute sub-wf-pdf-invoice (reused from Add-on 2)
Input: { template_html: rendered_html, filename: `QUO-${quoteNumber}-${customerName}.pdf` }
```

Node 9 — `Update: Notion Quote — PDF URL`
```
PATCH Quote page: PDF URL = $json.pdf_url
```

Node 10 — `Build: Missing Items Confirmation`
```
Type: Code
const missing = $json.intent.missing_items_flagged || [];
const missingText = missing.length > 0
  ? `Missing from this quote: ${missing.join(', ')}. Reply YES to send, or add them now.`
  : 'Reply YES to send this quote.';

const itemsSummary = $json.intent.line_items.map(i => `${i.description}: €${i.amount.toFixed(2)}`).join(', ');
const msg = `Quote for ${$json.intent.customer_name}: ${itemsSummary}. Total before margin: €${$json.costSubtotal.toFixed(2)}. ${missingText}`;
return [{ json: { confirmationMsg: msg, requiresYesConfirmation: true } }];
```

Node 11 — `Send: Confirmation SMS to Contractor`
```
Twilio SMS: $json.confirmationMsg
Wait for YES reply before sending to client.
```

**Note:** The YES/send flow requires a separate webhook that receives the contractor's reply. This is a two-turn interaction:
1. System asks: "Reply YES to send"
2. Contractor replies: "YES"
3. n8n receives the reply via the existing WhatsApp webhook, routes to a `quote_confirm` intent handler

For MVP simplicity: implement `quote_confirm` as a special intent (contractor reply "YES") that looks up the most recent Draft quote and triggers delivery.

Node 12 — `Update: Notion Quote Status = Sent` (called from quote_confirm handler)

Node 13 — `Call: Quote Delivery Sub-workflow`

- [ ] **Step 3: Add quote_confirm intent to Switch node and prompt**

Add to v5 prompt:
```
quote_confirm: Contractor confirms they want to send the most recent Draft quote.
Signals: "yes", "send it", "go ahead", "send the quote"
Context: Only classified as quote_confirm if there is a Draft quote in the last 30 minutes.
Fields: (none — look up most recent Draft quote for this contractor)
```

- [ ] **Step 4: Test quote creation flow**

Pin tiler test data. Run workflow. Verify:
- Notion Quotes DB: new QUO-001 record with all fields populated
- PDF URL set
- Contractor receives confirmation SMS with summary + "Reply YES to send"

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/quote-request-handler.json
git commit -m "feat: quote_request intent handler — Notion create, PDF generation, contractor confirmation"
```

---

## Task 5: Quote Delivery Sub-Workflow

**In n8n:** Create sub-workflow `sub-wf-quote-delivery`.

- [ ] **Step 1: Write expected input/output**

Input:
```json
{
  "client_email": "murphy@example.com",
  "client_phone": "+353851234567",
  "contractor_phone": "+353851234567",
  "pdf_url": "https://pdf.co/download/QUO-001.pdf",
  "pdf_base64": "base64string...",
  "quote_number": "QUO-001",
  "total_inc_vat": "1,883.00",
  "client_name": "Mrs Murphy",
  "contractor_name": "Joe Brennan Plumbing",
  "expiry_date": "2026-05-15"
}
```

- [ ] **Step 2: Build nodes**

Mode A (email to client — if client_email is on file):
```
SendGrid email:
Subject: "Quotation QUO-001 from {{ contractor_name }}"
Body (HTML): "Dear {{ client_name }}, please find your quotation attached. Click the acceptance link in the PDF to proceed. This quote is valid until {{ expiry_date }}. Thank you, {{ contractor_name }}"
Attachment: PDF (base64)
```

Mode B (WhatsApp to contractor for forwarding — if no client email):
```
Twilio WhatsApp to contractor:
"Here's the quote for {{ client_name }} (QUO-001 — €{{ total_inc_vat }}). Forward to client when ready:
PDF: {{ pdf_url }}
They can accept by clicking the link in the PDF."
```

- [ ] **Step 3: Update Notion on delivery**

After sending:
- PATCH Quotes: Status=Sent, Sent Date=today
- Confirm to contractor: "QUO-001 sent to {{ client_name }} — €{{ total }} — valid until {{ expiry_date }}."

- [ ] **Step 4: Test and commit**

```bash
git add n8n/workflows/sub-wf-quote-delivery.json
git commit -m "feat: quote delivery sub-workflow — email primary, WhatsApp contractor fallback"
```

---

## Task 6: Acceptance Link Webhook + Job Creation

**In n8n:** Create standalone webhook workflow `acceptance-webhook`.

- [ ] **Step 1: Write the acceptance flow**

Client taps `https://intrigue8.ie/accept/{{ acceptance_token }}`:
1. n8n webhook receives GET request with token
2. Lookup Quotes DB by Acceptance Token
3. If not found or already Accepted: return "Quote not found or already accepted."
4. If Expired (Expiry Date < today): return "This quotation has expired. Please contact {{ contractor_name }}."
5. If valid Draft/Sent: mark Accepted, create Job, notify contractor

- [ ] **Step 2: Build the webhook workflow**

Node 1 — `Trigger: Webhook GET`
```
Path: /accept/:token
Method: GET
Response: After processing (not immediately)
```

Node 2 — `Query: Notion — Quote by Token`
```
Query Quotes DB where Acceptance Token = $json.params.token
If 0 results: return 404 HTML page "Quote not found."
```

Node 3 — `Check: Quote Status`
```
IF Status = Accepted: return HTML "This quote has already been accepted. Thank you."
IF Expiry Date < today: return HTML "This quotation expired on {{ date }}. Contact {{ contractor_name }}."
ELSE: proceed
```

Node 4 — `Update: Notion Quote — Accepted`
```
PATCH Quote: Status=Accepted, Accepted Date=today
```

Node 5 — `Create: Notion Job from Quote`
```
POST to Jobs DB:
  Job Code: auto-generated (customer initials + address initials + seq number)
  Customer: relation from Quote.Customer
  Description: $json.quote.jobDescription
  Status: Active
  Labour Rate: from Client Mapping
  Profit Margin: from Client Mapping
  Start Date: today
  Source Quote: relation to accepted Quote
```

Node 6 — `Update: Notion Quote — Converted Job`
```
PATCH Quote: Converted Job = relation to new Job page ID
```

Node 7 — `Notify: Contractor WhatsApp`
```
"{{ client_name }} accepted QUO-{{ number }}. Job {{ job_code }} created — €{{ total_inc_vat }}. Deposit of €{{ deposit_amount }} is due."
```

Node 8 — `Return: Acceptance Confirmation Page`
```
Return HTML page:
"<html><body style='font-family:Arial;text-align:center;padding:60px'>
<h2>✓ Quotation Accepted</h2>
<p>Thank you, {{ client_name }}. Your quotation QUO-{{ number }} from {{ contractor_name }} has been accepted.</p>
<p>A deposit of €{{ deposit_amount }} is due. You will receive payment details shortly.</p>
</body></html>"
```

- [ ] **Step 3: Deploy the acceptance webhook URL**

The webhook must be accessible from the public internet so clients can tap the link in the PDF. n8n Cloud workflows have public webhook URLs by default. Copy the production webhook URL. Update the quote HTML template `acceptance_link` to use this URL.

Store in n8n variable: `ACCEPTANCE_WEBHOOK_URL = https://{{ n8n_instance }}/webhook/accept`

- [ ] **Step 4: Test acceptance flow**

1. Create test quote: QUO-TEST-001, Status=Sent, Acceptance Token=test-token-abc123
2. Make GET request to: `{{ ACCEPTANCE_WEBHOOK_URL }}/test-token-abc123`
3. Verify:
   - Notion Quote: Status=Accepted, Accepted Date=today
   - Notion Jobs DB: new Job created with relation to Quote
   - Contractor receives WhatsApp notification
   - Response HTML shows confirmation page

- [ ] **Step 5: Test expired quote**

Set Expiry Date to yesterday. Tap acceptance link. Verify "expired" response page, no Notion update.

- [ ] **Step 6: Test double-tap (idempotency)**

Accept a quote, then tap the same link again. Verify "already accepted" response page, no second Job created.

- [ ] **Step 7: Export and commit**

```bash
git add n8n/workflows/acceptance-webhook.json
git commit -m "feat: acceptance webhook — quote accepted flow, job creation, idempotency, expired quote handling"
```

---

## Task 7: End-to-End Integration Test

- [ ] **Step 1: Full quote-to-job cycle**

1. Voice note: tiler quote for Murphy (Test 1 transcript)
2. Verify contractor receives summary SMS + "Reply YES to send"
3. Reply "YES" from contractor phone
4. Verify:
   - Quote PDF emailed to murphy@example.com
   - Notion Quote: Status=Sent
5. Click acceptance link in email
6. Verify:
   - Notion Quote: Status=Accepted
   - Notion Jobs: new job created with relation to Quote
   - Contractor WhatsApp: "Mrs Murphy accepted QUO-001. Job created."

- [ ] **Step 2: Missing items test**

Use electrician transcript without mentioning RECI cert. Verify:
- missing_items_flagged: ["cert_fee"] in Claude output
- Confirmation SMS includes "Missing: cert fee"

- [ ] **Step 3: SEAI grant test (HVAC)**

Use Test 4 transcript. Verify:
- SEAI Grant Deduction field populated in Notion
- PDF shows grant line "SEAI Grant Deduction: (€1,800)"
- Net cost to client is correctly reduced

- [ ] **Step 4: Waste factor accuracy test**

Use Test 1 (10m² tiles). Verify Line Items JSON contains `"quantity": 11.5` (not 10) for floor tiles.

- [ ] **Step 5: Commit final test results**

```bash
git add docs/N8N_PINNED_TEST_DATA_ADDON1.md
git commit -m "docs: Add-on 1 integration test results — quote cycle, waste factors, SEAI grant, acceptance flow"
```

---

*This plan is self-contained and does not depend on Add-ons 2 or 3. However, the quote-to-invoice continuity feature (deposit deducted from invoice balance) requires Add-on 2 to be built — this is noted as a post-integration step in Add-on 2's plan.*
