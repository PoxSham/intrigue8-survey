# RCT & VAT Tax Summary — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Agent guidance:** Use specialist agents in `.claude/agents/` for domain work — `ai-prompt-engineer` for Claude prompt changes, `automation-engineer` for n8n scheduled workflows and queries, `backend-developer` for PDF generation and VAT calculation logic, `solutions-architect` for any data model decisions, `contrarian` before any tax-related design decisions (Irish regulatory compliance is non-negotiable). Use other Claude agent types and superpowers skills freely. Critically: the `contrarian` agent must review the VAT calculation logic before it is deployed — incorrect VAT figures cause real harm to contractors.

**Goal:** Automatically track VAT collected, VAT reclaimable, and RCT withheld on a per-period basis. Generate bi-monthly VAT summaries aligned to Revenue's return cycle, an annual year-end summary for the Form 11, and respond to on-demand voice queries about tax position.

**Architecture:** Six new Claude intents (tax_query, vat_query, rct_query, income_query, summary_request, expense_log, mileage_log). New Notion database for General Business Expenses. Two new scheduled workflows (bi-monthly and annual). All tax data is pulled from existing Notion databases — no new data entry required beyond small schema additions and business expense logging.

**Tech Stack:** n8n · Claude API (Haiku) · Notion API · PDF.co API · Twilio WhatsApp API

**Prerequisites:**
- Add-ons 1, 2, and 3 fully built (or at minimum Add-on 2, which provides invoice and payment data)
- At least 2 months of real invoice + cost data in Notion to validate against
- No actual tax filing is done by this system — it produces summaries for the contractor's accountant

**COMPLIANCE CRITICAL:** This system produces summaries for accountant review. It does NOT file VAT returns, does NOT provide tax advice, and NEVER estimates income tax, USC, or PRSI liability. Every summary must include the disclaimer: "This document does not constitute tax advice. All figures should be verified by your accountant before filing."

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `n8n/templates/vat-summary-template.html` | Create | PDF template for bi-monthly VAT summary |
| `n8n/templates/yearend-summary-template.html` | Create | PDF template for annual year-end summary |
| `prompts/system-prompt-v6.md` | Create | Updated Claude prompt — 7 new tax intents |
| `docs/N8N_PINNED_TEST_DATA_ADDON4.md` | Create | Test data for all tax query scenarios |
| Customers DB (Notion) | Modify | Add Principal Contractor, RCT Rate fields |
| Costs DB (Notion) | Modify | Add VAT Rate on Purchase field |
| Client Mapping DB (Notion) | Modify | Add VAT Period field |
| General Business Expenses DB (Notion) | Create | New database |
| n8n: bimonthly-vat-trigger | Create | Scheduled bi-monthly VAT summary workflow |
| n8n: annual-yearend-trigger | Create | Annual 1st January summary workflow |
| n8n: sub-wf-vat-calculation | Create | Core VAT + RCT calculation sub-workflow |
| n8n: tax-query-handlers | Create | 7 intent handlers in main workflow |
| n8n: expense-log-handler | Create | General Business Expenses intent handler |
| n8n: rct-prompt-flow | Create | RCT prompt on principal contractor payment |

---

## Task 1: Notion Schema Additions

**Files:** Notion databases (UI-based changes)

- [ ] **Step 1: Add fields to Customers database**

| Property | Type | Notes |
|---|---|---|
| `Principal Contractor` | Checkbox | True = RCT applies, reverse charge, no VAT on invoices |
| `RCT Rate` | Select | Options: `0%`, `20%`, `35%` — contractor's current rate for this client |

For existing test customer (Murphy): Principal Contractor = false.
Create a new test customer: "Lydon Construction" — Principal Contractor = true, RCT Rate = 20%.

- [ ] **Step 2: Add field to Costs database**

| Property | Type | Notes |
|---|---|---|
| `VAT Rate on Purchase` | Select | Options: `0%`, `13.5%`, `23%`, `Exempt` — default: 13.5% for materials, 23% for tools/equipment |

For existing test costs: set VAT Rate on Purchase to 13.5%.

- [ ] **Step 3: Add field to Client Mapping database**

| Property | Type | Notes |
|---|---|---|
| `VAT Period` | Select | Options: `Bimonthly` (default), `Quarterly`, `Annual` |

Set test contractor record: VAT Period = Bimonthly.

- [ ] **Step 4: Create General Business Expenses database**

New Notion database named "General Business Expenses":

