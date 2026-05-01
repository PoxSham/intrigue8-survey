# n8n WhatsApp Integration Configuration Guide

**Workflow:** Voice-to-Invoice Webhook  
**Workflow URL:** https://pxckxts.app.n8n.cloud/workflow/zrGfO5n2M2cHhQhx  
**Date:** 2026-04-30

## Overview

This document outlines the WhatsApp integration configuration to add parallel WhatsApp support (messages, voice notes, calls) to the existing Twilio Voice webhook pipeline. The system will use the same intent extraction and routing logic for both channels.

---

## Current Pipeline Architecture

```
Twilio Voice Webhook
        ↓
Extract Transcribed Data
        ↓
Extract Intent with Claude
        ↓
Route by Intent (job_setup, cost_log, labour_log, invoice_trigger, payment_received, unknown)
        ↓
[Intent-specific handlers + Notion outputs]
```

---

## WhatsApp Integration Architecture (Proposed)

```
┌─────────────────────────────────────────────────────────┐
│                   Incoming Channels                      │
├──────────────────────┬──────────────────────────────────┤
│  Twilio Voice Webhook│     WhatsApp Webhook             │
│  (Path: "voice")     │     (Path: "whatsapp")           │
└──────────────┬───────┴──────────────┬───────────────────┘
               │                      │
               └──────────┬───────────┘
                          ↓
            Extract Intent with Claude
            (unified intent extraction)
                          ↓
            Route by Intent
            (job_setup, cost_log, labour_log, 
             invoice_trigger, payment_received, unknown)
                          ↓
        ┌────────┬────────┬────────┬────────┬────────┐
        ↓        ↓        ↓        ↓        ↓        ↓
     job_   cost_   labour_  invoice_  payment_  unknown
     setup   log      log     trigger   received   error
        │        │        │        │        │        │
        └────────┴────────┴────────┴────────┴────────┘
                          ↓
            Send Response via Original Channel
            (Twilio Voice or WhatsApp)
                          ↓
          [Notion Database Outputs + Confirmations]
```

---

## Node Configuration Details

### 1. WhatsApp Webhook Trigger Node

**Node Type:** Webhook  
**Node Name:** "WhatsApp Webhook"  

**Configuration:**
- **Path:** `whatsapp`
- **HTTP Method:** POST
- **Authentication:** None
- **Response Code:** 200

**Expected Input Format (from Twilio WhatsApp Sandbox):**

```json
{
  "MessageSid": "SM1234567890abcdef",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+1234567890",
  "Body": "new job for John Smith plumbing repair",
  "NumMedia": "0",
  "MediaUrl0": null,
  "MessageType": "text",
  "SmsStatus": "received",
  "NumSegments": "1"
}
```

**Webhook URL Pattern:**
```
https://pxckxts.app.n8n.cloud/webhook/whatsapp
```

**Connection:**
- Connect output to: **"Extract Intent with Claude"** node (same as Twilio voice)

---

### 2. Intent Extraction Node (Modified)

**Node Type:** OpenAI/Claude (depending on current setup)  
**Node Name:** "Extract Intent with Claude"

**Current Intent Categories:**
- `job_setup` — New job creation (e.g., "I have a new job for John Smith")
- `cost_log` — Cost entry (e.g., "Material cost was €45.50")
- `labour_log` — Labour time entry (e.g., "John worked 2 hours")
- `invoice_trigger` — Request to generate invoice (e.g., "Create invoice")
- `payment_received` — Payment notification (e.g., "Payment received €500")
- `unknown` — Unrecognized intent

**Prompt Modification Required:**

Update the Claude prompt to handle WhatsApp context:

```
You are an intent classifier for a contractor invoice system.
Classify incoming messages as one of these intents:
- job_setup: Creating a new job
- cost_log: Logging a material cost
- labour_log: Logging labour hours
- invoice_trigger: Requesting invoice generation
- payment_received: Confirming payment
- unknown: Cannot classify

Source can be:
1. Twilio Voice: Transcribed voice messages
2. WhatsApp: Text messages or voice note transcripts

Extract intent and relevant details. For WhatsApp voice notes, they will be pre-transcribed.
```

**Input Mapping:**

```javascript
// Handle both voice transcripts and WhatsApp messages
{
  "message": {
    "voice": "{{ $node['Twilio Voice Webhook'].json.Speech }}",  // From Twilio
    "whatsapp_text": "{{ $node['WhatsApp Webhook'].json.Body }}",  // From WhatsApp
    "whatsapp_voice_url": "{{ $node['WhatsApp Webhook'].json.MediaUrl0 }}"  // Voice note
  },
  "source": "{{ $node['WhatsApp Webhook'].json ? 'whatsapp' : 'twilio' }}"
}
```

---

### 3. Route by Intent Node

**Node Type:** Switch/Conditional Routing  
**Node Name:** "Route by Intent"

**Routes:**

