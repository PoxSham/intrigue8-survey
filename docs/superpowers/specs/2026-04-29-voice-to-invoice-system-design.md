# Voice-to-Invoice System Design

**Date:** 2026-04-29  
**Project:** Intrigue8 — Voice-to-Invoice  
**Status:** Approved, ready for implementation planning  
**Stack:** Twilio · OpenAI Whisper · Claude API · n8n · Notion

---

## Overview

An automated system that lets contractors log job activity — costs, labour, notes — via voice note or phone call, and converts that activity into organised Notion records and ready-to-send invoices. Intrigue8 operates the system; each contractor client gets their own isolated Notion workspace.

**Input channels (MVP):**
- WhatsApp voice notes or text via Twilio Sandbox (test) → Twilio BSP (production)
- Inbound phone call recorded via Twilio Voice

**Core pipeline:**  
Audio/text → Normalise → Transcribe (Whisper) → Extract (Claude) → Write (Notion) → Confirm (Twilio)

**Phase 2 (post-pilot, not in scope here):**
- Facebook Messenger input channel
- Voice-to-Quote feature (`quote_request` intent)
- `job_resume` intent

---

## Section 1: Architecture & Data Flow

### Entry Points

**WhatsApp webhook payload (from Twilio):**
```
From          → +353851111111 (E.164)
MessageType   → audio | text
MediaUrl0     → audio file URL (if voice note)
Body          → text string (if text message)
```

**Phone call webhook payload (from Twilio Voice):**  
Fires after recording completes.
```
From            → +353851111111 (E.164)
RecordingUrl    → URL of recorded call
RecordingDuration → seconds
```
Twilio is configured to play: *"Record your job update after the tone."* Contractor speaks, hangs up, recording fires to n8n.

---

### Pipeline Steps

```
[WhatsApp Webhook] ─┐
                    ├─► [① NORMALISE] ─► [② CLIENT LOOKUP] ─► [③ TRANSCRIBE?]
[Phone Webhook]  ───┘                                                  │
                                                                       ▼
                                                              [④ CLAUDE EXTRACT]
                                                                       │
                                                              [⑤ SPLIT INTENTS]
                                                                       │
                                                              [⑥ ROUTE BY TYPE]
                                                                       │
                                                         ┌─────────────┼─────────────┐
                                                   [intent handlers] [lookup sub-wf] [notion write]
                                                                       │
                                                              [⑦ COLLECT + CONFIRM]
                                                                       │
                                                              [Twilio send reply]
```

---

### Step Descriptions

**① Normalise**  
Produces a consistent payload regardless of input channel:
```
phone_number  → E.164 normalised (+353...)
content_type  → "audio" | "text"
content       → URL (audio) or string (text)
channel       → "whatsapp" | "phone"
timestamp     → ISO datetime (passed to Claude for date resolution)
```
Phone numbers are always normalised to E.164 here before any lookup. This prevents +353/08x format mismatches.

**② Client Lookup**  
Queries the Client Mapping table (Notion) using the normalised phone number.  
Returns: `client_id`, `notion_workspace_id`, `default_rate`, `default_margin`, `active`.  
- If phone not found → reply "This number isn't registered. Contact Intrigue8 to get set up." Halt.  
- If `active == false` → reply "This account is currently inactive. Contact Intrigue8." Halt.

**③ Transcribe (conditional)**  
Runs only if `content_type == "audio"`.  
POST audio file to OpenAI Whisper `/v1/audio/transcriptions`.  
Returns plain text. Text messages skip this step.  
This is a critical step — failure bubbles to error workflow, not silently skipped.

**④ Claude Extract**  
POST to Anthropic Claude API with:
- Full system prompt (Section 3)
- Transcribed or raw text
- Client defaults (rate, margin) injected into prompt
- Current timestamp for date resolution

Parse response using `###CONFIRMATION###` / `###END###` delimiters:
- `intents_json` — JSON array of intent objects
- `confirmation_text` — human-readable summary

**⑤ Split Intents**  
Loop Over Items in `intents_json`. Process each intent sequentially.

**⑥ Route by Type**  
Switch node branches by `intent.type`. See Section 4 for per-intent handlers.

**⑦ Collect + Send Confirmation**  
After all intents processed, merge confirmation strings into one message.  
- WhatsApp input → Twilio reply in same WhatsApp thread  
- Phone call input → Twilio SMS to caller's number

**Partial failure handling:**  
If any intent fails after retries, stop the loop. Send honest confirmation:  
*"Logged [X], but [Y] failed and has been queued for review."*  
`unknown` intents never block successful ones — they add one line:  
*"One part of your message wasn't clear and has been flagged for review."*

---

## Section 2: Notion Data Model

### Hierarchy