| Property | Type | Notes |
|---|---|---|
| Name (title) | Title | Auto-set: Category + Date |
| Date | Date | Date of expense |
| Category | Select | Mileage / Phone / Insurance / Subscriptions / Tools / Training / Accountancy / Other |
| Description | Text | Contractor's wording (preserved verbatim) |
| Amount | Number | € amount (for mileage: total reimbursement value) |
| VAT Rate | Select | 0% / 13.5% / 23% / Exempt |
| VAT Amount | Formula | `prop("Amount") * (prop("VAT Rate numeric") / 100)` |
| VAT Rate Numeric | Number | Hidden field: 0, 13.5, or 23 — matches VAT Rate select |
| Period | Text | Auto-set: "YYYY-MM-DD to YYYY-MM-DD" for the bi-monthly period |
| Kilometres | Number | For mileage entries only |
| Contractor | Relation → Client Mapping | Which contractor this belongs to |

Get the new DB ID. Add to `docs/NOTION_DATABASE_IDS.md`:
```
DB_GENERAL_EXPENSES=[new-id-no-hyphens]
```

- [ ] **Step 5: Commit docs update**

```bash
git add docs/NOTION_DATABASE_IDS.md
git commit -m "docs: Add-on 4 Notion schema additions — Customers, Costs, Client Mapping, new General Business Expenses DB"
```

---

## Task 2: Claude System Prompt v6 — Tax Intents

**Files:**
- Create: `prompts/system-prompt-v6.md`

- [ ] **Step 1: Write test cases before prompt change**

Create `docs/N8N_PINNED_TEST_DATA_ADDON4.md`:

```
Test A — expense_log:
Transcript: "Log a business expense — van insurance, eight hundred and forty for the year."
Expected:
{
  "type": "expense_log",
  "confidence": 0.93,
  "category": "Insurance",
  "description": "Van insurance",
  "amount": 840.00,
  "date": "2026-05-01",
  "vat_rate": 0
}

Test B — mileage_log:
Transcript: "Log mileage — three hundred and forty kilometres this month."
Expected:
{
  "type": "mileage_log",
  "confidence": 0.92,
  "kilometres": 340,
  "date": "2026-05-01",
  "description": "Mileage — May 2026"
}

Test C — vat_query:
Transcript: "What's my VAT this period?"
Expected:
{ "type": "vat_query", "confidence": 0.95, "period": null }

Test D — rct_query:
Transcript: "How much RCT has been taken from me?"
Expected:
{ "type": "rct_query", "confidence": 0.93, "period": null }

Test E — income_query:
Transcript: "What did I earn this month?"
Expected:
{ "type": "income_query", "confidence": 0.94, "period": "current_month" }

Test F — summary_request:
Transcript: "Send me my tax summary."
Expected:
{ "type": "summary_request", "confidence": 0.91, "period": null }

Test G — tax_query (general):
Transcript: "What's my tax position?"
Expected:
{ "type": "tax_query", "confidence": 0.89 }
```

Run against v5 prompt — all must fail.

- [ ] **Step 2: Write v6 additions**

Copy `prompts/system-prompt-v5.md` → `prompts/system-prompt-v6.md`. Add:

```
expense_log: Contractor is logging a general business expense (not tied to a specific job).
Signals: "log a business expense", "log expense", "put down", "office expense", "accountancy"
Fields:
  category: "Mileage" | "Phone" | "Insurance" | "Subscriptions" | "Tools" | "Training" | "Accountancy" | "Other"
  description: string — preserve contractor's exact wording
  amount: number — € value
  date: ISO date (from timestamp or stated date)
  vat_rate: 0 (most business expenses: insurance, phone, subscriptions are VAT exempt or pre-VAT)
    Exception: tools and equipment = 23%
    Training = 23%
    Default for unlisted: 0
Confirmation: "Business expense logged — {{ category }}: {{ description }}, €{{ amount }}."

mileage_log: Contractor is logging business kilometres.
Signals: "log mileage", "kilometres", "put in mileage"
Fields:
  kilometres: number
  date: ISO date (from timestamp or "this month" → first of current month)
  description: "Mileage — [month year]" (auto-generated)
Revenue mileage rate: €0.43/km for first 1,500km per year, €0.24/km thereafter.
Confirmation: "Mileage logged — {{ kilometres }}km. Revenue rate: €{{ calculated_amount }}."
Note: Do NOT calculate the reimbursement amount in the JSON — the handler computes it based on YTD mileage.

vat_query: Contractor asks about their current VAT position.
Signals: "VAT this period", "what do I owe Revenue", "VAT return", "what's my VAT"
Fields: period (null = current period)
Confirmation: (generated by handler from Notion data)

rct_query: Contractor asks about RCT deducted from their income.
Signals: "how much RCT", "tax withheld", "RCT taken from me", "what's been deducted"
Fields: period (null = year to date)
Confirmation: (generated by handler)

income_query: Contractor asks about earnings.
Signals: "what did I earn", "how much have I invoiced", "income this month", "revenue this period"
Fields: period — "current_month" | "current_period" | "ytd" | null (= current period)
Confirmation: (generated by handler)

summary_request: Contractor requests their tax summary PDF to be sent now.
Signals: "send my tax summary", "send the VAT summary", "generate my summary"
Fields: period (null = current period)
Confirmation: "Generating and sending your current period tax summary."

tax_query: General tax status question. Catch-all for any tax-related query not covered above.
Signals: "tax position", "tax situation", "what do I owe"
Confirmation: (generated by handler — returns brief overview)
```

