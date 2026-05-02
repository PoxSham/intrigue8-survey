# Invoice Delivery + Payment Links — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Agent guidance:** Use specialist agents in `.claude/agents/` for domain work — `automation-engineer` for n8n workflows, `backend-developer` for Stripe/PDF.co/SendGrid security, `ai-prompt-engineer` for Claude prompt changes, `solutions-architect` for design decisions, `contrarian` before any major decision. Use other Claude agent types (`Explore`, `general-purpose`, `feature-dev`) and superpowers skills (debugging, TDD) freely wherever they fit. The specialist agents are domain experts, not exclusive controllers.

**Goal:** Extend the existing `invoice_trigger` flow to generate a PDF invoice, create a Stripe payment link, deliver to the client (or via contractor), auto-confirm payment via Stripe webhooks, and handle cash/bank transfer payments.

**Architecture:** Three new sub-workflows (PDF generation, Stripe link creation, delivery routing) bolt onto the existing `invoice_trigger` handler. A separate Stripe webhook receiver handles payment confirmation. Cash payment generates a receipt PDF sent to the contractor. All delivery metadata is written back to Notion Invoices database including a `Due Date` that triggers Add-on 3.

**Tech Stack:** n8n · PDF.co API · Stripe Connect API · SendGrid Transactional API · Twilio WhatsApp API · Notion API · Claude API (Haiku)

**Prerequisites:**
- Core voice-to-invoice workflow is built and all 6 test scenarios in `docs/N8N_PINNED_TEST_DATA.md` pass
- Notion databases exist as per `docs/NOTION_DATABASE_IDS.md`
- Existing n8n credentials: Notion, Twilio, Claude (Anthropic), OpenAI Whisper
- New accounts required before starting: PDF.co, Stripe (test mode), SendGrid

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `n8n/templates/invoice-template.html` | Create | PDF.co HTML template for client invoice |
| `n8n/templates/cash-receipt-template.html` | Create | PDF.co HTML template for cash receipt |
| `prompts/system-prompt-v3.md` | Create | Updated Claude prompt adding invoice_resend, delivery_mode, payment_method |
| `docs/N8N_PINNED_TEST_DATA_ADDON2.md` | Create | Test data for all new Add-on 2 scenarios |
| Invoices DB (Notion) | Modify | Add 10 new fields |
| Customers DB (Notion) | Modify | Add Phone + Email fields |
| Client Mapping DB (Notion) | Modify | Add IBAN, BIC, Stripe Account ID |
| n8n: sub-wf-pdf-invoice | Create | PDF generation sub-workflow |
| n8n: sub-wf-stripe-link | Create | Stripe payment link sub-workflow |
| n8n: sub-wf-delivery-routing | Create | Mode A/C delivery routing sub-workflow |
| n8n: invoice-trigger-handler | Modify | Extend existing handler |
| n8n: stripe-webhook-receiver | Create | New standalone webhook workflow |
| n8n: payment-received-handler | Modify | Add payment_method handling + cash receipt |
| n8n: invoice-resend-handler | Create | New intent handler |

---

## Task 1: Notion Schema Additions

**Files:** Notion databases (UI-based changes — no code files)

- [ ] **Step 1: Add fields to Invoices database**

Open Notion → Invoices database → Add the following properties:

| Property name | Type | Notes |
|---|---|---|
| `PDF URL` | URL | Generated invoice PDF link |
| `Stripe Payment Link` | URL | Per-invoice Stripe link (balance due only) |
| `Stripe Payment ID` | Text | For webhook idempotency |
| `Delivery Mode` | Select | Options: `Direct`, `Via Contractor` |
| `Sent To` | Text | Client email or phone used |
| `Sent Date` | Date | When PDF + link dispatched |
| `Due Date` | Date | Set on send: Sent Date + payment terms days |
| `Paid Date` | Date | Set by Stripe webhook or manual log |
| `Payment Method` | Select | Options: `Cash`, `Stripe`, `Bank Transfer`, `Cheque` |
| `Cash Receipt Sent` | Checkbox | Default: unchecked |

- [ ] **Step 2: Add fields to Customers database**

| Property name | Type | Notes |
|---|---|---|
| `Phone` | Text | E.164 format e.g. +353851234567 |
| `Email` | Text | Client email for direct delivery |

For existing customer records: manually enter phone/email for the test contractor (Murphy — +353851234567, murphy@example.com).

- [ ] **Step 3: Add fields to Client Mapping database**

| Property name | Type | Notes |
|---|---|---|
| `IBAN` | Text | e.g. IE29AIBK93115212345678 |
| `BIC` | Text | e.g. AIBKIE2D |
| `Stripe Account ID` | Text | Stripe Connect account ID, e.g. acct_1234AbcDef |

For the test contractor record (+353851234567): enter a Stripe test mode account ID from Stripe dashboard.

- [ ] **Step 4: Verify schema in Notion**

Open each database in full-page view. Confirm all new properties appear in the property list and are the correct type. Sort the Invoices database by `Due Date` to confirm the date field is functional.

- [ ] **Step 5: Commit schema documentation**

```bash
git add docs/NOTION_DATABASE_IDS.md
git commit -m "docs: update Notion schema — Add-on 2 field additions to Invoices, Customers, Client Mapping"
```

---

## Task 2: Claude System Prompt v3 — New Intents

**Files:**
- Create: `prompts/system-prompt-v3.md`

The current prompt (v2, in `docs/CLAUDE_PROMPT_V2.md`) handles: `job_setup`, `cost_log`, `labour_log`, `invoice_trigger`, `payment_received`, `job_note`, `job_pause`, `unknown`.

Changes in v3:
1. Add `invoice_resend` intent
2. Add `delivery_mode` field to `invoice_trigger`
3. Add `payment_method` field to `payment_received`

- [ ] **Step 1: Write the test cases that must pass before prompt change**

Create `docs/N8N_PINNED_TEST_DATA_ADDON2.md` with these test transcripts and expected JSON outputs:

**Test A — invoice_resend:**
```
Transcript: "Can you send out Murphy's invoice again? She said she didn't get it."
Expected JSON:
{
  "type": "invoice_resend",
  "confidence": 0.92,
  "customer_name": "Murphy",
  "address_hint": null,
  "invoice_number": null
}
```