```
Intrigue8
└── Contractor (one Notion workspace per client)
    └── Customer: Murphy — 14 Shantalla Rd
        └── Job: MRP-SHA-01 Kitchen renovation
            ├── Costs
            ├── Labour
            └── Invoice
```

Each contractor workspace contains five databases: Customers, Jobs, Costs, Labour, Invoices.

---

### Customers Database

Unique key: **Name + Address combined**. Prevents duplicate records for common surnames.

| Field | Type | Notes |
|-------|------|-------|
| Display Name | Title | Auto-generated: "Murphy — 14 Shantalla Rd" |
| Customer Name | Text | Surname or full name |
| Address | Text | Full address |
| Phone | Text | Optional |
| Email | Text | Optional |
| Notes | Text | Any context |
| Total Jobs | Rollup | Count of linked jobs |
| Total Outstanding | Rollup | Sum of unpaid invoice totals |

---

### Jobs Database

| Field | Type | Notes |
|-------|------|-------|
| Job Code | Text | MRP-SHA-01 — generated on creation (internal reference, not required in voice notes) |
| Customer | Relation → Customers | |
| Description | Text | "Kitchen renovation" |
| Status | Select | Active / On Hold / Complete / Invoiced / Paid |
| Labour Rate | Number | €/hr — defaults to client's set rate |
| Profit Margin | Number | % — defaults to client's set margin |
| Start Date | Date | Auto-set on creation |
| End Date | Date | Set on invoice trigger |
| Notes | Text | Appended by `job_note` intent |

**Job code format:** First 3 of customer surname + first 3 of street name + sequential per customer.  
`Murphy, Shantalla → MRP-SHA-01`  
`Murphy, Tuam Road → MRP-TUM-01`  
Job codes are scoped to each contractor's workspace — no cross-client collision risk.  
**Contractors never need to speak job codes.** They are a visual reference in Notion only. Voice matching uses name + address hint.

---

### Costs Database

| Field | Type | Notes |
|-------|------|-------|
| Job | Relation → Jobs | |
| Description | Text | Contractor's exact wording preserved |
| Amount | Number | € |
| Date | Date | Auto-set or extracted |
| Channel | Select | WhatsApp / Phone / Text |

---

### Labour Database

| Field | Type | Notes |
|-------|------|-------|
| Job | Relation → Jobs | |
| Date | Date | ISO date — resolved by Claude using message timestamp |
| Hours | Number | Normalised: "half a day" → 4.0, "all day" → 8.0 |
| Rate | Number | €/hr — pulled from Job |
| Amount | Formula | Hours × Rate |
| Channel | Select | WhatsApp / Phone / Text |

---

### Invoices Database

| Field | Type | Notes |
|-------|------|-------|
| Job | Relation → Jobs | |
| Invoice Number | Text | Auto-generated (INV-001) |
| Total Labour | Rollup | Sum of Labour.Amount for this job |
| Total Materials | Rollup | Sum of Costs.Amount for this job |
| Subtotal | Formula | Labour + Materials |
| Profit Margin % | Number | From Job |
| Margin Amount | Formula | Subtotal × Margin % |
| Invoice Total | Formula | Subtotal + Margin Amount |
| VAT Exempt | Checkbox | Set if contractor says "no VAT on this one" |
| Amount Paid | Number | Updated by `payment_received` intents |
| Balance | Formula | Invoice Total − Amount Paid |
| Status | Select | Draft / Sent / Part Paid / Paid |
| Sent Date | Date | |
| Paid Date | Date | |

---

### Client Mapping Table (Notion — managed by Intrigue8)

| Field | Notes |
|-------|-------|
| Phone Number | E.164 format — lookup key |
| Client Name | Contractor's business name |
| Notion Workspace ID | Where to write their data |
| Default Labour Rate | €/hr — used when not specified |
| Default Profit Margin | % — used when not specified |
| Active | true/false — false halts workflow with a message |

Adding a row here is the entire onboarding operation.

---

### New Customer / Job Flow

**If contractor mentions unknown name+address:**  
System replies: *"I don't have [Name] at [Location] on file. To create them, send a new job note with full details — name, full address, and job description."*

**New job trigger (explicit):**  
*"New job for Mrs Murphy, 14 Shantalla Road, kitchen renovation"*  
→ Create Customer (if not exists) → Create Job → Reply with confirmation and job code for reference.

**New job trigger (implicit — unknown customer found while logging):**  
System asks to confirm before creating anything.

---

## Section 3: Claude Prompt Design

### What Claude receives per call

1. System prompt (below)
2. Transcribed or raw text
3. Client defaults: `{"default_rate": 60, "default_margin": 25}`
4. Current timestamp: `"2026-04-29T14:30:00Z"`

---

### System prompt (summary)