- [ ] **Step 3: Run all 7 test cases against v6 prompt**

Expected: all 7 intents extracted correctly. Confidence ≥ 0.88 on all.

- [ ] **Step 4: Full regression test**

All prior test scenarios (Scenarios 1–6 core + Add-on 2 tests A–D + Add-on 3 tests A–E + Add-on 1 tests 1–5). All must still pass.

- [ ] **Step 5: Commit**

```bash
git add prompts/system-prompt-v6.md docs/N8N_PINNED_TEST_DATA_ADDON4.md
git commit -m "feat: system prompt v6 — 7 tax intents: expense_log, mileage_log, vat_query, rct_query, income_query, summary_request, tax_query"
```

---

## Task 3: VAT Calculation Sub-Workflow

**In n8n:** Create sub-workflow `sub-wf-vat-calculation`.

This is the engine. Given a contractor ID and date range, it queries Notion and computes all VAT and RCT figures. It is called by both the scheduled trigger and the on-demand query handlers.

- [ ] **Step 1: Write expected input/output**

Input:
```json
{
  "contractor_phone": "+353851234567",
  "notion_workspace_id": "353006e0-b44d-81a3-9715-dc96593da727",
  "period_start": "2026-01-01",
  "period_end": "2026-02-28"
}
```

Expected output:
```json
{
  "period_start": "2026-01-01",
  "period_end": "2026-02-28",
  "vat_due_date": "2026-03-23",

  "direct_invoiced_ex_vat": 12400.00,
  "direct_vat_collected": 1674.00,
  "direct_gross": 14074.00,
  "direct_paid": 11200.00,
  "direct_outstanding": 2874.00,

  "principal_invoiced_gross": 6400.00,
  "rct_withheld": 1280.00,
  "principal_net_received": 5120.00,
  "rct_ytd": 1280.00,

  "costs_vat_13_5_ex": 3840.00,
  "costs_vat_13_5_amount": 518.40,
  "costs_vat_23_ex": 500.00,
  "costs_vat_23_amount": 115.00,
  "costs_total_reclaimable": 633.40,
  "costs_no_vat": 620.00,

  "net_vat_payable": 1040.60,

  "general_expenses_total": 840.00,
  "mileage_km_period": 340,
  "mileage_amount": 146.20
}
```

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Query: Direct Client Invoices (non-principal)`
```
Notion query: Invoices DB
Filter:
  AND: Sent Date >= period_start
  AND: Sent Date <= period_end
  AND: Customer.Principal Contractor = false (or null)

For each invoice:
  ex_vat = Invoice Total / (1 + vat_rate/100)
  vat_collected = Invoice Total - ex_vat
  paid = Amount Paid
  outstanding = Balance Due

Sum all values.
```

Node 2 — `Query: Principal Contractor Invoices`
```
Notion query: Invoices DB
Filter:
  AND: Sent Date in period
  AND: Customer.Principal Contractor = true

For each:
  gross = Invoice Total (no VAT charged — reverse charge)
  rct_withheld = (from RCT fields on payment_received records)
  net_received = gross - rct_withheld

Sum all values. Also compute YTD RCT by querying from start of year.
```

Node 3 — `Query: Costs in Period`
```
Notion query: Costs DB
Filter: Date in period

Group by VAT Rate on Purchase:
  13.5% items → sum ex-VAT amounts, compute VAT
  23% items → sum ex-VAT amounts, compute VAT
  0%/Exempt items → sum, no VAT reclaimable

Note: Cost amounts stored in Notion are ex-VAT. Compute VAT amounts from rates.
If VAT Rate on Purchase is null: default to 13.5% for materials.
```

Node 4 — `Query: General Business Expenses in Period`
```
Notion query: General Business Expenses DB
Filter: Date in period AND Contractor = this contractor

Sum amounts and VAT amounts.
Extract mileage entries: sum kilometres.
```

Node 5 — `Compute: Mileage Reimbursement Value`
```
Type: Code
Revenue rates (2026): €0.43/km first 1,500km, €0.24/km above.
Query YTD mileage to date to determine rate tier.