**Test B — invoice_trigger with delivery_mode=via_contractor:**
```
Transcript: "That's the Brennan job done. Invoice Joe Brennan — send it to me, I'll forward it on."
Expected JSON:
{
  "type": "invoice_trigger",
  "confidence": 0.95,
  "customer_name": "Brennan",
  "address_hint": null,
  "vat_exempt": false,
  "delivery_mode": "via_contractor",
  "notes": null
}
```

**Test C — payment_received with payment_method:**
```
Transcript: "Murphy paid cash for the Shantalla job today — two thousand five hundred euro."
Expected JSON:
{
  "type": "payment_received",
  "confidence": 0.94,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "amount": 2500.00,
  "date": "2026-05-01",
  "payment_method": "cash",
  "notes": null
}
```

**Test D — payment_received bank transfer:**
```
Transcript: "Lydon paid by bank transfer yesterday — four grand."
Expected JSON:
{
  "type": "payment_received",
  "confidence": 0.93,
  "customer_name": "Lydon",
  "address_hint": null,
  "amount": 4000.00,
  "date": "2026-04-30",
  "payment_method": "bank_transfer",
  "notes": null
}
```

Run these against the existing v2 prompt. Confirm they all fail (wrong/missing fields). Record results in the test doc.

- [ ] **Step 2: Write v3 system prompt additions**

Copy `docs/CLAUDE_PROMPT_V2.md` to `prompts/system-prompt-v3.md`. Add the following blocks to the intent taxonomy section:

**New intent: `invoice_resend`**
```
invoice_resend: The contractor wants to re-send an existing invoice PDF and payment link.
Signals: "send it again", "resend", "she didn't get it", "send Murphy's invoice again"
Fields:
  customer_name: string — customer surname or identifier
  address_hint: string | null — partial address if given
  invoice_number: string | null — e.g. "INV-007" if explicitly stated
Confirmation: "I'll resend INV-[number] to [client name] — they'll have it shortly."
  If invoice_number is null: "Resending the most recent open invoice for [customer]."
```

**Updated intent: `invoice_trigger` — add delivery_mode**
```
invoice_trigger: add field:
  delivery_mode: "direct" | "via_contractor"
  Default: "direct"
  Signal words for "via_contractor": "send it to me", "I'll send it on", "I'll forward it", "give it to me"
  If contractor says any of these, set delivery_mode = "via_contractor"
```

**Updated intent: `payment_received` — add payment_method**
```
payment_received: add field:
  payment_method: "cash" | "stripe" | "bank_transfer" | "cheque"
  Rules:
    - If contractor is logging it manually by voice, default to "cash" unless they specify otherwise
    - "by transfer", "bank transfer", "EFT", "SEPA" → "bank_transfer"
    - "by cheque", "cheque" → "cheque"
    - Never use "stripe" for manually-logged payments — Stripe payments arrive via webhook
```

- [ ] **Step 3: Run test cases against v3 prompt**

Send each test transcript from Step 1 to the Claude API (claude-haiku-4-5) with the v3 system prompt. Use the Anthropic API directly or via n8n test trigger.

Expected: all 4 tests produce valid JSON matching expected output. Confidence ≥ 0.90 on all.

- [ ] **Step 4: Confirm delimiters are intact**

Verify v3 prompt still contains the `###CONFIRMATION###` and `###END###` delimiter instructions. Run Scenario 4 (invoice_trigger) from `docs/N8N_PINNED_TEST_DATA.md` against v3 prompt — confirm existing intents still extract correctly.

- [ ] **Step 5: Commit**

```bash
git add prompts/system-prompt-v3.md docs/N8N_PINNED_TEST_DATA_ADDON2.md
git commit -m "feat: system prompt v3 — add invoice_resend, delivery_mode, payment_method intents"
```

---

## Task 3: Invoice PDF HTML Template

**Files:**
- Create: `n8n/templates/invoice-template.html`

- [ ] **Step 1: Create the template file**