> You are a job data extraction assistant for Irish tradespeople using a contractor management system.
>
> Process the transcribed voice note or text message and extract all job management intents. A single message may contain more than one intent (e.g. labour and costs in one breath). Always return a JSON array of intents, even if there is only one.
>
> The JSON is the source of truth. The confirmation text must reflect the JSON exactly — never introduce values not present in the JSON.
>
> Currency normalisation: "fifty euro", "€50", "50 quid" → `50.00`. Ireland only.  
> Date resolution: Use the provided timestamp to resolve "today", "yesterday", "last Thursday" → ISO date `YYYY-MM-DD`. If genuinely ambiguous, return `null`.  
> Description preservation: Keep contractor's exact wording. Do not expand or normalise item names.  
> Confidence: If confidence on any intent falls below 0.7, return `unknown` for that intent.  
> If no job-management intent is detected, return a single `unknown` intent with a brief `reason`.

---

### Intent taxonomy

| Intent | Triggered by |
|--------|-------------|
| `job_setup` | New job, new customer, starting a job |
| `cost_log` | Materials, expenses, purchases |
| `labour_log` | Hours worked, time on site |
| `invoice_trigger` | Job done, send invoice, final bill |
| `payment_received` | Client paid, deposit received |
| `job_note` | Site notes, reminders, access issues |
| `job_pause` | Job on hold, waiting on materials/permissions |
| `unknown` | Unclassifiable or low confidence |
| `quote_request` | *(Phase 2 — not in MVP)* |

---

### JSON schema per intent

**`job_setup`**
```json
{
  "type": "job_setup",
  "confidence": 0.96,
  "customer_name": "Murphy",
  "address": "14 Shantalla Road, Galway",
  "job_description": "Kitchen renovation",
  "estimated_duration": null,
  "labour_rate_override": null,
  "margin_override": null
}
```

**`cost_log`**
```json
{
  "type": "cost_log",
  "confidence": 0.94,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "items": [
    { "description": "2 buckets paint", "amount": 50.00 },
    { "description": "brushes", "amount": 40.00 },
    { "description": "masking tape", "amount": 10.00 }
  ],
  "total": 100.00
}
```

**`labour_log`**
```json
{
  "type": "labour_log",
  "confidence": 0.95,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "hours": 6.0,
  "date": "2026-04-29"
}
```

**`invoice_trigger`**
```json
{
  "type": "invoice_trigger",
  "confidence": 0.97,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "vat_exempt": false,
  "notes": null
}
```

**`payment_received`**
```json
{
  "type": "payment_received",
  "confidence": 0.95,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "amount": 500.00,
  "date": "2026-04-25",
  "notes": "deposit"
}
```

**`job_note`**
```json
{
  "type": "job_note",
  "confidence": 0.91,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "note": "Access issue — need permission from next door before Wednesday"
}
```

**`job_pause`**
```json
{
  "type": "job_pause",
  "confidence": 0.93,
  "customer_name": "Murphy",
  "address_hint": "Shantalla",
  "reason": "Waiting on tiles"
}
```

**`unknown`**
```json
{
  "type": "unknown",
  "confidence": 0.0,
  "raw_text": "Grand so, talk later",
  "reason": "No job management intent detected"
}
```

---

### Response format

```
[JSON array of intents]
###CONFIRMATION###
[Human-readable summary for the contractor]
###END###
```

n8n splits on the delimiters. JSON drives the system. Confirmation is sent to the contractor.

---

### Edge case table

| Input | Claude output |
|-------|--------------|
| "half a day" | `hours: 4.0` |
| "all day" | `hours: 8.0` |
| "a couple of hours" / "few hours" | `hours: null` (flagged uncertain) |
| "today" / "yesterday" | Resolved to ISO date using timestamp |
| "last Thursday" | Resolved to ISO date |
| Date genuinely ambiguous | `date: null` |
| "fifty euro" / "€50" / "50 quid" | `amount: 50.00` |
| "€70 an hour for this one" | `labour_rate_override: 70.00` |
| "no VAT on this one" | `vat_exempt: true` |
| "Mrs Murphy" / "the Murphy job" | `customer_name: "Murphy"` |
| All candidate confidences < 0.7 | Single `unknown` intent with `reason` |

---

## Section 4: n8n Workflow Structure

### Node-by-node breakdown

**① Trigger nodes (two, same pipeline)**
- WhatsApp: Twilio webhook — fires on incoming message
- Phone: Twilio Voice webhook — fires after recording completes

**② Normalise (Set node)**  
Extract `phone_number` (E.164), `content_type`, `content`, `channel`, `timestamp`.