const ytdKm = $json.ytdMileageKm;
const periodKm = $json.periodMileageKm;
let amount = 0;
const remaining1500 = Math.max(0, 1500 - (ytdKm - periodKm));
const at43rate = Math.min(periodKm, remaining1500);
const at24rate = periodKm - at43rate;
amount = (at43rate * 0.43) + (at24rate * 0.24);
return [{ json: { mileage_amount: Math.round(amount * 100) / 100 } }];
```

Node 6 — `Compute: Net VAT Payable`
```
Type: Code
const netVat = $json.direct_vat_collected - $json.costs_total_reclaimable;
// Never negative in this system — if negative, contractor gets a refund (note in summary)
return [{ json: { net_vat_payable: Math.round(netVat * 100) / 100 } }];
```

Node 7 — `Compute: Revenue Due Date`
```
Type: Code
const periods = {
  '01-02': '03-23', '03-04': '05-23', '05-06': '07-23',
  '07-08': '09-23', '09-10': '11-23', '11-12': '01-23'
};
// ... map period_start month to due date
```

- [ ] **Step 3: Contrarian review of VAT calculation logic**

REQUIRED: Before implementing Task 4 (the scheduled trigger that will actually generate and send PDFs), invoke the `contrarian` agent to review the VAT calculation logic.

Questions the contrarian must answer:
- Is the direct/principal contractor VAT split correct for Irish Revenue?
- Is the cost VAT reclaimable calculation correct (ex-VAT amounts × rate)?
- Is the RCT "tax paid on your behalf" framing accurate and not misleading?
- Is the mileage calculation correct for 2026 Revenue rates?
- Does the disclaimer adequately protect against the contractor treating this as tax advice?

Do NOT proceed with Task 4 until the contrarian review is complete and any issues are resolved.

- [ ] **Step 4: Test calculation with known data**

Create test data in Notion:
- 2 invoices to direct clients: €1,000 + €1,000 (inc 13.5% VAT = €881.06 ex-VAT + €118.94 VAT each)
- 1 invoice to Lydon Construction (principal): €2,000 (no VAT)
- 1 payment from Lydon: €2,000 received, RCT 20% = €400 withheld, net received €1,600
- 1 cost: €100 materials at 13.5% VAT = €13.50 reclaimable
- 1 general expense: van insurance €500 (no VAT)

Run sub-workflow with period covering this data.

Expected output:
```
direct_invoiced_ex_vat: 1762.12
direct_vat_collected: 237.88
principal_invoiced_gross: 2000.00
rct_withheld: 400.00
costs_vat_13_5_ex: 100.00
costs_vat_13_5_amount: 13.50
costs_total_reclaimable: 13.50
net_vat_payable: 224.38 (237.88 - 13.50)
```

Verify manually: 2 × €1,000 = €2,000 total. Ex-VAT = 2000/1.135 = 1762.11. VAT = 237.89. ✓

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/sub-wf-vat-calculation.json
git commit -m "feat: VAT calculation sub-workflow — direct/principal split, cost reclaimable, RCT, mileage"
```

---

## Task 4: VAT Summary PDF Templates

**Files:**
- Create: `n8n/templates/vat-summary-template.html`
- Create: `n8n/templates/yearend-summary-template.html`

- [ ] **Step 1: Create vat-summary-template.html**

