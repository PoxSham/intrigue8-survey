# Automated Payment Chasing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Agent guidance:** Use specialist agents in `.claude/agents/` for domain work — `automation-engineer` for n8n workflows, `backend-developer` for PostGrid security and letter PDF generation, `ai-prompt-engineer` for Claude prompt changes, `solutions-architect` for design decisions, `contrarian` before major decisions. Use other Claude agent types (`Explore`, `general-purpose`, `feature-dev`) and superpowers skills freely wherever appropriate.

**Goal:** Build a daily automated payment chasing system that escalates unpaid invoices through 5 stages (email → posted letters → recorded delivery final demand), logs every action in Notion as a legal evidence trail, and gives contractors voice controls to stop/pause/accelerate chasing.

**Architecture:** Two n8n scheduled triggers (daily 8am, Monday 8am) query Notion for overdue invoices and process each through a chase stage sub-workflow. Stages 3–5 call PostGrid to post physical letters. A separate Claude intent branch handles contractor voice commands. The Invoices Notion record accumulates a full timestamped Chase Log.

**Tech Stack:** n8n · SendGrid API · PostGrid API · Twilio WhatsApp API · Notion API · Claude API (Haiku) · PDF.co API

**Prerequisites:**
- Add-on 2 (Invoice Delivery + Payment Links) fully built and tested
- Notion Invoices database has `Due Date` field populated (written by Add-on 2)
- PostGrid account created, API key obtained, letter template configured
- SendGrid domain authentication configured (DKIM/SPF for contractor's domain)

---

## File Map

| File | Status | Purpose |
|------|--------|---------|
| `n8n/templates/chase-letter-template.html` | Create | HTML template for PostGrid posted letters (Stages 3/4) |
| `n8n/templates/final-notice-template.html` | Create | HTML template for recorded delivery final demand (Stage 5) |
| `prompts/system-prompt-v4.md` | Create | Updated Claude prompt — adds 5 chase control intents |
| `docs/N8N_PINNED_TEST_DATA_ADDON3.md` | Create | Test data for all chase scenarios |
| Invoices DB (Notion) | Modify | Add 9 chase tracking fields |
| n8n: daily-chase-trigger | Create | 8am daily scheduled workflow |
| n8n: sub-wf-chase-invoice | Create | Per-invoice chase logic sub-workflow |
| n8n: sub-wf-postgrid-letter | Create | PostGrid letter posting sub-workflow |
| n8n: weekly-summary-trigger | Create | Monday 8am weekly cash flow summary |
| n8n: chase-control-handlers | Create | 5 new intent handlers in main workflow |

---

## Task 1: Notion Schema Additions — Chase Fields

**Files:** Notion Invoices database (UI-based)

- [ ] **Step 1: Add chase fields to Invoices database**

| Property name | Type | Default | Notes |
|---|---|---|---|
| `Chase Enabled` | Checkbox | true | Auto-set to true when invoice sent (Add-on 2 handler) |
| `Chase Stage` | Number | 0 | 0=not started, 1–5=stage number, 6=escalated |
| `Last Chased Date` | Date | — | Set each time a chase action is taken |
| `Next Chase Date` | Date | — | Computed: Last Chased Date + stage interval |
| `Chase Log` | Text | — | Appended log of all actions (see format below) |
| `Chase Paused` | Checkbox | false | Temporary pause |
| `Chase Pause Resumes` | Date | — | Auto-resume date (7 days after pause) |
| `Letters Posted` | Number | 0 | Count of physical PostGrid letters sent |
| `Recorded Delivery Ref` | Text | — | An Post / PostGrid tracking reference |
| `Proof of Delivery Date` | Date | — | Confirmed delivery date of recorded letter |

Chase Log format (appended, never overwritten):
```
2026-05-16 08:01 — Reminder 1 sent via email to murphy@example.com
2026-05-22 08:01 — Reminder 2 sent via email to murphy@example.com
2026-05-29 08:01 — Reminder 3 sent via email + letter posted (PostGrid ref: PG-00123)
```

- [ ] **Step 2: Update Add-on 2 invoice send handler**

When an invoice is first sent (Task 8 of Add-on 2 plan), also set:
- `Chase Enabled`: true
- `Chase Stage`: 0
- `Chase Paused`: false

Edit the existing Notion PATCH in Node J of the invoice_trigger handler to include these fields.

- [ ] **Step 3: Verify in Notion**

Open any existing test invoice record. Confirm all 9 new fields appear and Chase Enabled = true, Chase Stage = 0.

- [ ] **Step 4: Commit documentation update**

```bash
git commit -m "docs: Notion chase fields added — Invoices DB updated"
```

---

## Task 2: Chase Letter PDF Templates

**Files:**
- Create: `n8n/templates/chase-letter-template.html` (Stages 3 and 4)
- Create: `n8n/templates/final-notice-template.html` (Stage 5 — recorded delivery)

- [ ] **Step 1: Create chase-letter-template.html**

Used for Stage 3 (firm) and Stage 4 (formal demand). The `{{stage_tone}}` field and `{{body_text}}` are rendered differently per stage by the n8n node before calling PDF.co.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { font-family: "Times New Roman", serif; font-size: 11pt; color: #1a1a1a; padding: 60px; line-height: 1.6; }
.letterhead { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 30px; }
.contractor-name { font-size: 14pt; font-weight: bold; }
.contractor-meta { font-size: 9.5pt; color: #444; margin-top: 4px; }
.date-ref { display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 10pt; }
.client-address { margin-bottom: 24px; }
.subject { font-weight: bold; margin-bottom: 20px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
.body-text { margin-bottom: 20px; }
.payment-options { background: #f5f5f5; padding: 14px; margin: 20px 0; border-left: 3px solid #1a1a1a; }
.signoff { margin-top: 30px; }
.footer { margin-top: 40px; font-size: 8.5pt; color: #888; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>

<div class="letterhead">
  <div class="contractor-name">{{contractor_name}}</div>
  <div class="contractor-meta">
    {{contractor_address_line1}}, {{contractor_address_line2}}<br>
    Tel: {{contractor_phone}} | Email: {{contractor_email}}<br>
    VAT No: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}
  </div>
</div>

<div class="date-ref">
  <div>{{letter_date}}</div>
  <div><strong>Ref:</strong> {{invoice_number}}</div>
</div>

<div class="client-address">
  {{client_name}}<br>
  {{client_address}}
</div>

<div class="subject">Re: Outstanding Invoice — €{{balance_due}}</div>

<div class="body-text">{{body_text}}</div>

<div class="payment-options">
  <strong>Payment options:</strong><br>
  Online: <strong>{{stripe_link}}</strong><br>
  Bank transfer: IBAN {{iban}} / BIC {{bic}} / Ref: {{invoice_number}}<br>
  Cash: Contact us to arrange.
</div>

<p>If you have already made payment, please accept our thanks and disregard this letter.</p>

<div class="signoff">
  <p>Yours sincerely,</p>
  <br><br>
  <p><strong>{{contractor_name}}</strong><br>
  {{contractor_phone}} | {{contractor_email}}</p>
</div>

<div class="footer">
  {{contractor_name}} | VAT Reg: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}
</div>

</body>
</html>
```

Stage 3 `body_text` (firm):
```
We write to you regarding invoice {{invoice_number}} dated {{invoice_date}} for works completed at {{site_address}}, which remains outstanding and is now 14 days overdue.

We respectfully ask that you arrange payment of €{{balance_due}} within 7 days of this letter. Should you have any queries regarding this invoice, please do not hesitate to contact us.
```

Stage 4 `body_text` (formal demand):
```
We write further to our previous correspondence regarding invoice {{invoice_number}} dated {{invoice_date}} for works at {{site_address}}. This invoice, for the sum of €{{balance_due}}, remains outstanding and is now 21 days overdue.

This is a formal demand for payment of the above amount within 7 days of the date of this letter. We strongly encourage you to settle this matter to avoid further action.
```

- [ ] **Step 2: Create final-notice-template.html**

Stage 5 — recorded delivery. Stronger legal language. Includes dates of prior correspondence.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
body { font-family: "Times New Roman", serif; font-size: 11pt; color: #1a1a1a; padding: 60px; line-height: 1.6; }
.letterhead { border-bottom: 2px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 30px; }
.contractor-name { font-size: 14pt; font-weight: bold; }
.contractor-meta { font-size: 9.5pt; color: #444; margin-top: 4px; }
.date-ref { display: flex; justify-content: space-between; margin-bottom: 24px; }
.client-address { margin-bottom: 24px; }
.final-header { font-size: 13pt; font-weight: bold; text-align: center; text-transform: uppercase; letter-spacing: 1px; border: 2px solid #1a1a1a; padding: 8px; margin-bottom: 24px; }
.body-text { margin-bottom: 16px; }
.payment-box { background: #fff3f3; border: 1px solid #cc0000; padding: 14px; margin: 20px 0; }
.signoff { margin-top: 30px; }
.footer { margin-top: 40px; font-size: 8.5pt; color: #888; border-top: 1px solid #ccc; padding-top: 10px; }
</style>
</head>
<body>

<div class="letterhead">
  <div class="contractor-name">{{contractor_name}}</div>
  <div class="contractor-meta">
    {{contractor_address_line1}}, {{contractor_address_line2}}<br>
    Tel: {{contractor_phone}} | Email: {{contractor_email}}<br>
    VAT No: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}
  </div>
</div>

<div class="date-ref">
  <div>{{letter_date}}</div>
  <div><strong>Ref:</strong> {{invoice_number}} — FINAL DEMAND</div>
</div>

<div class="client-address">
  {{client_name}}<br>
  {{client_address}}
</div>

<div class="final-header">Notice of Final Demand — Debt Recovery</div>

<div class="body-text">
  <p>This is a formal final demand for payment of <strong>€{{balance_due}}</strong> outstanding under invoice {{invoice_number}} dated {{invoice_date}}, issued for works completed at {{site_address}}.</p>

  <p>Despite previous correspondence on the following dates:</p>
  <ul>
    <li>{{reminder_1_date}} — Email reminder</li>
    <li>{{reminder_2_date}} — Email reminder</li>
    <li>{{reminder_3_date}} — Written notice (posted)</li>
    <li>{{reminder_4_date}} — Formal demand (posted)</li>
  </ul>
  <p>This invoice remains unpaid {{days_overdue}} days after the due date.</p>
</div>

<div class="payment-box">
  <strong>Payment of €{{balance_due}} is required within 7 days of this letter.</strong><br><br>
  Failure to make payment within this period will result in this matter being referred for formal debt recovery proceedings. Such proceedings may result in additional costs being sought against you under applicable Irish law.<br><br>
  Online: {{stripe_link}}<br>
  Bank transfer: IBAN {{iban}} / BIC {{bic}} / Ref: {{invoice_number}}
</div>

<p>This letter is sent by recorded delivery. Receipt is being tracked.</p>

<div class="signoff">
  <p>Yours faithfully,</p>
  <br><br>
  <p><strong>{{contractor_name}}</strong><br>
  {{contractor_phone}} | {{contractor_email}}</p>
</div>

<div class="footer">
  {{contractor_name}} | VAT Reg: {{contractor_vat_number}} | {{contractor_reg_label}}: {{contractor_reg_number}}<br>
  <em>Note: This letter does not constitute a legal threat of criminal proceedings. Civil debt recovery proceedings are a matter of civil law.</em>
</div>

</body>
</html>
```

- [ ] **Step 3: Commit templates**

```bash
git add n8n/templates/chase-letter-template.html n8n/templates/final-notice-template.html
git commit -m "feat: chase letter and final notice PDF templates for PostGrid postal mail"
```

---

## Task 3: Claude System Prompt v4 — Chase Control Intents

**Files:**
- Create: `prompts/system-prompt-v4.md`

- [ ] **Step 1: Write test cases before prompt change**

Create `docs/N8N_PINNED_TEST_DATA_ADDON3.md` with:

```
Test A — chase_stop:
Transcript: "Stop chasing Murphy for that invoice."
Expected: { "type": "chase_stop", "confidence": 0.93, "customer_name": "Murphy", "address_hint": null }

Test B — chase_pause:
Transcript: "Pause chasing Brennan for a week — I'm talking to him."
Expected: { "type": "chase_pause", "confidence": 0.90, "customer_name": "Brennan", "address_hint": null, "pause_days": 7 }

Test C — chase_now:
Transcript: "Chase Murphy now — send the next reminder immediately."
Expected: { "type": "chase_now", "confidence": 0.91, "customer_name": "Murphy", "address_hint": null }

Test D — balance_query:
Transcript: "What does Murphy owe me?"
Expected: { "type": "balance_query", "confidence": 0.94, "customer_name": "Murphy", "address_hint": null }

Test E — chase_final:
Transcript: "Send Murphy a final notice."
Expected: { "type": "chase_final", "confidence": 0.92, "customer_name": "Murphy", "address_hint": null }
```

Run against v3 prompt — confirm all fail (intents not recognised). Record results.

- [ ] **Step 2: Write v4 additions**

Copy `prompts/system-prompt-v3.md` → `prompts/system-prompt-v4.md`. Add:

```
chase_stop: Contractor wants to permanently stop automated chasing for a client's invoice.
Signals: "stop chasing", "leave it", "forget the invoice", "don't send any more reminders"
Fields: customer_name, address_hint (optional)
Confirmation: "Chasing stopped for {{ customer }}. No further automated reminders will be sent."

chase_pause: Contractor wants to temporarily pause chasing.
Signals: "pause chasing", "hold off", "give them a week", "I'm talking to them"
Fields: customer_name, address_hint, pause_days (default 7 if not stated)
Confirmation: "Chasing paused for {{ customer }} for {{ days }} days. Will resume on [date]."

chase_now: Contractor wants to send the next chase message immediately.
Signals: "chase now", "send the next reminder", "chase them today"
Fields: customer_name, address_hint
Confirmation: "Sending the next chase message for {{ customer }} now."

balance_query: Contractor asks what a client owes.
Signals: "what does [name] owe", "what's outstanding for [name]", "how much does [name] owe me"
Fields: customer_name, address_hint (optional)
Confirmation: (generated dynamically from Notion lookup — see handler)

chase_final: Contractor wants to jump to Stage 5 final notice immediately.
Signals: "send a final notice", "send the final demand", "final warning"
Fields: customer_name, address_hint
Confirmation: "Sending final notice to {{ customer }} now — this is Stage 5 (recorded delivery)."
```

- [ ] **Step 3: Run all 5 test cases against v4 prompt**

Send each transcript to Claude API with v4 system prompt. Verify all 5 intents extracted correctly with confidence ≥ 0.88.

- [ ] **Step 4: Run regression test**

Send Scenario 1–6 from `docs/N8N_PINNED_TEST_DATA.md` against v4 prompt. All must still pass.

- [ ] **Step 5: Commit**

```bash
git add prompts/system-prompt-v4.md docs/N8N_PINNED_TEST_DATA_ADDON3.md
git commit -m "feat: system prompt v4 — add 5 chase control intents"
```

---

## Task 4: PostGrid Letter Sub-Workflow

**In n8n:** Create a new sub-workflow named `sub-wf-postgrid-letter`.

- [ ] **Step 1: Write expected input/output**

Input:
```json
{
  "letter_html": "<full rendered HTML>",
  "client_name": "Mrs Murphy",
  "client_address_line1": "14 Shantalla Road",
  "client_address_city": "Galway",
  "client_address_country": "IE",
  "client_address_postcode": "H91 AB12",
  "contractor_name": "Joe Brennan Plumbing",
  "contractor_address_line1": "5 Prospect Hill",
  "contractor_address_city": "Galway",
  "contractor_address_country": "IE",
  "recorded_delivery": false,
  "invoice_number": "INV-007"
}
```

Expected output:
```json
{
  "postgrid_letter_id": "letter_abc123xyz",
  "tracking_number": null,
  "status": "ready",
  "estimated_delivery": "2026-05-20"
}
```
(For recorded delivery: `tracking_number` will be the An Post tracking reference)

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Execute: PostGrid Submit Letter`
```
Type: HTTP Request
Method: POST
URL: https://api.postgrid.com/print-mail/v1/letters
Headers:
  x-api-key: {{ $vars.POSTGRID_API_KEY }}
  Content-Type: application/json
Body (JSON):
{
  "html": "{{ $json.letter_html }}",
  "to": {
    "name": "{{ $json.client_name }}",
    "addressLine1": "{{ $json.client_address_line1 }}",
    "city": "{{ $json.client_address_city }}",
    "country": "{{ $json.client_address_country }}",
    "postalOrZip": "{{ $json.client_address_postcode }}"
  },
  "from": {
    "name": "{{ $json.contractor_name }}",
    "addressLine1": "{{ $json.contractor_address_line1 }}",
    "city": "{{ $json.contractor_address_city }}",
    "country": "{{ $json.contractor_address_country }}"
  },
  "colour": false,
  "doubleSided": false,
  "express": false,
  "tracked": "{{ $json.recorded_delivery }}"
}
On error: Retry × 2. On final failure: throw error to parent.
```

Node 2 — `Extract: Letter Details`
```
Type: Set
  postgrid_letter_id: {{ $json.id }}
  tracking_number: {{ $json.trackingNumber || null }}
  status: {{ $json.status }}
  estimated_delivery: {{ $json.expectedDeliveryDate || null }}
```

- [ ] **Step 3: Test with PostGrid test mode**

PostGrid provides a test API key that simulates letter creation without posting. Use `x-api-key: TEST_POSTGRID_KEY`.

Send a test request. Expected: response with `id` starting with `letter_`, status = `ready`. No actual mail sent.

- [ ] **Step 4: Test recorded delivery path**

Send with `"tracked": true`. Expected: `tracking_number` is populated in the response.

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/sub-wf-postgrid-letter.json
git commit -m "feat: PostGrid letter posting sub-workflow — supports recorded delivery"
```

---

## Task 5: Daily 8am Chase Trigger Workflow

**In n8n:** Create a new scheduled workflow named `daily-chase-trigger`.

This workflow runs every day at 08:00 Irish time. It finds all overdue, open invoices and processes each one.

- [ ] **Step 1: Write expected query and processing logic**

Query: Invoices where:
- Status IN ["Sent", "Part Paid"]
- Due Date < today
- Chase Enabled = true
- Chase Paused = false (OR Chase Pause Resumes < today)

For each invoice found: call `sub-wf-chase-invoice`.

- [ ] **Step 2: Build the workflow nodes**

Node 1 — `Trigger: Schedule`
```
Type: Schedule Trigger
Cron: 0 8 * * * (every day at 08:00)
Timezone: Europe/Dublin
```

Node 2 — `Query: Notion — Overdue Open Invoices`
```
Type: HTTP Request
Method: POST
URL: https://api.notion.com/v1/databases/3a435e9fbe0e444890b9acc6d887fdef/query
Body:
{
  "filter": {
    "and": [
      { "property": "Status", "select": { "is_not_empty": true } },
      { "property": "Due Date", "date": { "before": "{{ new Date().toISOString().split('T')[0] }}" } },
      { "property": "Chase Enabled", "checkbox": { "equals": true } },
      { "property": "Chase Paused", "checkbox": { "equals": false } }
    ]
  }
}
```

Note: Notion does not natively support "OR Chase Pause Resumes < today" in a single filter. After fetching, apply a Code node to additionally filter out invoices where `Chase Pause Resumes` date is in the future.

Node 3 — `Filter: Remove Still-Paused Invoices`
```
Type: Code (JavaScript)
const today = new Date().toISOString().split('T')[0];
const results = $input.all();
return results.filter(item => {
  const resumeDate = item.json.properties['Chase Pause Resumes']?.date?.start;
  return !resumeDate || resumeDate <= today;
});
```

Node 4 — `Loop: Over Each Overdue Invoice`
```
Type: Loop Over Items
For each invoice: call sub-wf-chase-invoice
```

Node 5 — `Call: sub-wf-chase-invoice`
```
Type: Execute Sub-workflow
Pass: full invoice page properties + contractor mapping data
```

- [ ] **Step 3: Test the daily trigger**

Set schedule temporarily to run every 2 minutes for testing. Create a test invoice in Notion with Status=Sent, Due Date=yesterday, Chase Enabled=true. Trigger the workflow. Verify it picks up the test invoice and calls the chase sub-workflow.

Reset schedule to daily after testing.

- [ ] **Step 4: Verify Notion rate limit compliance**

If 10+ invoices are returned, the loop will make multiple Notion calls. Add a 350ms delay between Loop iterations to stay within Notion's 3 req/sec limit.

```
Add a Wait node (350ms) inside the loop between each invoice processing call.
```

- [ ] **Step 5: Export and commit**

```bash
git add n8n/workflows/daily-chase-trigger.json
git commit -m "feat: daily 8am chase trigger — queries overdue invoices, processes each via sub-workflow"
```

---

## Task 6: Per-Invoice Chase Sub-Workflow

**In n8n:** Create sub-workflow named `sub-wf-chase-invoice`.

This is the core logic: given an invoice, determine the current chase stage, send the appropriate message, and advance the stage.

- [ ] **Step 1: Write the chase stage schedule and body text**

| Stage | Days overdue | Channel | interval_days |
|---|---|---|---|
| 0 → 1 | Due + 1 | Email only | 1 |
| 1 → 2 | Due + 7 | Email only | 6 |
| 2 → 3 | Due + 14 | Email + PostGrid letter | 7 |
| 3 → 4 | Due + 21 | Email + PostGrid letter | 7 |
| 4 → 5 | Due + 30 | Email + PostGrid recorded | 9 |
| 5 → 6 | Due + 37 | Contractor WhatsApp only | 7 |

- [ ] **Step 2: Build the sub-workflow nodes**

Node 1 — `Receive: Invoice Data`
Input: invoice properties + contractor mapping

Node 2 — `Compute: Current Stage and Whether to Chase`
```
Type: Code
const chaseStage = $json.invoice['Chase Stage'].number || 0;
const dueDate = new Date($json.invoice['Due Date'].date.start);
const today = new Date();
const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

const stageThresholds = [1, 7, 14, 21, 30, 37];
let targetStage = 0;
for (let i = 0; i < stageThresholds.length; i++) {
  if (daysOverdue >= stageThresholds[i]) targetStage = i + 1;
}

// Only advance by one stage per day
const nextStage = chaseStage + 1;
const shouldChase = targetStage >= nextStage && nextStage <= 6;

return [{ json: { chaseStage, nextStage, daysOverdue, shouldChase, targetStage } }];
```

Node 3 — `Check: Should Chase?`
```
Type: IF
Condition: $json.shouldChase === true
False branch: stop (no action needed today)
```

Node 4 — `Route: By Next Stage`
```
Type: Switch
Branch on: $json.nextStage
Cases: 1, 2, 3, 4, 5, 6
```

**Stage 1 and 2 (Email only):**

Node 5a — `Send: Chase Email`
```
Type: HTTP Request (SendGrid)
Subject:
  Stage 1: "Invoice {{ invoice_number }} — Friendly Reminder"
  Stage 2: "Invoice {{ invoice_number }} — Payment Outstanding"
Body (HTML):
  Stage 1: "Hi {{ client_name }}, just a friendly reminder that invoice {{ invoice_number }} for €{{ balance_due }} was due {{ days_ago }} day(s) ago. Pay online: {{ stripe_link }}. IBAN: {{ iban }} / Ref: {{ invoice_number }}. If already paid, thank you — please ignore this."
  Stage 2: "Hi {{ client_name }}, invoice {{ invoice_number }} for €{{ balance_due }} remains outstanding. Please arrange payment this week. Pay online: {{ stripe_link }}. IBAN: {{ iban }} / Ref: {{ invoice_number }}."
To: {{ client_email }}
From: {{ contractor_email }}
On error: log to Chase Log, continue (email failure should not stop processing)
```

**Stage 3 and 4 (Email + PostGrid letter):**

Node 5b — `Send: Chase Email (Stage 3/4)` — same SendGrid as above, tone adjusted per stage

Node 6b — `Build: Letter HTML`
```
Type: Code
Render chase-letter-template.html with stage-appropriate body_text.
Stage 3 body: "We write regarding invoice {{ invoice_number }}... 14 days overdue... please arrange within 7 days."
Stage 4 body: "Further to previous correspondence... 21 days overdue... formal demand... within 7 days."
All merge fields populated from invoice + contractor data.
```

Node 7b — `Call: PostGrid Letter Sub-workflow`
```
Execute sub-wf-postgrid-letter with:
  letter_html: rendered HTML
  recorded_delivery: false
  client_name, client_address_*: from Customer record
  contractor_name, contractor_address_*: from Client Mapping
```

**Stage 5 (Email + Recorded delivery):**

Node 5c — `Send: Final Notice Email` — email with legal language
Node 6c — `Build: Final Notice Letter HTML` — render final-notice-template.html
Node 7c — `Call: PostGrid Letter Sub-workflow` with `recorded_delivery: true`
Node 8c — `Extract: Tracking Number` — from PostGrid response

**Stage 6 (Escalation — contractor only):**

Node 5d — `Send: Escalation WhatsApp to Contractor`
```
Twilio WhatsApp:
"⚠️ {{ invoice_number }} — {{ client_name }} — €{{ balance_due }}
Outstanding {{ days_overdue }} days. All 5 chase stages completed.
No further automated contact. You now decide: call the client, engage a debt collector, or apply to the Small Claims Court.
Full evidence trail in Notion: {{ invoice_notion_url }}"
```

Node 9 — `Update: Chase Log`
```
Type: Code
Build log entry: `{{ today }} {{ time }} — Stage {{ nextStage }} sent via {{ channel }} to {{ sent_to }}. {{ tracking_note }}`
Append to existing Chase Log text.
```

Node 10 — `Update: Notion Invoice — Chase Fields`
```
PATCH invoice page:
  Chase Stage: nextStage
  Last Chased Date: today
  Next Chase Date: today + interval_days[nextStage]
  Chase Log: {{ appended_log }}
  Letters Posted: (if stage 3/4/5) Letters Posted + 1
  Recorded Delivery Ref: (if stage 5) {{ tracking_number }}
```

- [ ] **Step 3: Test Stage 1**

Create test invoice: Status=Sent, Due Date=yesterday, Chase Stage=0. Trigger sub-workflow manually. Verify:
- Email sent to client
- Notion: Chase Stage=1, Last Chased Date=today, Chase Log has entry

- [ ] **Step 4: Test Stage 3 (email + letter)**

Set test invoice: Stage=2, Due Date=14 days ago. Trigger. Verify:
- Email sent
- PostGrid call made (check PostGrid dashboard)
- Letters Posted incremented to 1
- Chase Log has PostGrid ref

- [ ] **Step 5: Test Stage 5 (recorded delivery)**

Set test invoice: Stage=4, Due Date=30 days ago. Trigger. Verify:
- Email + PostGrid letter with `tracked: true`
- Recorded Delivery Ref populated in Notion

- [ ] **Step 6: Test Stage 6 (escalation)**

Set test invoice: Stage=5, Due Date=37 days ago. Trigger. Verify:
- WhatsApp sent to contractor phone (not to client)
- No PostGrid call
- Chase Stage=6 in Notion

- [ ] **Step 7: Test already-paid invoice is skipped**

Set test invoice Status=Paid. Run daily trigger. Verify this invoice is NOT returned in Notion query (due to Status filter).

- [ ] **Step 8: Export and commit**

```bash
git add n8n/workflows/sub-wf-chase-invoice.json
git commit -m "feat: per-invoice chase sub-workflow — 6 stages, email + PostGrid letters + contractor escalation"
```

---

## Task 7: Weekly Monday Cash Flow Summary

**In n8n:** Create a new scheduled workflow named `weekly-summary-trigger`.

- [ ] **Step 1: Write expected output message**

```
"Good morning. Outstanding invoices:
• Mrs Murphy — INV-007 — €2,503 — 21 days overdue (Stage 3 — letter posted)
• Joe Brennan — INV-009 — €840 — 3 days overdue (Stage 1)
Total outstanding: €3,343
Paid this month: €6,200
Paid this week: €1,450"
```

- [ ] **Step 2: Build the workflow nodes**

Node 1 — `Trigger: Schedule`
```
Cron: 0 8 * * 1 (every Monday at 08:00)
Timezone: Europe/Dublin
```

Node 2 — `Query: Outstanding Invoices`
```
Notion query: Invoices where Status IN [Sent, Part Paid]
Order by: Due Date ASC
```

Node 3 — `Query: Paid This Month`
```
Notion query: Invoices where Status = Paid AND Paid Date >= first day of current month
Sum Amount Paid.
```

Node 4 — `Query: Paid This Week`
```
Notion query: Invoices where Status = Paid AND Paid Date >= last Monday
Sum Amount Paid.
```

Node 5 — `Build: Summary Message`
```
Type: Code
const outstanding = $input.first().json.outstandingInvoices;
const paidMonth = $input.first().json.paidThisMonth;
const paidWeek = $input.first().json.paidThisWeek;

let msg = "Good morning. ";
if (outstanding.length === 0) {
  msg += "No outstanding invoices. ";
} else {
  msg += "Outstanding invoices:\n";
  outstanding.forEach(inv => {
    const stage = inv.properties['Chase Stage'].number;
    const stageLabel = ["Not started","Email sent","2nd email","Letter posted","2nd letter","Final notice","Escalated"][stage] || stage;
    const days = Math.floor((new Date() - new Date(inv.properties['Due Date'].date.start)) / 86400000);
    msg += `• ${inv.properties['Customer name']} — ${inv.properties['Invoice Number'].rich_text[0]?.plain_text} — €${inv.properties['Balance Due'].formula.number?.toFixed(2)} — ${days} days overdue (Stage ${stage} — ${stageLabel})\n`;
  });
  const total = outstanding.reduce((sum, i) => sum + (i.properties['Balance Due'].formula.number || 0), 0);
  msg += `Total outstanding: €${total.toFixed(2)}\n`;
}
msg += `Paid this month: €${paidMonth.toFixed(2)}\n`;
msg += `Paid this week: €${paidWeek.toFixed(2)}`;
return [{ json: { summary: msg } }];
```

Node 6 — `Send: WhatsApp to Each Active Contractor`
```
Twilio WhatsApp to contractor phone.
If multiple contractors: loop over Client Mapping rows, send each their own summary.
```

- [ ] **Step 3: Test**

Temporarily set schedule to 2 minutes. Verify WhatsApp message arrives with correct data. Verify contractors with no outstanding invoices get a clean "No outstanding invoices" message.

- [ ] **Step 4: Export and commit**

```bash
git add n8n/workflows/weekly-summary-trigger.json
git commit -m "feat: Monday 8am weekly cash flow summary — outstanding invoices + paid totals"
```

---

## Task 8: Chase Control Intent Handlers

**In n8n:** Add 5 new branches to the main workflow Switch node.

- [ ] **Step 1: chase_stop handler**

```
Fetch: Most recent open invoice for customer from Notion
Update: Chase Enabled = false
Confirm: "Chasing stopped for {{ customer }}. No further reminders will be sent."
If no open invoice: "No open invoice found for {{ customer }}."
```

- [ ] **Step 2: chase_pause handler**

```
Fetch: Most recent open invoice for customer
Compute: Pause Resumes = today + pause_days
Update: Chase Paused = true, Chase Pause Resumes = [date]
Confirm: "Chasing paused for {{ customer }} for {{ days }} days. Will resume on {{ date }}."
```

- [ ] **Step 3: chase_now handler**

```
Fetch: Most recent open invoice for customer
Call: sub-wf-chase-invoice with override_immediate=true (skip date threshold check, send next stage now)
Note: sub-wf-chase-invoice needs an `override_immediate` input flag that bypasses the date check.
Confirm: "Next chase message sent to {{ customer }} — Stage {{ nextStage }}."
```

- [ ] **Step 4: balance_query handler**

```
Fetch: All open invoices for customer from Notion
Build response: "{{ customer }} owes €{{ total }}: {{ list each invoice with number, amount, days overdue, chase stage }}"
SMS to contractor.
```

- [ ] **Step 5: chase_final handler**

```
Fetch: Most recent open invoice for customer
Set: Chase Stage = 4 (so sub-wf-chase-invoice will process it as Stage 5 on next run — or call immediately)
Call: sub-wf-chase-invoice with override_immediate=true and force_stage=5
Confirm: "Final notice sent to {{ customer }} by recorded delivery — Stage 5. Tracking ref will be in Notion when confirmed."
```

- [ ] **Step 6: Update Switch node**

Add all 5 new cases to the main Route by Intent Switch node. Verify no existing branches are affected.

- [ ] **Step 7: Test all 5 handlers**

Use pinned test data from `docs/N8N_PINNED_TEST_DATA_ADDON3.md`. Verify:
- chase_stop: Chase Enabled = false in Notion
- chase_pause: Chase Paused = true, Chase Pause Resumes set
- chase_now: next stage message sent immediately
- balance_query: correct balance returned in SMS
- chase_final: Stage 5 triggered, PostGrid called with tracked=true

- [ ] **Step 8: Export and commit**

```bash
git add n8n/workflows/chase-control-handlers.json
git commit -m "feat: 5 chase control intent handlers — stop, pause, now, balance, final"
```

---

## Task 9: End-to-End Integration Test

- [ ] **Step 1: Full chase cycle test (accelerated)**

1. Create test invoice: Status=Sent, Due Date=5 days ago, Chase Enabled=true, Chase Stage=0
2. Manually trigger daily chase trigger
3. Verify Stage 1 email sent, Chase Stage=1 in Notion, Chase Log entry created
4. Set Due Date to 10 days ago, manually trigger again
5. Verify Stage 2 email sent, Chase Stage=2, Chase Log updated
6. Set Due Date to 16 days ago, trigger
7. Verify Stage 3 email + PostGrid letter, Chase Stage=3, Letters Posted=1

- [ ] **Step 2: Pause and resume test**

1. Voice note: "Pause chasing Murphy"
2. Verify: Chase Paused=true in Notion
3. Trigger daily chase — confirm Murphy is NOT processed
4. Set Chase Pause Resumes to yesterday, trigger again
5. Confirm chase resumes (Stage advances)

- [ ] **Step 3: Payment stops chasing**

1. Log payment for Murphy (cash or Stripe webhook)
2. Verify Invoice Status = Paid
3. Trigger daily chase — confirm Murphy is NOT in the overdue query

- [ ] **Step 4: Legal trail export test**

1. Open a test invoice in Notion with Chase Log populated
2. Verify the Chase Log text field contains all timestamped entries
3. Confirm it can be copied and pasted as a clean evidence document

- [ ] **Step 5: Weekly summary test**

Manually trigger weekly summary workflow. Verify WhatsApp message accurately summarises all test invoices.

- [ ] **Step 6: Commit final test results**

```bash
git add docs/N8N_PINNED_TEST_DATA_ADDON3.md
git commit -m "docs: Add-on 3 integration test results — all chase scenarios passing"
```

---

*This plan requires Add-on 2 (Invoice Delivery) to be fully built first — the `Due Date` field populated by Add-on 2 is the trigger for all chase logic.*