**③ Client Lookup (HTTP Request → Notion)**  
Query Client Mapping table by phone number.  
- Not found → send registration message, halt  
- `active == false` → send inactive message, halt  
- Found → pass `client_id`, `notion_workspace_id`, `default_rate`, `default_margin` to next step

**④ Transcribe (HTTP Request → OpenAI Whisper)**  
Conditional on `content_type == "audio"`. Critical step — failure bubbles to error workflow.

**⑤ Claude Extract (HTTP Request → Anthropic)**  
POST with system prompt, text, client defaults, timestamp. Parse delimited response.

**⑥ Split Intents (Loop Over Items)**  
Iterate over intents array sequentially.

**⑦ Route (Switch node)**  
Branch by `intent.type`.

**⑧ Customer + Job Lookup (reusable sub-workflow)**  
Called from every intent handler branch. Returns:
```json
{
  "customer_match_status": "single | none | multiple",
  "customer_id": "cust-123",
  "job_match_status": "single | none | multiple",
  "job_id": "job-456"
}
```
Each handler branches on these flags before writing to Notion.

**Intent handlers by type:**

| Intent | Notion operation |
|--------|-----------------|
| `job_setup` | Create Customer (if new) → Create Job → generate job code |
| `cost_log` | Find Job → Create Cost page |
| `labour_log` | Find Job → Create Labour page |
| `invoice_trigger` | Find Job → sum Costs + Labour rollups → Create Invoice draft → set Job status to Invoiced |
| `payment_received` | Find Invoice → update Amount Paid → update Status |
| `job_note` | Find Job → append to Notes field |
| `job_pause` | Find Job → set Status to On Hold |
| `unknown` | Write to Dead Letter Queue (see below) |

**⑨ Collect + Send Confirmation (Twilio)**  
Merge confirmation strings from all processed intents.  
WhatsApp → reply in thread. Phone → SMS to caller.

---

### Error handling

**Retry logic:**  
All three critical external calls (Whisper, Claude, Notion) have retry with exponential backoff. These are critical steps — no `Continue on Fail`.

**Notion rate limit:**  
3 req/sec per integration (~2,700/15 min). Respect `Retry-After` on 429 responses. Keep Notion calls minimal per intent — one create + one update where possible rather than many small calls.

**Error workflow:**  
n8n's built-in Error Trigger catches any unhandled failure. Sends notification to Intrigue8 with failed payload attached. No silent loss.

**Dead Letter Queue:**  
A Notion database (managed by Intrigue8) where the error workflow writes:
- Failed payload
- Failure reason
- Timestamp
- Client ID
Searchable history of all failures. `unknown` intents also write here.

**Partial loop failure:**  
If one intent fails after retries, halt the loop. Send confirmation:  
*"Logged [successful intents], but [failed intent] failed and has been queued for review."*

---

### Client Mapping table (Notion)

| Phone Number | Client Name | Workspace ID | Default Rate | Default Margin | Active |
|---|---|---|---|---|---|
| +353851111111 | Joe the Plumber | ws-abc-123 | 60 | 25 | true |
| +353862222222 | Mary's Cleaning | ws-def-456 | 35 | 20 | true |

**Onboarding a new client = adding one row.**

---

## Database Decision: Notion vs Supabase

**MVP decision: Notion.**  
Notion provides the contractor-facing UI for free — no frontend development needed. Each contractor opens their workspace and sees live job data. This is weeks of saved development time before the first pilot.

**Migrate to Supabase when:** 10+ active clients, rate limit (3 req/sec) causing delays, or rollup/formula reliability becomes an issue.

**Migration path:** Only the Notion write/read nodes in n8n need to change. The Claude logic, Whisper transcription, Twilio routing, and intent handling are all database-agnostic. The migration is a data layer swap, not a rebuild.

**Hybrid option (future):** n8n writes to both Supabase (reliable backend) and Notion (client view). Best of both worlds but overkill pre-scale.

---

## Phase 2 Features (out of MVP scope)

- **`quote_request` intent** — contractor on-site quotes a job by voice, system generates a formal quote document; quote converts to a Job on acceptance
- **`job_resume` intent** — complement to `job_pause`
- **Facebook Messenger input channel** — one additional trigger node, same pipeline
- **Production WhatsApp via Twilio BSP** — credential swap on the existing WhatsApp trigger, no workflow changes

---

## Cost Estimates

| Component | Cost |
|-----------|------|
| n8n Cloud | ~€20/month |
| Twilio (WhatsApp + Voice) | ~€1–5/month per client |
| OpenAI Whisper | ~€0.003 per 30-sec note |
| Claude API (Haiku) | ~€0.01 per extraction |
| Notion | Free (client workspaces) |
| **Per-client total** | **~€0.40–0.70/month at 30 notes** |

Against €250/month revenue: infrastructure is <0.3% of revenue per client.