This is the bi-monthly summary. Use a clean, accountant-friendly layout.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { font-family: Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; padding: 36px; }
.header { border-bottom: 3px solid #1a1a1a; padding-bottom: 14px; margin-bottom: 22px; }
.contractor-name { font-size: 14pt; font-weight: bold; }
.period-label { font-size: 11pt; color: #444; margin-top: 4px; }
.generated-info { font-size: 9pt; color: #666; margin-top: 3px; }
.section { margin: 18px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden; }
.section-header { background: #1a1a1a; color: white; padding: 8px 14px; font-size: 10pt; font-weight: bold; letter-spacing: 0.3px; }
.section-body { padding: 12px 14px; }
table.figures { width: 100%; border-collapse: collapse; }
table.figures tr { border-bottom: 1px solid #f0f0f0; }
table.figures td { padding: 5px 4px; }
table.figures td.amount { text-align: right; font-family: "Courier New", monospace; }
table.figures td.label { color: #444; }
.subtotal-row td { font-weight: bold; border-top: 1px solid #bbb; }
.highlighted { background: #fff8e1; }
.net-payable-section { background: #f0f7f0; border: 2px solid #4caf50; border-radius: 4px; padding: 14px 18px; margin: 20px 0; }
.net-payable-label { font-size: 11pt; font-weight: bold; }
.net-payable-amount { font-size: 18pt; font-weight: bold; color: #2e7d32; float: right; }
.due-date { font-size: 10pt; color: #555; margin-top: 8px; clear: both; }
.rct-section { background: #fff3e0; border: 1px solid #ffb74d; border-radius: 4px; padding: 12px 16px; margin: 16px 0; }
.disclaimer { margin-top: 24px; background: #fafafa; border: 1px solid #e0e0e0; padding: 12px; font-size: 8.5pt; color: #666; line-height: 1.5; }
.footer { margin-top: 20px; border-top: 1px solid #e0e0e0; padding-top: 10px; font-size: 8pt; color: #999; text-align: center; }
</style>
</head>
<body>

<div class="header">
  <div class="contractor-name">{{contractor_name}} — VAT Summary</div>
  <div class="period-label">Period: {{period_start_display}} – {{period_end_display}} | VAT No: IE {{contractor_vat_number}}</div>
  <div class="generated-info">Generated: {{generated_date}} | Revenue due date: {{vat_due_date}}</div>
</div>

<!-- Income: Direct Work -->
<div class="section">
  <div class="section-header">INCOME — DIRECT CLIENT WORK (VAT Applicable @ 13.5%)</div>
  <div class="section-body">
    <table class="figures">
      <tr><td class="label">Invoices raised (ex-VAT)</td><td class="amount">€{{direct_invoiced_ex_vat}}</td></tr>
      <tr><td class="label">VAT collected @ 13.5%</td><td class="amount">€{{direct_vat_collected}}</td></tr>
      <tr><td class="label">Gross invoiced (inc. VAT)</td><td class="amount">€{{direct_gross}}</td></tr>
      <tr><td class="label">Payments received</td><td class="amount">€{{direct_paid}}</td></tr>
      <tr class="subtotal-row"><td class="label">Outstanding</td><td class="amount">€{{direct_outstanding}}</td></tr>
    </table>
  </div>
</div>

<!-- Income: Principal Contractor -->
<div class="section">
  <div class="section-header">INCOME — PRINCIPAL CONTRACTOR WORK (Reverse Charge — No VAT)</div>
  <div class="section-body">
    <table class="figures">
      <tr><td class="label">Invoices raised (no VAT — reverse charge)</td><td class="amount">€{{principal_invoiced_gross}}</td></tr>
      <tr><td class="label">RCT withheld at source ({{rct_rate_display}})</td><td class="amount">€{{rct_withheld}}</td></tr>
      <tr class="subtotal-row"><td class="label">Net received (after RCT)</td><td class="amount">€{{principal_net_received}}</td></tr>
    </table>
  </div>
</div>

<!-- RCT Position -->
<div class="rct-section">
  <strong>RCT Position — Year to Date</strong><br>
  RCT withheld this period: €{{rct_withheld}} | Cumulative YTD: €{{rct_ytd}}<br>
  <span style="font-size:9pt; color:#777;">RCT withheld by principal contractors is recorded as tax paid on your behalf. It offsets your income tax liability at year-end via Form 11. Confirm with your accountant.</span>
</div>

<!-- Expenditure -->
<div class="section">
  <div class="section-header">EXPENDITURE — JOB COSTS & MATERIALS</div>
  <div class="section-body">
    <table class="figures">
      <tr><td class="label">VAT-reclaimable costs @ 13.5% (ex-VAT)</td><td class="amount">€{{costs_vat_13_5_ex}}</td></tr>
      <tr><td class="label">  → VAT reclaimable @ 13.5%</td><td class="amount">€{{costs_vat_13_5_amount}}</td></tr>
      <tr><td class="label">VAT-reclaimable costs @ 23% (ex-VAT)</td><td class="amount">€{{costs_vat_23_ex}}</td></tr>
      <tr><td class="label">  → VAT reclaimable @ 23%</td><td class="amount">€{{costs_vat_23_amount}}</td></tr>
      <tr class="subtotal-row"><td class="label">Total VAT reclaimable on purchases</td><td class="amount">€{{costs_total_reclaimable}}</td></tr>
      <tr><td class="label">Non-VAT costs (labour-only, exempt)</td><td class="amount">€{{costs_no_vat}}</td></tr>
    </table>
  </div>
</div>

<!-- Net VAT Payable -->
<div class="net-payable-section">
  <div class="net-payable-label">NET VAT PAYABLE TO REVENUE</div>
  <div class="net-payable-amount">€{{net_vat_payable}}</div>
  <div class="due-date">Due: <strong>{{vat_due_date}}</strong> via ROS (Revenue Online Service)<br>
  Calculation: VAT collected €{{direct_vat_collected}} − VAT reclaimable €{{costs_total_reclaimable}} = €{{net_vat_payable}}</div>
</div>

<!-- General Business Expenses -->
{{#has_general_expenses}}
<div class="section">
  <div class="section-header">GENERAL BUSINESS EXPENSES (This Period)</div>
  <div class="section-body">
    <table class="figures">
      {{#general_expense_lines}}
      <tr><td class="label">{{category}}: {{description}}</td><td class="amount">€{{amount}}</td></tr>
      {{/general_expense_lines}}
      {{#mileage_km}}
      <tr><td class="label">Mileage: {{mileage_km}}km @ Revenue rate</td><td class="amount">€{{mileage_amount}}</td></tr>
      {{/mileage_km}}
      <tr class="subtotal-row"><td class="label">Total general expenses</td><td class="amount">€{{general_expenses_total}}</td></tr>
    </table>
    <p style="font-size:8.5pt; color:#666; margin-top:8px;">General expenses are deductible against income for income tax purposes. They do not affect your VAT return. Include in your Form 11.</p>
  </div>
</div>
{{/has_general_expenses}}

<!-- Disclaimer -->
<div class="disclaimer">
  <strong>IMPORTANT DISCLAIMER:</strong> This document is an automatically generated summary prepared from your job records, invoices, costs, and payments logged via Intrigue8 Voice-to-Invoice. It is intended to assist your accountant in preparing your VAT return and does not constitute tax advice. All figures must be verified by your accountant before filing with Revenue. Intrigue8 accepts no liability for errors arising from missing, incorrect, or incomplete data in your Notion workspace. Income tax, USC, and PRSI liability are calculated by your accountant on your annual Form 11 return and are not reflected in this document.
</div>

<div class="footer">
  Prepared automatically by Intrigue8 Voice-to-Invoice | {{contractor_name}} | VAT Reg: {{contractor_vat_number}}<br>
  Period {{period_start_display}} – {{period_end_display}} | Generated {{generated_date}}
</div>

</body>
</html>
```

- [ ] **Step 2: Create yearend-summary-template.html**

The annual summary is structured similarly but adds:
- Full year VAT reconciliation (6 bi-monthly periods summarised)
- Full invoice list (paid + outstanding)
- Full cost list
- All general business expenses categorised
- YTD RCT total

Use the same CSS as the bi-monthly template. Add sections:
- "Full Year Invoice Reconciliation" — table of all invoices: date, client, amount, status
- "Full Year Cost Breakdown" — by category
- "General Business Expenses (Full Year)" — by category
- "VAT Return Reconciliation" — 6 periods with amounts and due dates

Include the enhanced disclaimer for the year-end version: "This document is intended for use by your accountant in preparing your Form 11 income tax return (due 31 October or 15 November via ROS). It does not file any return on your behalf."

- [ ] **Step 3: Commit templates**

```bash
git add n8n/templates/vat-summary-template.html n8n/templates/yearend-summary-template.html
git commit -m "feat: VAT summary PDF templates — bi-monthly and annual year-end"
```

---

## Task 5: Bi-Monthly Scheduled Workflow

**In n8n:** Create workflow `bimonthly-vat-trigger`.

- [ ] **Step 1: Write the schedule and period mapping**

Revenue's bi-monthly schedule:
| Run date | Period | Due date |
|---|---|---|
| 1st March | Jan–Feb | 23rd March |
| 1st May | Mar–Apr | 23rd May |
| 1st July | May–Jun | 23rd July |
| 1st September | Jul–Aug | 23rd September |
| 1st November | Sep–Oct | 23rd November |
| 1st January | Nov–Dec | 23rd January |

- [ ] **Step 2: Build the workflow**

Node 1 — `Trigger: Schedule`
```
Cron: 0 8 1 3,5,7,9,11 * (1st of March, May, July, September, November at 08:00)
+ Separate schedule entry for 1st January (annual trigger handles November-December AND year-end)
Timezone: Europe/Dublin
```

Node 2 — `Compute: Period Dates`
```
Type: Code
const now = new Date();
const month = now.getMonth() + 1;
const year = now.getFullYear();
// Map current month to previous 2-month period
const periodMap = {
  3: { start: `${year}-01-01`, end: `${year}-02-28`, due: `${year}-03-23` },
  5: { start: `${year}-03-01`, end: `${year}-04-30`, due: `${year}-05-23` },
  7: { start: `${year}-05-01`, end: `${year}-06-30`, due: `${year}-07-23` },
  9: { start: `${year}-07-01`, end: `${year}-08-31`, due: `${year}-09-23` },
  11: { start: `${year}-09-01`, end: `${year}-10-31`, due: `${year}-11-23` },
  1: { start: `${year-1}-11-01`, end: `${year-1}-12-31`, due: `${year}-01-23` },
};
const period = periodMap[month];
return [{ json: period }];
```

Node 3 — `Query: All Active Contractors`
```
Query Client Mapping DB where Active = true
Filter: VAT Period IN [Bimonthly, null]
For each contractor: call the summary generation sub-flow
```

Node 4 — `Loop: Per Contractor`
```
For each contractor:
  - Call sub-wf-vat-calculation with contractor phone, workspace, period dates
  - Render vat-summary-template.html with results
  - Call sub-wf-pdf-invoice → get PDF URL
  - Send WhatsApp to contractor: "Your Jan-Feb VAT summary is ready. Net VAT payable: €{{ net_vat_payable }} — due 23rd March via ROS. PDF: {{ pdf_url }}"
  - Add 400ms delay between contractors (Notion rate limit)
```

- [ ] **Step 3: Test by manually triggering**

Create known test data for Jan–Feb 2026. Manually trigger the workflow. Verify:
- PDF generated with correct figures
- WhatsApp sent to contractor
- Net VAT payable matches manual calculation

- [ ] **Step 4: Export and commit**

```bash
git add n8n/workflows/bimonthly-vat-trigger.json
git commit -m "feat: bi-monthly VAT summary scheduled workflow — aligned to Revenue cycle"
```

---

## Task 6: Annual Year-End Summary Workflow

**In n8n:** Create workflow `annual-yearend-trigger`.

- [ ] **Step 1: Build the workflow**

Node 1 — `Trigger: Schedule`
```
Cron: 0 8 1 1 * (1st January at 08:00)
Timezone: Europe/Dublin
```

Node 2 — `Compute: Full Year Period`
```
year = current year - 1
period_start: `${year}-01-01`
period_end: `${year}-12-31`
```

Node 3 — `For each active contractor:`
- Call sub-wf-vat-calculation for full year
- Query ALL invoices for the year (paid + outstanding)
- Query ALL costs for the year
- Query ALL general expenses for the year
- Render yearend-summary-template.html
- Generate PDF
- Send WhatsApp: "Your 2025 year-end summary is ready. Forward to your accountant for your Form 11. Total income: €{{ total_income }} | RCT paid on your behalf: €{{ rct_ytd }} | Outstanding invoices: €{{ outstanding }}. PDF: {{ pdf_url }}"

- [ ] **Step 2: Test by manually triggering with 2025 date override**

Temporarily set period to 2025 full year. Run. Verify PDF contains all 12 months' data.

- [ ] **Step 3: Export and commit**

```bash
git add n8n/workflows/annual-yearend-trigger.json
git commit -m "feat: annual year-end summary workflow — 1st January, full year data for Form 11"
```

---

## Task 7: On-Demand Tax Query Intent Handlers

**In n8n:** Add 7 new branches to the main workflow Switch node.

- [ ] **Step 1: expense_log handler**

```
Compute: If category = Mileage, compute reimbursement value based on YTD mileage
Create: Notion General Business Expenses page
  Date, Category, Description, Amount, VAT Rate, Period (auto-compute from date)
Confirm: "Business expense logged — {{ category }}: {{ description }}, €{{ amount }}."
```

- [ ] **Step 2: mileage_log handler**

```
Query: YTD mileage for this contractor from General Business Expenses DB
Compute: Reimbursement value at Revenue rates (€0.43/km first 1,500km, €0.24/km above)
Create: Notion General Business Expenses page — category=Mileage, amount=reimbursement_value, kilometres=X
Confirm: "Mileage logged — {{ km }}km. Revenue mileage value: €{{ amount }}. Total YTD: {{ ytd_km }}km."
```

- [ ] **Step 3: vat_query handler**

```
Determine current bi-monthly period from today's date
Call sub-wf-vat-calculation for current period
Confirm: "VAT this period ({{ period_dates }}):
  Collected: €{{ direct_vat_collected }}
  Reclaimable: €{{ costs_total_reclaimable }}
  Net payable: €{{ net_vat_payable }} — due {{ vat_due_date }}"
```

- [ ] **Step 4: rct_query handler**

```
Compute: YTD from 1st January to today
Query: All principal contractor invoices + RCT withheld
Confirm: "RCT withheld year to date: €{{ rct_ytd }}
  By client: {{ list each principal client with amount }}
  This offsets your income tax at year-end — confirm with your accountant."
```

- [ ] **Step 5: income_query handler**

```
Based on period field (current_month, current_period, ytd):
  Query Invoices in the period
  Sum Invoice Total (all) and Amount Paid
Confirm: "Income this month: invoiced €{{ total_invoiced }}, received €{{ total_paid }}, outstanding €{{ outstanding }}."
```

- [ ] **Step 6: summary_request handler**

```
Determine current period
Call sub-wf-vat-calculation
Render PDF
Call sub-wf-pdf-invoice
Send WhatsApp: "Here's your current period tax summary. PDF: {{ pdf_url }}"
```

- [ ] **Step 7: tax_query handler**

```
Brief overview combining vat_query + income_query in one SMS:
"Tax snapshot:
  VAT due: €{{ net_vat_payable }} by {{ vat_due_date }}
  Outstanding invoices: €{{ total_outstanding }}
  RCT withheld YTD: €{{ rct_ytd }}"
```

- [ ] **Step 8: Update Switch node**

Add all 7 cases. Verify no existing branches broken.

- [ ] **Step 9: Test all 7 handlers**

Use test data from `docs/N8N_PINNED_TEST_DATA_ADDON4.md`. Verify each produces correct Notion writes and SMS responses.

- [ ] **Step 10: Export and commit**

```bash
git add n8n/workflows/tax-query-handlers.json n8n/workflows/expense-log-handler.json
git commit -m "feat: 7 tax intent handlers — expense log, mileage, VAT query, RCT query, income query, summary, tax query"
```

---

## Task 8: RCT Prompt Flow

**In n8n:** When a `payment_received` intent arrives from a Principal Contractor client, trigger an RCT confirmation prompt.

- [ ] **Step 1: Identify principal contractor payments**

In the existing `payment_received` handler, after looking up the invoice, check if `Customer.Principal Contractor = true`.

If yes: before updating Notion, send an additional SMS to the contractor:
```
"Payment received from Lydon Construction — €{{ amount }}. Was RCT withheld? If so, how much?"
```

- [ ] **Step 2: Handle the RCT confirmation reply**

Add a new intent to the v6 prompt:
```
rct_confirm: Contractor confirms RCT amount withheld from a principal contractor payment.
Signals: "yes, twenty percent", "RCT was X", "they took X in tax", "four hundred withheld"
Fields:
  rct_amount: number
  rct_rate: "0%" | "20%" | "35%" | null
  customer_name: string | null
Note: This intent will only be triggered when the contractor is replying to an RCT prompt.
```

- [ ] **Step 3: Store RCT data in Notion**

When rct_confirm received:
- Find the most recent payment_received record for this contractor
- Update the Invoice record: add RCT Withheld field (new Invoices field needed)
- Add to Invoice properties:
  - `RCT Withheld` (Number field) — amount withheld by principal contractor

- [ ] **Step 4: Add RCT Withheld field to Invoices DB**

| Property | Type | Notes |
|---|---|---|
| `RCT Withheld` | Number | Amount withheld by principal contractor on this invoice |

- [ ] **Step 5: Test RCT prompt flow**

1. Set Lydon Construction: Principal Contractor = true
2. Voice note: "Lydon paid today — four grand"
3. Verify: RCT prompt SMS sent: "Was RCT withheld? If so, how much?"
4. Reply: "Yes, 20% — eight hundred"
5. Verify: Notion Invoice RCT Withheld = 800.00
6. Run vat_query — verify RCT appears in RCT YTD figure

- [ ] **Step 6: Export and commit**

```bash
git add n8n/workflows/rct-prompt-flow.json
git commit -m "feat: RCT prompt flow — prompts contractor on principal contractor payments, stores RCT withheld"
```

---

## Task 9: End-to-End Integration Test

- [ ] **Step 1: Full bi-monthly cycle test**

1. Create test data for Jan–Feb 2026 in Notion (5 invoices: 3 direct, 2 principal; 10 costs; 2 general expenses; 1 mileage log)
2. Manually trigger bimonthly-vat-trigger with period = Jan–Feb 2026
3. Verify:
   - PDF generated with correct VAT figures
   - WhatsApp received with summary
   - Net VAT payable calculated correctly

- [ ] **Step 2: On-demand query test**

Voice: "What's my VAT this period?"
Verify SMS response matches data in Notion.

Voice: "Log mileage — two hundred kilometres."
Verify Notion General Business Expenses: new entry, Revenue rate applied (€86.00 at €0.43/km).

Voice: "What does Lydon Construction owe me in RCT?"
Verify correct RCT YTD figures returned.

- [ ] **Step 3: Year-end test (manual trigger)**

Override trigger to process 2025 full year. Verify PDF covers all 12 months, contains Form 11 disclaimer, and sends to contractor WhatsApp.

- [ ] **Step 4: Contrarian final review**

Before deploying to production, invoke the `contrarian` agent for a final review of:
- VAT calculation accuracy
- RCT "tax paid on your behalf" framing
- Disclaimer adequacy
- Whether any scenario could mislead a contractor into wrong tax filing behaviour

- [ ] **Step 5: Commit test results and final sign-off**

```bash
git add docs/N8N_PINNED_TEST_DATA_ADDON4.md
git commit -m "docs: Add-on 4 integration test results and contrarian review sign-off"
```

---

*This plan should be implemented last. It requires real invoice, cost, and payment data from Add-ons 1–3 to be meaningful. Implementing it before real data exists will result in empty summaries that cannot be validated for accuracy.*

*Key compliance note: if there is ever any doubt about whether a VAT calculation, RCT treatment, or general expense categorisation is correct, stop and consult a qualified Irish tax accountant before deploying. The cost of a professional review is trivial compared to the cost of sending incorrect tax summaries to every contractor client.*