Create `n8n/templates/invoice-template.html` with these exact merge fields (PDF.co uses `{{fieldname}}` syntax, arrays use `{{#items}}...{{/items}}`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #2c2c2c; padding: 36px; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; }
.contractor-info p { line-height: 1.6; }
.logo { max-height: 70px; max-width: 200px; }
.invoice-title { font-size: 28pt; font-weight: bold; color: #1a1a1a; text-align: right; }
.invoice-meta { background: #f7f7f7; padding: 14px 18px; margin: 20px 0; border-left: 4px solid #1a1a1a; }
.invoice-meta table { width: 100%; }
.invoice-meta td { padding: 3px 8px; }
.section-title { font-size: 11pt; font-weight: bold; color: #1a1a1a; margin: 20px 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px; }
table.items { width: 100%; border-collapse: collapse; margin: 10px 0; }
table.items th { background: #1a1a1a; color: #fff; padding: 8px 10px; text-align: left; font-size: 9.5pt; }
table.items td { padding: 7px 10px; border-bottom: 1px solid #e8e8e8; }
table.items .num { text-align: right; }
.totals-block { width: 300px; margin-left: auto; margin-top: 16px; }
.totals-block table { width: 100%; border-collapse: collapse; }
.totals-block td { padding: 5px 8px; }
.totals-block .label { color: #555; }
.totals-block .amount { text-align: right; }
.total-row td { border-top: 1px solid #ccc; font-weight: bold; }
.balance-row td { border-top: 2px solid #1a1a1a; font-size: 13pt; font-weight: bold; color: #1a1a1a; }
.payment-box { background: #edf7ed; border: 1px solid #b5d9b5; border-radius: 4px; padding: 16px 20px; margin: 22px 0; }
.payment-box h3 { margin-bottom: 10px; color: #1a6b1a; font-size: 11pt; }
.payment-box p { margin: 5px 0; line-height: 1.5; }
.payment-link { color: #1a6b1a; font-weight: bold; word-break: break-all; }
.terms { background: #fafafa; border-top: 1px solid #e0e0e0; padding: 14px 18px; margin-top: 20px; font-size: 9.5pt; color: #555; line-height: 1.5; }
.footer { margin-top: 28px; border-top: 2px solid #1a1a1a; padding-top: 12px; font-size: 8.5pt; color: #777; text-align: center; }
.thank-you { text-align: center; margin: 18px 0; font-size: 11pt; color: #555; }
</style>
</head>
<body>

<!-- Section 1: Header -->
<div class="header">
  <div class="contractor-info">
    <img src="{{contractor_logo_url}}" class="logo" alt=""><br>
    <strong style="font-size:12pt;">{{contractor_name}}</strong><br>
    <p>{{contractor_address_line1}}<br>
    {{contractor_address_line2}}<br>
    Tel: {{contractor_phone}}<br>
    Email: {{contractor_email}}<br>
    VAT No: {{contractor_vat_number}}<br>
    {{contractor_reg_label}}: {{contractor_reg_number}}</p>
  </div>
  <div style="text-align:right;">
    <div class="invoice-title">INVOICE</div>
  </div>
</div>

<!-- Section 2: Invoice reference + dates -->
<div class="invoice-meta">
  <table>
    <tr>
      <td><strong>Invoice Number:</strong></td><td>{{invoice_number}}</td>
      <td><strong>Invoice Date:</strong></td><td>{{invoice_date}}</td>
    </tr>
    <tr>
      <td><strong>Due Date:</strong></td><td>{{due_date}}</td>
      <td><strong>Job Reference:</strong></td><td>{{job_code}}</td>
    </tr>
  </table>
</div>

<!-- Section 3: Client details -->
<div class="section-title">Bill To</div>
<p><strong>{{client_name}}</strong><br>
{{client_address}}<br>
{{client_phone}}<br>
{{client_email}}</p>

<!-- Section 4: Job description -->
<div class="section-title">Works Completed</div>
<p>{{job_description}}</p>

<!-- Section 5: Line items -->
<div class="section-title">Itemised Charges</div>
<table class="items">
  <thead>
    <tr>
      <th>Description</th>
      <th style="text-align:right;">Qty</th>
      <th>Unit</th>
      <th style="text-align:right;">Rate (€)</th>
      <th style="text-align:right;">Amount (€)</th>
    </tr>
  </thead>
  <tbody>
    {{#line_items}}
    <tr>
      <td>{{description}}</td>
      <td class="num">{{quantity}}</td>
      <td>{{unit}}</td>
      <td class="num">{{unit_rate}}</td>
      <td class="num">{{amount}}</td>
    </tr>
    {{/line_items}}
  </tbody>
</table>

<!-- Section 6: Pricing summary -->
<div class="totals-block">
  <table>
    <tr><td class="label">Subtotal (ex. VAT)</td><td class="amount">€{{subtotal_ex_vat}}</td></tr>
    <tr><td class="label">VAT @ {{vat_rate}}%</td><td class="amount">€{{vat_amount}}</td></tr>
    <tr class="total-row"><td>Invoice Total</td><td class="amount">€{{total_inc_vat}}</td></tr>
    {{#deposit_paid}}
    <tr><td class="label">Deposit paid</td><td class="amount">(€{{deposit_paid}})</td></tr>
    {{/deposit_paid}}
    <tr class="balance-row"><td>BALANCE DUE</td><td class="amount">€{{balance_due}}</td></tr>
  </table>
</div>

<!-- Section 9: Payment options -->
<div class="payment-box">
  <h3>Payment Options</h3>
  <p>💳 <strong>Pay securely online:</strong><br>
  <a class="payment-link" href="{{stripe_link}}">{{stripe_link}}</a></p>
  <p>🏦 <strong>Bank Transfer:</strong><br>
  IBAN: {{iban}}<br>
  BIC: {{bic}}<br>
  Payment Reference: {{invoice_number}}</p>
  <p>💵 <strong>Cash:</strong> Please contact us to arrange.</p>
</div>

<!-- Section 10: Payment terms -->
<div class="terms">
  <strong>Payment Terms:</strong> Payment is due by {{due_date}}. Title to all materials supplied remains with {{contractor_name}} until full payment is received. Disputes should be raised in writing within 7 days of invoice date.
</div>

<!-- Section 11: Thank you -->
<div class="thank-you">Thank you for choosing {{contractor_name}}. We look forward to working with you again.</div>

<div class="footer">
  {{contractor_name}} | VAT Reg No: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}<br>
  This invoice is issued in accordance with Irish Revenue requirements for VAT-registered traders.
</div>

</body>
</html>
```

- [ ] **Step 2: Identify all merge fields and map to Notion sources**

| Template field | Source | Notion field / DB |
|---|---|---|
| `contractor_logo_url` | Client Mapping | Logo URL |
| `contractor_name` | Client Mapping | Client Name |
| `contractor_address_line1/2` | Client Mapping | Address |
| `contractor_phone` | Client Mapping | Phone |
| `contractor_email` | Client Mapping | Email |
| `contractor_vat_number` | Client Mapping | VAT Number |
| `contractor_reg_label` | Client Mapping | Reg Type (RECI/RGII/SEAI) |
| `contractor_reg_number` | Client Mapping | Reg Number |
| `invoice_number` | Invoices | Invoice Number |
| `invoice_date` | Invoices | Created time |
| `due_date` | Invoices | Due Date (computed on send) |
| `job_code` | Jobs | Job Code (via relation) |
| `client_name` | Customers | Customer Name (via relation) |
| `client_address` | Customers | Address |
| `client_phone` | Customers | Phone |
| `client_email` | Customers | Email |
| `job_description` | Jobs | Description |
| `line_items[]` | Labour + Costs | Rolled up from child records |
| `subtotal_ex_vat` | Invoices formula | Subtotal |
| `vat_rate` | Invoices | VAT rate |
| `vat_amount` | Invoices formula | VAT Amount |
| `total_inc_vat` | Invoices formula | Invoice Total |
| `deposit_paid` | Invoices | Amount Already Paid (from linked Quote) |
| `balance_due` | Invoices formula | Balance |
| `stripe_link` | Generated by Stripe sub-workflow | |
| `iban` | Client Mapping | IBAN |
| `bic` | Client Mapping | BIC |

- [ ] **Step 3: Commit the template**

```bash
git add n8n/templates/invoice-template.html
git commit -m "feat: invoice PDF HTML template — all 11 sections, PDF.co merge fields mapped"
```

---

## Task 4: Cash Receipt PDF Template

**Files:**
- Create: `n8n/templates/cash-receipt-template.html`

- [ ] **Step 1: Create the template**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; font-size: 11pt; color: #2c2c2c; padding: 40px; max-width: 500px; margin: auto; }
.header { text-align: center; border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 20px; }
.receipt-title { font-size: 20pt; font-weight: bold; color: #1a1a1a; margin: 8px 0; }
.receipt-ref { font-size: 10pt; color: #666; }
.amount-block { text-align: center; background: #f0f7f0; border: 2px solid #b5d9b5; border-radius: 8px; padding: 20px; margin: 24px 0; }
.amount-label { font-size: 10pt; color: #555; margin-bottom: 6px; }
.amount-value { font-size: 24pt; font-weight: bold; color: #1a6b1a; }
.details table { width: 100%; }
.details td { padding: 6px 4px; border-bottom: 1px solid #eee; }
.details td:first-child { color: #555; width: 45%; }
.footer { margin-top: 30px; font-size: 8.5pt; color: #888; text-align: center; border-top: 1px solid #e0e0e0; padding-top: 12px; }
</style>
</head>
<body>

<div class="header">
  <strong style="font-size:13pt;">{{contractor_name}}</strong><br>
  <span style="font-size:9.5pt; color:#666;">{{contractor_address_line1}}, {{contractor_address_line2}}</span><br>
  <span style="font-size:9.5pt; color:#666;">VAT No: {{contractor_vat_number}}</span>
  <div class="receipt-title">CASH RECEIPT</div>
  <div class="receipt-ref">Ref: {{receipt_number}} | Date: {{receipt_date}}</div>
</div>

<div class="amount-block">
  <div class="amount-label">Amount Received</div>
  <div class="amount-value">€{{amount_received}}</div>
</div>

<div class="details">
  <table>
    <tr><td>Received from:</td><td><strong>{{client_name}}</strong></td></tr>
    <tr><td>For:</td><td>{{job_description}}</td></tr>
    <tr><td>Invoice ref:</td><td>{{invoice_number}}</td></tr>
    <tr><td>Payment method:</td><td>Cash</td></tr>
    <tr><td>Date received:</td><td>{{payment_date}}</td></tr>
    <tr><td>Received by:</td><td>{{contractor_name}}</td></tr>
  </table>
</div>

<p style="margin-top:20px; color:#555; font-size:10pt;">This receipt confirms full payment of the above amount. Please retain for your records.</p>

<div class="footer">
  {{contractor_name}} | Tel: {{contractor_phone}} | VAT No: {{contractor_vat_number}}<br>
  This is your official receipt. No VAT is charged on cash transactions already included in a separate VAT invoice.
</div>

</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add n8n/templates/cash-receipt-template.html
git commit -m "feat: cash receipt PDF HTML template"
```

---

## Task 5: PDF Generation Sub-Workflow

**In n8n:** Create a new sub-workflow named `sub-wf-pdf-invoice`.

- [ ] **Step 1: Write the expected output of this sub-workflow**

Input received from parent workflow:
```json
{
  "template_html": "<full rendered HTML string>",
  "filename": "INV-007-Murphy.pdf"
}
```

Expected output:
```json
{
  "pdf_url": "https://pdf.co/download/abc123/INV-007-Murphy.pdf",
  "pdf_filename": "INV-007-Murphy.pdf"
}
```

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Execute: PDF.co Generate PDF`
```
Type: HTTP Request
Method: POST
URL: https://api.pdf.co/v1/pdf/convert/from/html
Headers:
  x-api-key: {{ $vars.PDFCO_API_KEY }}
  Content-Type: application/json
Body (JSON):
  {
    "html": "{{ $json.template_html }}",
    "name": "{{ $json.filename }}",
    "inline": false,
    "async": false,
    "expiration": 60
  }
On error: Retry × 2 with 3s delay. On final failure: throw error (bubbles to parent).
```

Node 2 — `Extract: Get PDF URL`
```
Type: Set
Set fields:
  pdf_url: {{ $json.url }}
  pdf_filename: {{ $json.name }}
```

Node 3 — `Validate: Check PDF URL exists`
```
Type: IF
Condition: {{ $json.pdf_url }} is not empty
True branch: continue (return to parent)
False branch: throw error "PDF.co returned empty URL"
```

- [ ] **Step 3: Test the sub-workflow**

Manually trigger with this test body:
```json
{
  "template_html": "<html><body><h1>TEST INVOICE</h1><p>INV-TEST-001</p></body></html>",
  "filename": "INV-TEST-001.pdf"
}
```

Expected: `pdf_url` is a valid https URL, clicking it downloads a PDF containing "TEST INVOICE".

- [ ] **Step 4: Export and commit**

In n8n editor → workflow menu → Download → save to `n8n/workflows/sub-wf-pdf-invoice.json`.

```bash
git add n8n/workflows/sub-wf-pdf-invoice.json
git commit -m "feat: PDF generation sub-workflow (PDF.co)"
```

---

## Task 6: Stripe Payment Link Sub-Workflow

**In n8n:** Create a new sub-workflow named `sub-wf-stripe-link`.

- [ ] **Step 1: Write expected input/output**

Input:
```json
{
  "stripe_account_id": "acct_1234AbcDef",
  "invoice_number": "INV-007",
  "balance_due": 2503.00,
  "currency": "eur",
  "description": "Invoice INV-007 — Murphy, Shantalla Road",
  "idempotency_key": "inv-007-stripe-link"
}
```

Expected output:
```json
{
  "stripe_link": "https://buy.stripe.com/test_abc123xyz",
  "stripe_price_id": "price_1234abcd"
}
```

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Execute: Stripe Create Price`
```
Type: HTTP Request
Method: POST
URL: https://api.stripe.com/v1/prices
Headers:
  Authorization: Bearer {{ $vars.STRIPE_SECRET_KEY }}
  Stripe-Account: {{ $json.stripe_account_id }}
  Idempotency-Key: {{ $json.idempotency_key }}-price
Body (form-encoded):
  unit_amount: {{ Math.round($json.balance_due * 100) }}
  currency: {{ $json.currency }}
  product_data[name]: {{ $json.description }}
```

Node 2 — `Execute: Stripe Create Payment Link`
```
Type: HTTP Request
Method: POST
URL: https://api.stripe.com/v1/payment_links
Headers:
  Authorization: Bearer {{ $vars.STRIPE_SECRET_KEY }}
  Stripe-Account: {{ $json.stripe_account_id }}
  Idempotency-Key: {{ $json.idempotency_key }}-link
Body (form-encoded):
  line_items[0][price]: {{ $json.id }}
  line_items[0][quantity]: 1
  metadata[invoice_number]: {{ $input.first().json.invoice_number }}
```

Node 3 — `Extract: Get Link URL`
```
Type: Set
Set fields:
  stripe_link: {{ $json.url }}
  stripe_price_id: {{ $json.line_items.data[0].price.id }}
```

- [ ] **Step 3: Test the sub-workflow**

Use Stripe test mode. Trigger with:
```json
{
  "stripe_account_id": "acct_TEST_ID_FROM_STRIPE_DASHBOARD",
  "invoice_number": "INV-TEST-001",
  "balance_due": 10.00,
  "currency": "eur",
  "description": "Test invoice",
  "idempotency_key": "test-inv-001"
}
```

Expected: `stripe_link` is a valid Stripe payment link URL (https://buy.stripe.com/...). Open in browser — confirm it shows a payment page for €10.00.

- [ ] **Step 4: Test idempotency**

Send the exact same request again (same `idempotency_key`). Verify Stripe returns the same payment link URL, not a new one. Verify no second entry appears in Stripe dashboard.

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/sub-wf-stripe-link.json
git commit -m "feat: Stripe payment link creation sub-workflow"
```

---

## Task 7: Delivery Routing Sub-Workflow (Mode A/C)

**In n8n:** Create a new sub-workflow named `sub-wf-delivery-routing`.

- [ ] **Step 1: Write expected input/output**

Input:
```json
{
  "delivery_mode": "direct",
  "client_phone": "+353851234567",
  "client_email": "murphy@example.com",
  "contractor_phone": "+353851234567",
  "pdf_url": "https://pdf.co/download/abc123/INV-007.pdf",
  "stripe_link": "https://buy.stripe.com/test_abc123xyz",
  "invoice_number": "INV-007",
  "client_name": "Mrs Murphy",
  "balance_due": "2,503.00",
  "due_date": "2026-05-15"
}
```

Expected output:
```json
{
  "delivery_mode_used": "direct",
  "sent_to": "murphy@example.com",
  "delivery_confirmed": true
}
```

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Route: Check Delivery Mode`
```
Type: IF
Condition A: {{ $json.delivery_mode === 'via_contractor' }} → Mode C branch
Condition B: {{ !$json.client_email && !$json.client_phone }} → No contact → Mode C fallback
Default: Mode A branch
```

**Mode A branch (direct to client):**

Node 2a — `Send: Email Invoice to Client (Mode A)`
```
Type: HTTP Request (SendGrid)
Method: POST
URL: https://api.sendgrid.com/v3/mail/send
Headers:
  Authorization: Bearer {{ $vars.SENDGRID_API_KEY }}
Body (JSON):
{
  "personalizations": [{
    "to": [{"email": "{{ $json.client_email }}", "name": "{{ $json.client_name }}"}],
    "subject": "Invoice {{ $json.invoice_number }} from {{ $vars.CONTRACTOR_NAME }}"
  }],
  "from": {"email": "{{ $vars.CONTRACTOR_EMAIL }}", "name": "{{ $vars.CONTRACTOR_NAME }}"},
  "content": [{
    "type": "text/html",
    "value": "<p>Dear {{ $json.client_name }},</p><p>Please find your invoice attached. You can pay securely online here:</p><p><a href='{{ $json.stripe_link }}'>Pay Invoice {{ $json.invoice_number }} — €{{ $json.balance_due }}</a></p><p>Or by bank transfer to: IBAN {{ $vars.CONTRACTOR_IBAN }} / Ref: {{ $json.invoice_number }}</p><p>Due date: {{ $json.due_date }}</p><p>Thank you,<br>{{ $vars.CONTRACTOR_NAME }}</p>"
  }],
  "attachments": [{
    "content": "{{ $json.pdf_base64 }}",
    "type": "application/pdf",
    "filename": "{{ $json.invoice_number }}.pdf",
    "disposition": "attachment"
  }]
}
On error: retry × 1, then fall back to Mode C (Twilio WhatsApp to contractor).
```

Node 3a — `Set: Mode A result`
```
Type: Set
  delivery_mode_used: "direct"
  sent_to: {{ $json.client_email }}
  delivery_confirmed: true
```

**Mode C branch (via contractor):**

Node 2b — `Send: WhatsApp Invoice to Contractor (Mode C)`
```
Type: HTTP Request (Twilio)
Method: POST
URL: https://api.twilio.com/2010-04-01/Accounts/{{ $vars.TWILIO_ACCOUNT_SID }}/Messages.json
Auth: Basic {{ $vars.TWILIO_ACCOUNT_SID }}:{{ $vars.TWILIO_AUTH_TOKEN }}
Body (form-encoded):
  From: whatsapp:{{ $vars.TWILIO_WHATSAPP_NUMBER }}
  To: whatsapp:{{ $json.contractor_phone }}
  Body: Here's {{ $json.client_name }}'s invoice {{ $json.invoice_number }} for €{{ $json.balance_due }}. Forward this to them:\n{{ $json.stripe_link }}\nPDF: {{ $json.pdf_url }}
```

Node 3b — `Set: Mode C result`
```
Type: Set
  delivery_mode_used: "via_contractor"
  sent_to: {{ $json.contractor_phone }}
  delivery_confirmed: true
```

- [ ] **Step 3: Test Mode A**

Trigger with `delivery_mode: "direct"`, valid client email. Verify:
- SendGrid sends the email (check SendGrid activity dashboard)
- Email arrives with PDF attachment
- Stripe link is clickable and shows correct amount

- [ ] **Step 4: Test Mode C**

Trigger with `delivery_mode: "via_contractor"`. Verify:
- WhatsApp message arrives on contractor's phone
- Message contains the Stripe link and PDF URL

- [ ] **Step 5: Test Mode A fallback to Mode C**

Trigger with `delivery_mode: "direct"` but `client_email: ""` and `client_phone: ""`. Verify system routes to Mode C automatically and sends to contractor phone.

- [ ] **Step 6: Export and commit**

```bash
git add n8n/workflows/sub-wf-delivery-routing.json
git commit -m "feat: delivery routing sub-workflow — Mode A direct email, Mode C via contractor WhatsApp"
```

---

## Task 8: Extend invoice_trigger Handler

**In n8n:** Modify the existing `invoice_trigger` branch in the main workflow.

The existing handler creates an Invoice record in Notion with status Draft. Extend it to:
1. Fetch all required data from Notion (job, customer, costs, labour, client mapping)
2. Build the line_items array for the PDF template
3. Render the HTML template with all merge fields
4. Call `sub-wf-pdf-invoice` → get PDF URL
5. Call `sub-wf-stripe-link` → get Stripe payment link
6. Calculate due date (Sent Date + 14 days default, or payment terms from job)
7. Call `sub-wf-delivery-routing` → deliver to client or contractor
8. Update Notion Invoice record with all new fields

- [ ] **Step 1: Write the pinned test data for this extended flow**

Add to `docs/N8N_PINNED_TEST_DATA_ADDON2.md`:

```
Scenario: invoice_trigger with Add-on 2 active
Pinned at: Whisper output node
Input transcript: "That's the Murphy job on Shantalla done now. Invoice her."
Expected flow:
  1. Claude extracts invoice_trigger for Murphy/Shantalla
  2. Job MRP-SHA-01 fetched (Labour: 240.00, Costs: 73.00)
  3. Client Mapping fetched for +353851234567
  4. Customer fetched: murphy@example.com, +353851234567
  5. Invoice total computed: (240+73) * 1.25 = 391.25 (25% margin, VAT exempt)
  6. PDF generated: pdf_url is a valid URL
  7. Stripe link created: balance_due 391.25
  8. Email sent to murphy@example.com (Mode A — email on file)
  9. Notion updated: PDF URL, Stripe Payment Link, Delivery Mode=Direct, Sent To=murphy@example.com, Sent Date=today, Due Date=today+14
  10. Contractor SMS: "Invoice INV-001 sent to Mrs Murphy — €391.25 due by [date]."
```

- [ ] **Step 2: Add nodes after the existing Notion Invoice Create node**

Node A — `Fetch: Job Details from Notion`
```
Type: HTTP Request (Notion API)
Method: POST
URL: https://api.notion.com/v1/databases/9e8612f5e9af499ba4344b92d088bef6/query
Body: filter by Job Code = {{ $json.intent.job_code }} or via Invoice → Job relation
Returns: job description, job code, payment terms days
```

Node B — `Fetch: Customer from Notion`
```
Type: HTTP Request (Notion API)
URL: https://api.notion.com/v1/databases/00167fdd97f446ab874728beff5c33b6/query
Filter: Customer Name matches {{ $json.intent.customer_name }}
Returns: client_name, client_address, client_phone, client_email
```

Node C — `Fetch: Client Mapping from Notion`
```
URL: https://api.notion.com/v1/databases/c812fba7b03d4f56a6c958a3ae31cdb1/query
Filter: Phone = {{ $json.callerPhone }}
Returns: contractor_name, contractor_address, contractor_vat_number, contractor_reg_number, IBAN, BIC, Stripe Account ID, logo_url
```

Node D — `Build: Line Items Array`
```
Type: Code (JavaScript)
Purpose: Combine Labour and Cost rollups into line_items array for PDF template
Input: $json.invoice (with Total Labour, Total Materials, job labour rate)

const lineItems = [];
// Labour line (from invoice rollup + hours data)
if ($json.invoice.totalLabour > 0) {
  lineItems.push({
    description: "Labour",
    quantity: $json.invoice.totalHours || "-",
    unit: "hrs",
    unit_rate: $json.invoice.labourRate || "-",
    amount: $json.invoice.totalLabour.toFixed(2)
  });
}
// Materials (individual cost items if available, else single line)
if ($json.invoice.totalMaterials > 0) {
  lineItems.push({
    description: "Materials",
    quantity: 1,
    unit: "lot",
    unit_rate: $json.invoice.totalMaterials.toFixed(2),
    amount: $json.invoice.totalMaterials.toFixed(2)
  });
}
return [{ json: { line_items: lineItems } }];
```

Node E — `Build: Rendered HTML Template`
```
Type: Code (JavaScript)
Purpose: Replace all {{fieldname}} placeholders in the template HTML with actual values
Read template from $vars.INVOICE_TEMPLATE_HTML (load template at workflow init)
or fetch from a known n8n static URL.

Use a simple string replace function for non-array fields.
For {{#line_items}}...{{/line_items}}: iterate and build rows.
```

Node F — `Call: PDF Generation Sub-workflow`
```
Type: Execute Sub-workflow
Sub-workflow: sub-wf-pdf-invoice
Input: { template_html: $json.rendered_html, filename: `${$json.invoice_number}-${$json.customer_name}.pdf` }
```

Node G — `Call: Stripe Payment Link Sub-workflow`
```
Type: Execute Sub-workflow
Sub-workflow: sub-wf-stripe-link
Input: {
  stripe_account_id: $json.clientMapping.stripeAccountId,
  invoice_number: $json.invoice_number,
  balance_due: $json.invoice.balanceDue,
  currency: "eur",
  description: `Invoice ${$json.invoice_number} — ${$json.customer_name}`,
  idempotency_key: `${$json.invoice_number}-link`
}
```

Node H — `Compute: Due Date`
```
Type: Code
const sentDate = new Date();
const termsDays = $json.job.paymentTermsDays || 14;
const dueDate = new Date(sentDate);
dueDate.setDate(dueDate.getDate() + termsDays);
return [{ json: { sent_date: sentDate.toISOString().split('T')[0], due_date: dueDate.toISOString().split('T')[0] } }];
```

Node I — `Call: Delivery Routing Sub-workflow`
```
Type: Execute Sub-workflow
Sub-workflow: sub-wf-delivery-routing
Input: {
  delivery_mode: $json.intent.delivery_mode || "direct",
  client_phone: $json.customer.phone,
  client_email: $json.customer.email,
  contractor_phone: $json.callerPhone,
  pdf_url: $json.pdf_url,
  stripe_link: $json.stripe_link,
  invoice_number: $json.invoice_number,
  client_name: $json.customer.clientName,
  balance_due: $json.invoice.balanceDue,
  due_date: $json.due_date
}
```

Node J — `Update: Notion Invoice Record`
```
Type: HTTP Request (Notion PATCH)
Method: PATCH
URL: https://api.notion.com/v1/pages/{{ $json.invoice_page_id }}
Body:
{
  "properties": {
    "PDF URL": { "url": "{{ $json.pdf_url }}" },
    "Stripe Payment Link": { "url": "{{ $json.stripe_link }}" },
    "Delivery Mode": { "select": { "name": "{{ $json.delivery_mode_used }}" } },
    "Sent To": { "rich_text": [{ "text": { "content": "{{ $json.sent_to }}" } }] },
    "Sent Date": { "date": { "start": "{{ $json.sent_date }}" } },
    "Due Date": { "date": { "start": "{{ $json.due_date }}" } },
    "Status": { "select": { "name": "Sent" } }
  }
}
```

Node K — `Update: Job Status`
```
PATCH the linked Job page: Status → "Invoiced", End Date → today
(This already exists in core workflow — verify it still fires correctly)
```

Node L — `Confirm: Contractor SMS`
```
Twilio SMS to $json.callerPhone:
"Invoice {{ invoice_number }} sent to {{ client_name }} — €{{ balance_due }} due by {{ due_date }}."
```

- [ ] **Step 3: Run the pinned test — happy path**

Pin Scenario 4 transcript at Whisper node. Run workflow. Verify:
- Notion Invoice record has PDF URL, Stripe Payment Link, Due Date all populated
- Status = Sent
- Email arrives in test inbox (or WhatsApp if Mode C)
- Contractor receives correct SMS confirmation

- [ ] **Step 4: Test Mode C path**

Use transcript: "Invoice Murphy — send it to me, I'll forward it."
Expected: delivery_mode = "via_contractor", WhatsApp sent to contractor, Notion Delivery Mode = "Via Contractor".

- [ ] **Step 5: Test error path — PDF generation fails**

Temporarily set PDFCO_API_KEY to an invalid value. Run workflow.
Expected: workflow retries × 2, then routes to Error Trigger. Intrigue8 is notified. Contractor receives: "Invoice created but couldn't be sent — we're looking into it."

- [ ] **Step 6: Export and commit**

```bash
git add n8n/workflows/invoice-trigger-handler.json
git commit -m "feat: extend invoice_trigger handler — PDF, Stripe link, delivery routing, Notion update"
```

---

## Task 9: Stripe Webhook Receiver

**In n8n:** Create a new standalone workflow with a Webhook trigger.

- [ ] **Step 1: Write expected inputs/outputs**

Input (Stripe `payment_intent.succeeded` or `checkout.session.completed` event):
```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_abc123",
      "amount": 250300,
      "currency": "eur",
      "metadata": { "invoice_number": "INV-007" }
    }
  }
}
```

Expected Notion update:
```
Invoice INV-007: Paid Date = today, Payment Method = Stripe, Status = Paid
```

Expected contractor notification:
```
"Mrs Murphy paid €2,503.00 in full — INV-007 closed."
```

- [ ] **Step 2: Build the webhook receiver workflow**

Node 1 — `Trigger: Stripe Webhook`
```
Type: Webhook
Method: POST
Path: /stripe-payment
Response mode: Immediately (200 OK before processing)
```

Node 2 — `Verify: Stripe Signature`
```
Type: Code (JavaScript)
Purpose: Verify Stripe-Signature header using STRIPE_WEBHOOK_SECRET

const stripe = require('stripe'); // n8n has stripe available via Code node
const payload = $input.first().json.$body_raw; // raw request body
const sig = $input.first().headers['stripe-signature'];
const secret = $vars.STRIPE_WEBHOOK_SECRET;

let event;
try {
  event = stripe.webhooks.constructEvent(payload, sig, secret);
} catch (err) {
  throw new Error('Stripe signature verification failed: ' + err.message);
}
return [{ json: event }];
```

Node 3 — `Route: Event Type`
```
Type: Switch
Branch on: {{ $json.type }}
Case "payment_intent.succeeded": → full payment branch
Case "payment_intent.partially_funded": → partial payment branch
Default: ignore (return 200, no action)
```

Node 4a — `Idempotency: Check Stripe Payment ID`
```
Type: HTTP Request (Notion query)
Query Invoices DB where Stripe Payment ID = {{ $json.data.object.id }}
IF result.length > 0: this event already processed → stop (idempotent)
IF result.length = 0: continue
```

Node 5a — `Fetch: Invoice by invoice_number`
```
Query Invoices DB where Invoice Number = {{ $json.data.object.metadata.invoice_number }}
Returns: invoice_page_id, customer relation, contractor phone, balance_due
```

Node 6a — `Compute: Full or Partial?`
```
Type: IF
paid_amount = $json.data.object.amount / 100
Condition: paid_amount >= $json.invoice.balanceDue
True: full payment → status Paid
False: partial payment → status Part Paid, update Amount Paid
```

Node 7a-full — `Update: Notion Invoice — Paid`
```
PATCH invoice page:
  Status: Paid
  Paid Date: today
  Payment Method: Stripe
  Stripe Payment ID: {{ $json.data.object.id }}
  Amount Paid: {{ paid_amount }}
```

Node 7a-partial — `Update: Notion Invoice — Part Paid`
```
PATCH invoice page:
  Status: Part Paid
  Payment Method: Stripe
  Stripe Payment ID: {{ $json.data.object.id }}
  Amount Paid: {{ paid_amount }}
```

Node 8a-full — `Notify: Contractor WhatsApp — Paid`
```
Twilio WhatsApp to contractor:
"{{ client_name }} paid €{{ paid_amount }} in full — INV-{{ invoice_number }} closed."
```

Node 8a-partial — `Notify: Contractor WhatsApp — Part Paid`
```
Twilio WhatsApp to contractor:
"{{ client_name }} paid €{{ paid_amount }} of €{{ total }} — €{{ remaining }} still outstanding on INV-{{ invoice_number }}."
```

- [ ] **Step 3: Register webhook in Stripe dashboard**

In Stripe test mode → Webhooks → Add endpoint:
- URL: `{{ n8n_webhook_base_url }}/stripe-payment`
- Events: `payment_intent.succeeded`, `payment_intent.partially_funded`

Copy the webhook signing secret into n8n variable `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 4: Test full payment**

In Stripe test mode, use Stripe CLI to send a test event:
```bash
stripe trigger payment_intent.succeeded --add payment_intent:metadata.invoice_number=INV-001
```

Expected: Notion Invoice INV-001 → Status: Paid, Paid Date set, Stripe Payment ID recorded. Contractor receives WhatsApp notification.

- [ ] **Step 5: Test idempotency**

Send the same Stripe event twice (same `pi_` ID). Verify Notion is only updated once. Verify contractor only receives one notification.

- [ ] **Step 6: Test signature verification**

Send a POST to the webhook URL with an invalid or missing `Stripe-Signature` header. Expected: 400 error returned, no Notion write.

- [ ] **Step 7: Export and commit**

```bash
git add n8n/workflows/stripe-webhook-receiver.json
git commit -m "feat: Stripe webhook receiver — signature verification, idempotency, full/partial payment handling"
```

---

## Task 10: Payment Received Handler + Cash Receipt

**In n8n:** Modify the existing `payment_received` intent handler.

- [ ] **Step 1: Write test case for cash payment flow**

Input transcript: "Murphy paid cash for the Shantalla job — two thousand five hundred euro."
Expected:
1. Claude extracts: customer=Murphy, amount=2500.00, payment_method=cash
2. Matching invoice found in Notion (by customer + outstanding status)
3. Cash receipt PDF generated
4. PDF sent to contractor WhatsApp: "Here's Mrs Murphy's cash receipt for €2,500. Forward if needed."
5. Invoice updated: Status=Paid, Payment Method=Cash, Cash Receipt Sent=checked, Paid Date=today
6. Contractor SMS confirmation: "Cash payment of €2,500 logged for Murphy — receipt sent to your WhatsApp."

- [ ] **Step 2: Add payment_method routing to the handler**

After matching the invoice, add a Switch node on `payment_method`:

**cash branch:**

Node A — `Build: Cash Receipt HTML`
```
Type: Code
Render cash-receipt-template.html with:
  contractor_name, contractor_address, contractor_vat_number, contractor_phone
  client_name (from matched invoice → customer relation)
  job_description (from matched invoice → job relation)
  invoice_number
  amount_received: $json.intent.amount
  receipt_number: REC-{{ timestamp }}
  payment_date: $json.intent.date
  receipt_number: "REC-" + Date.now()
```

Node B — `Call: PDF Generation Sub-workflow`
```
Execute sub-wf-pdf-invoice with rendered cash receipt HTML.
```

Node C — `Send: Cash Receipt to Contractor WhatsApp`
```
Twilio WhatsApp:
"Here's {{ client_name }}'s cash receipt for €{{ amount }} — REC-{{ id }}. Forward to client if needed.\nPDF: {{ pdf_url }}"
```

Node D — `Update: Notion Invoice — Cash Paid`
```
PATCH invoice page:
  Status: Paid
  Paid Date: $json.intent.date
  Payment Method: Cash
  Cash Receipt Sent: true
  Amount Paid: $json.intent.amount
```

**bank_transfer branch:**
```
Update Notion: Status=Paid, Payment Method=Bank Transfer, Paid Date=$json.intent.date, Amount Paid=$json.intent.amount
Confirm to contractor: "Bank transfer of €{{ amount }} logged for {{ customer }} — INV-{{ number }} closed."
```

**cheque branch:**
```
Update Notion: Status=Paid, Payment Method=Cheque, Paid Date=$json.intent.date
Confirm: "Cheque payment of €{{ amount }} logged for {{ customer }}."
```

- [ ] **Step 3: Test cash receipt flow**

Pin the cash payment transcript. Run workflow. Verify:
- Cash receipt PDF is generated and URL is valid
- WhatsApp message arrives on contractor's phone with PDF link
- Notion Invoice updated: Status=Paid, Payment Method=Cash, Cash Receipt Sent=true

- [ ] **Step 4: Export and commit**

```bash
git add n8n/workflows/payment-received-handler.json
git commit -m "feat: payment_received handler — cash receipt PDF, bank transfer, cheque paths"
```

---

## Task 11: invoice_resend Intent Handler

**In n8n:** Add a new branch to the main workflow Switch node.

- [ ] **Step 1: Write test case**

Input: "Send Murphy's invoice again — she says she didn't get it."
Expected:
1. Claude extracts: type=invoice_resend, customer_name=Murphy
2. Most recent open invoice for Murphy fetched from Notion
3. Existing PDF URL and Stripe link retrieved (already generated — no new PDF)
4. Re-deliver via sub-wf-delivery-routing using existing mode + contact
5. Notion: Sent Date updated to today, Chase Log appended "Re-sent on [date]"
6. Contractor SMS: "INV-007 re-sent to Mrs Murphy — murphy@example.com."

- [ ] **Step 2: Build the handler nodes**

Node 1 — `Fetch: Open Invoice for Customer`
```
Notion query: Invoices where Customer matches AND Status in [Sent, Part Paid]
Order by: Sent Date DESC
Take first result.
If none found: SMS contractor "No open invoice found for {{ customer }}."
```

Node 2 — `Check: Invoice has PDF URL`
```
IF $json.invoice.pdfUrl is empty:
  Regenerate PDF via sub-wf-pdf-invoice (build HTML from invoice data)
ELSE:
  Use existing PDF URL and Stripe link directly.
```

Node 3 — `Call: Delivery Routing`
```
Execute sub-wf-delivery-routing with existing invoice data + contacts.
```

Node 4 — `Update: Notion — Re-sent`
```
PATCH invoice: Sent Date = today
```

Node 5 — `Confirm: Contractor SMS`
```
"{{ invoice_number }} re-sent to {{ client_name }}."
```

- [ ] **Step 3: Update n8n Switch node**

Add `invoice_resend` as a new case in the main Route by Intent Switch node. Connect to this handler.

- [ ] **Step 4: Test**

Run test case. Verify re-delivery without creating a new PDF or new Stripe link.

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/invoice-resend-handler.json
git commit -m "feat: invoice_resend intent handler"
```

---

## Task 12: End-to-End Integration Test

- [ ] **Step 1: Full money cycle test**

1. Log labour (Scenario 3 pinned data) → verify Labour record created
2. Log costs (Scenario 2) → verify Cost records created
3. Trigger invoice (Scenario 4 + delivery) → verify:
   - Invoice PDF generated
   - Email sent to murphy@example.com
   - Stripe payment link in email
   - Notion: Status=Sent, PDF URL, Due Date set
4. Simulate Stripe payment via CLI: `stripe trigger payment_intent.succeeded`
5. Verify Notion: Status=Paid, Paid Date set
6. Verify contractor WhatsApp: "Mrs Murphy paid €391.25 in full — INV-001 closed."

- [ ] **Step 2: Cash payment test**

1. Invoice Kelly → Mode C (no contact on file) → WhatsApp to contractor
2. Contractor says "Kelly paid cash — three hundred euro"
3. Verify: cash receipt PDF generated, sent to contractor WhatsApp, Notion Paid

- [ ] **Step 3: Error path test**

1. Temporarily break PDF.co API key
2. Trigger invoice
3. Verify: Error Trigger fires, Intrigue8 notified, contractor receives honest error SMS

- [ ] **Step 4: Update test data doc and commit**

```bash
git add docs/N8N_PINNED_TEST_DATA_ADDON2.md
git commit -m "docs: Add-on 2 test results — all integration tests passing"
```

---

*This plan is self-contained. Add-on 3 (Automated Payment Chasing) depends on the `Due Date` field written in Task 8 of this plan — build Add-on 2 to completion before starting Add-on 3.*