| Intent | Target Node | Action |
|--------|------------|--------|
| `job_setup` | Job Setup Handler | Create Notion job record |
| `cost_log` | Cost Log Handler | Add cost to Notion |
| `labour_log` | Labour Log Handler | Add hours to Notion |
| `invoice_trigger` | Invoice Generator | Generate invoice in Notion |
| `payment_received` | Payment Handler | Update payment status |
| `unknown` | Send WhatsApp Response | Error: "I didn't understand" |

---

### 4. WhatsApp Response Handler Node

**Node Type:** HTTP Request (or Twilio WhatsApp node if available)  
**Node Name:** "Send WhatsApp Response"

**Purpose:** Route response messages back to WhatsApp

**Configuration:**

**HTTP Request Method:**

```
POST https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages
```

**Authentication:**
- **Type:** Basic Auth
- **Username:** Your Twilio Account SID
- **Password:** Your Twilio Auth Token

**Body (URL-encoded form data):**

```
From=whatsapp:+1234567890
To={{ $node['WhatsApp Webhook'].json.From }}
Body={{ $node['Send WhatsApp Response'].json.message }}
```

**Response Messages by Intent:**

| Intent | Message Template |
|--------|------------------|
| `job_setup` | "Job created: {{job_name}} for {{client_name}}" |
| `cost_log` | "Cost logged: {{amount}} on {{date}}" |
| `labour_log` | "{{hours}} hours logged for {{worker}}" |
| `invoice_trigger` | "Invoice {{invoice_id}} created - check Notion" |
| `payment_received` | "Payment received: {{amount}} - updated" |
| `unknown` | "Sorry, I didn't understand that. Try: 'new job for [name]'" |

**Connection Points:**
- Connect from each intent handler output
- Also connect from "Route by Intent" unknown branch

---

### 5. Intent Handler Nodes (Existing - No Changes)

These nodes remain unchanged but should accept input from both Twilio and WhatsApp:

- **Job Setup Handler** → Notion job_records table
- **Cost Log Handler** → Notion costs table
- **Labour Log Handler** → Notion labour table
- **Invoice Generator** → Notion invoices table
- **Payment Handler** → Notion payments table

---

## Data Flow Mapping

### WhatsApp Text Message Flow

```
WhatsApp Message: "new job for John Smith plumbing repair"
        ↓
WhatsApp Webhook extracts: Body = "new job for John Smith plumbing repair"
        ↓
Extract Intent:
  Intent: "job_setup"
  Details: { job_name: "plumbing repair", worker: "John Smith" }
        ↓
Route to "Job Setup Handler"
        ↓
Create Notion record
        ↓
Send WhatsApp: "Job created: plumbing repair for John Smith"
```

### WhatsApp Voice Note Flow

```
WhatsApp Voice Note (audio file)
        ↓
[EXTERNAL] Twilio transcribes via webhook
        ↓
WhatsApp Webhook receives: Body = "<transcribed text>"
        ↓
[Same as text message flow from here]
```

**Note:** Voice note transcription requires Twilio Media URL callback configuration (handled separately).

---

## Configuration Checklist

### Prerequisites

- [ ] Twilio Account with WhatsApp Sandbox enabled
- [ ] WhatsApp Sandbox phone number (assigned by Twilio)
- [ ] Twilio Account SID
- [ ] Twilio Auth Token
- [ ] Claude API key (already configured in n8n)

### In n8n Workflow

1. **Add WhatsApp Webhook Node**
   - [ ] Create new "Webhook" trigger
   - [ ] Set Path to `whatsapp`
   - [ ] Set HTTP Method to `POST`
   - [ ] Set Authentication to `None`
   - [ ] Save webhook URL: Copy and use in Twilio setup

2. **Update Extract Intent Node**
   - [ ] Modify Claude prompt to mention WhatsApp context
   - [ ] Update input mapping to handle WhatsApp message format
   - [ ] Test with sample WhatsApp text

3. **Add WhatsApp Response Node**
   - [ ] Create HTTP Request node
   - [ ] Configure Twilio Basic Auth credentials
   - [ ] Set URL to Twilio Messages API endpoint
   - [ ] Map recipient from `From` field in webhook

4. **Connect Nodes**
   - [ ] WhatsApp Webhook → Extract Intent
   - [ ] Route by Intent → WhatsApp Response (for all paths)
   - [ ] Verify both Twilio and WhatsApp flows work

5. **Test Configuration**
   - [ ] Send test message via WhatsApp Sandbox
   - [ ] Verify message appears in n8n logs
   - [ ] Verify intent extraction works
   - [ ] Verify Notion record created
   - [ ] Verify WhatsApp response sent back

---

## Webhook Registration in Twilio

Once n8n webhook is created, register it in Twilio WhatsApp Sandbox settings:

1. Go to Twilio Console → Messaging → Sandbox
2. Set Webhook URL: `https://pxckxts.app.n8n.cloud/webhook/whatsapp`
3. HTTP Method: `POST`
4. Set status callback if needed

---

## Expected Webhook Payload Examples

### Text Message Example

```json
{
  "MessageSid": "SM8e5b0e16d3afc6db7ad3e3d3e6eab0cf",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "new job for John Smith plumbing",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T14:32:45Z"
}
```

### Voice Note Example (After Transcription)

```json
{
  "MessageSid": "SM9f6c1f27e4bfd7ec8be4f4e4f7fb1dg",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "material cost was 45 euros 50 cents",
  "NumMedia": "1",
  "MediaUrl0": "https://api.twilio.com/2010-04-01/Accounts/.../Media/...",
  "MediaContentType0": "audio/ogg",
  "MessageType": "voice_message",
  "SmsStatus": "received",
  "Timestamp": "2026-04-30T14:35:22Z"
}
```

**Note:** Voice transcription requires separate Twilio configuration for speech-to-text callback.

---

## Dependencies & Open Items

### Waiting for Parallel Tasks

1. **Twilio Sandbox Setup**
   - [ ] Sandbox WhatsApp number provisioned
   - [ ] Webhook URL registered in Twilio
   - [ ] Test credentials verified

2. **Voice Note Transcription**
   - [ ] Confirm Twilio supports WhatsApp voice transcription
   - [ ] Configure speech-to-text callback if needed
   - [ ] Update webhook to handle transcribed content

3. **Authentication & Credentials**
   - [ ] Twilio Account SID added to n8n credentials
   - [ ] Twilio Auth Token added to n8n credentials
   - [ ] Claude API key already configured

### Manual Testing Requirements

Before full deployment, test:

1. Text message → Notion creation → WhatsApp response
2. Voice note → Transcription → Intent extraction → Response
3. Multiple intents (cost_log, labour_log, invoice_trigger)
4. Error handling (unknown intent)
5. Notion data integrity across both channels

---

## Testing Data

### Test Scenario 1: New Job

**Input (WhatsApp):** "new job for John Smith plumbing repair"

**Expected Flow:**
- Intent: `job_setup`
- Notion entry: job_records table
- Response: "Job created: plumbing repair for John Smith"

### Test Scenario 2: Cost Log

**Input (WhatsApp):** "material cost was 45.50 euros"

**Expected Flow:**
- Intent: `cost_log`
- Notion entry: costs table with amount, date
- Response: "Cost logged: €45.50"

### Test Scenario 3: Labour Log

**Input (WhatsApp):** "John worked 2 hours today"

**Expected Flow:**
- Intent: `labour_log`
- Notion entry: labour table with worker, hours
- Response: "2 hours logged for John"

### Test Scenario 4: Invoice Generation

**Input (WhatsApp):** "create invoice"

**Expected Flow:**
- Intent: `invoice_trigger`
- Notion: Generate invoice
- Response: "Invoice created - check Notion"

### Test Scenario 5: Unknown Intent

**Input (WhatsApp):** "Hello, how are you?"

**Expected Flow:**
- Intent: `unknown`
- No Notion entry
- Response: "Sorry, I didn't understand that. Try: 'new job for [name]'"

---

## Operational Notes

### Message Limitations

- WhatsApp text limit: 1600 characters per message
- Response messages should be kept under 160 chars when possible
- Media handling (images, documents) not configured in this phase

### Rate Limiting

- Twilio WhatsApp: Default rate limits apply
- n8n: Configure execution limits in workflow settings
- Claude API: Requests counted against API quota

### Monitoring

- Monitor n8n execution logs for webhook hits
- Track WhatsApp response delivery status
- Verify Notion entries are created correctly
- Monitor Claude API usage and costs

### Troubleshooting

| Issue | Cause | Solution |
|-------|-------|----------|
| Webhook not receiving messages | URL not registered in Twilio | Register webhook in Twilio console |
| Intent classification incorrect | Claude prompt unclear | Refine prompt with examples |
| WhatsApp response not sent | Twilio auth failed | Verify Account SID and Auth Token |
| Notion entry missing | Extraction failed | Check Claude output mapping |
| Voice note not transcribed | Twilio callback not configured | Configure speech-to-text in Twilio |

---

## Next Steps

1. **Configure WhatsApp Webhook Node**
   - Create node with path `whatsapp`
   - Copy webhook URL

2. **Register Webhook in Twilio**
   - Add URL to WhatsApp Sandbox settings

3. **Add Response Handler**
   - Configure HTTP request to Twilio Messages API
   - Test with sample input

4. **Run Integration Tests**
   - Send test messages via WhatsApp
   - Verify end-to-end flow

5. **Monitor & Adjust**
   - Check logs for errors
   - Refine intent classification if needed
   - Prepare for production deployment

---

**Document Version:** 1.0  
**Last Updated:** 2026-04-30  
**Status:** Ready for Implementation
