# WhatsApp Webhook Test Data Reference

**For Manual Testing in n8n Webhook**  
**Workflow:** Voice-to-Invoice  
**Date:** 2026-04-30

---

## Using Test Data in n8n

To manually test the WhatsApp webhook without sending real messages:

1. Open n8n workflow editor
2. Click on "WhatsApp Webhook" node
3. Click "Test" tab
4. Copy one of the example payloads below
5. Paste into the body field
6. Click "Test Node"
7. Check the output in the "Output" panel

---

## Test Scenario 1: New Job Setup

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SM8e5b0e16d3afc6db7ad3e3d3e6eab0cf",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "new job for John Smith plumbing repair",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T14:32:45Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "job_setup",
  "confidence": 0.98,
  "details": {
    "job_type": "plumbing repair",
    "worker_name": "John Smith"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Job created: plumbing repair for John Smith"
}
```

### Notion Entry Created

Table: `job_records`
```
| Job ID | Job Name | Client/Worker | Date | Source |
|--------|----------|----------------|------|--------|
| J001 | plumbing repair | John Smith | 2026-04-30 | WhatsApp |
```

---

## Test Scenario 2: Cost Log Entry

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SM9f6c1f27e4bfd7ec8be4f4e4f7fb1dg",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "material cost was 45 euros 50 cents",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T14:35:22Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "cost_log",
  "confidence": 0.97,
  "details": {
    "amount": 45.50,
    "currency": "EUR",
    "item_description": "material"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Cost logged: €45.50 - material"
}
```

### Notion Entry Created

Table: `costs`
```
| Cost ID | Amount | Currency | Description | Date | Source |
|---------|--------|----------|-------------|------|--------|
| C001 | 45.50 | EUR | material | 2026-04-30 | WhatsApp |
```

---

## Test Scenario 3: Labour Hours Log

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SMah7g2h8ibjf9kcl0mdnqo1pqrst2uv",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "John worked 2 and a half hours today on the plumbing job",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T15:40:30Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "labour_log",
  "confidence": 0.96,
  "details": {
    "worker_name": "John",
    "hours": 2.5,
    "job_reference": "plumbing job",
    "date": "2026-04-30"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "2.5 hours logged for John - plumbing job"
}
```

### Notion Entry Created

Table: `labour`
```
| Labour ID | Worker | Hours | Job Reference | Date | Source |
|-----------|--------|-------|----------------|------|--------|
| L001 | John | 2.5 | plumbing job | 2026-04-30 | WhatsApp |
```

---

## Test Scenario 4: Invoice Trigger

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SMwx8yz9abcdefgh1ijklmno2pqrstuv",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "please create invoice for the plumbing job",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T16:15:00Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "invoice_trigger",
  "confidence": 0.95,
  "details": {
    "job_reference": "plumbing job"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Invoice created - check Notion for details"
}
```

### Notion Entry Created

Table: `invoices`
```
| Invoice ID | Job Reference | Date Created | Amount | Status | Source |
|------------|----------------|--------------|--------|--------|--------|
| INV001 | plumbing job | 2026-04-30 | €48.00 | draft | WhatsApp |
```

---

## Test Scenario 5: Payment Received

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SMabw2xy3zdefgh4ijklmno5pqrstuv",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "payment of 500 euros received for invoice INV001",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T17:45:10Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "payment_received",
  "confidence": 0.98,
  "details": {
    "amount": 500,
    "currency": "EUR",
    "invoice_reference": "INV001"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Payment €500.00 received - thank you!"
}
```

### Notion Entry Created

Table: `payments`
```
| Payment ID | Amount | Currency | Invoice Ref | Date | Source |
|------------|--------|----------|-------------|------|--------|
| PAY001 | 500.00 | EUR | INV001 | 2026-04-30 | WhatsApp |
```

---

## Test Scenario 6: Unknown Intent (Error Case)

### Webhook Payload (Text Message)

```json
{
  "MessageSid": "SMcxyz1aabc2defg3hijkl4mno5pqrst",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "hello how are you doing today mate",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T18:00:00Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "unknown",
  "confidence": 0.05,
  "details": {}
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Sorry, I didn't understand that. Try: 'new job for [name]' or 'cost [amount]'"
}
```

### Notion Entry Created

Table: `none` (No entry created for unknown intent)

---

## Test Scenario 7: Voice Note (Transcribed)

### Webhook Payload (Voice Message - Pre-Transcribed)

```json
{
  "MessageSid": "SMdyz2bcd3efgh4ijklm5nopqr6stuvw",
  "AccountSid": "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MessagingServiceSid": "MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+353871234567",
  "Body": "new job for electrician mike doing house rewiring",
  "NumMedia": "1",
  "MediaUrl0": "https://api.twilio.com/2010-04-01/Accounts/.../Media/MMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "MediaContentType0": "audio/ogg",
  "MessageType": "voice_message",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T18:30:15Z"
}
```

### Expected n8n Output

**Node: Extract Intent with Claude**
```json
{
  "intent": "job_setup",
  "confidence": 0.94,
  "details": {
    "job_type": "house rewiring",
    "worker_name": "Mike",
    "profession": "electrician"
  }
}
```

**Node: Send WhatsApp Response**
```json
{
  "message": "Job created: house rewiring for Mike (electrician)"
}
```

### Notion Entry Created

Table: `job_records`
```
| Job ID | Job Name | Client/Worker | Profession | Date | Source |
|--------|----------|----------------|-----------|------|--------|
| J002 | house rewiring | Mike | electrician | 2026-04-30 | WhatsApp |
```

---

## Stress Test Scenarios

### Multiple Messages Rapid Fire

Send 5 messages in quick succession:

```json
[
  {"Body": "new job for plumber John", ...},
  {"Body": "cost 120 euros", ...},
  {"Body": "worked 4 hours", ...},
  {"Body": "create invoice", ...},
  {"Body": "payment 500 received", ...}
]
```

**Expected Result:**
- All 5 processed
- All 5 intents correct
- All 5 responses sent
- All 5 Notion entries created
- No duplicate entries
- Sequential processing verified in logs

### Long Message Test

```json
{
  "MessageSid": "SMeyz3cde4fghi5jklmn6opqr7stuvwx",
  "Body": "I have a new job for Sarah who will be doing extensive plumbing repairs including fixing three leaks, replacing all bathroom fixtures, and installing new pipes in the kitchen area which should take about 5 days of work",
  ...
}
```

**Expected Result:**
- Intent: job_setup
- Extracted: job details, worker name, scope, duration
- Response sent successfully
- Notion entry created with all details

### Special Characters Test

```json
{
  "MessageSid": "SMfyz4def5ghij6klmno7pqrs8tuvwxy",
  "Body": "cost for José's café: €75.99 (including VAT @ 23%)",
  ...
}
```

**Expected Result:**
- Intent: cost_log
- Amount: 75.99
- Description: José's café
- Special characters preserved in Notion
- Response sent with correct formatting

---

## Field Reference for Webhook Payload

| Field | Type | Example | Required | Notes |
|-------|------|---------|----------|-------|
| MessageSid | String | SM8e5b0e16d3afc6db7ad3e3d3e6eab0cf | Yes | Unique message ID |
| AccountSid | String | ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | Yes | Your Twilio account |
| MessagingServiceSid | String | MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx | No | Optional messaging service |
| From | String | whatsapp:+353876543210 | Yes | Sender's WhatsApp number |
| To | String | whatsapp:+353871234567 | Yes | Your sandbox number |
| Body | String | "new job for John" | Yes | Message content |
| NumMedia | String | "0" or "1" | No | Number of attachments |
| MediaUrl0 | String | URL | No | Media file URL if present |
| MediaContentType0 | String | audio/ogg, image/jpeg | No | Media type |
| MessageType | String | text, voice_message, image | Yes | Type of message |
| SmsStatus | String | received, failed | Yes | Delivery status |
| ApiVersion | String | 2010-04-01 | No | API version |
| Timestamp | String | 2026-04-30T14:32:45Z | No | ISO 8601 timestamp |

---

## Creating Custom Test Data

### Template

```json
{
  "MessageSid": "SM[unique_string]",
  "AccountSid": "AC[your_account_sid]",
  "MessagingServiceSid": "MG[service_id]",
  "From": "whatsapp:+353[your_test_number]",
  "To": "whatsapp:+353[sandbox_number]",
  "Body": "[your_test_message]",
  "NumMedia": "0",
  "MessageType": "text",
  "SmsStatus": "received",
  "ApiVersion": "2010-04-01",
  "Timestamp": "2026-04-30T[HH:MM:SS]Z"
}
```

### Steps

1. Copy template above
2. Replace bracketed values with your actual data
3. Update Body with your test message
4. Update timestamp to current time
5. Paste into n8n webhook test field
6. Click "Test Node"

---

## Verifying Test Results

### Check Execution Logs

1. After running test, scroll down to "Execution History"
2. Click on the execution entry
3. Review JSON output from each node:
   - Check "Extract Intent" output
   - Check "Route by Intent" output
   - Check "Send WhatsApp Response" output

### Verify Notion Entries

1. Open your Notion workspace
2. Check relevant table (job_records, costs, labour, etc.)
3. Look for new entry with today's date
4. Verify all extracted fields are present and correct

### Common Issues When Testing

| Issue | Cause | Fix |
|-------|-------|-----|
| "No value returned" | Intent extraction failed | Check Claude prompt, verify message format |
| Empty response message | Message format node missing | Add Set node to format response |
| Notion entry not created | Handler node not executing | Check routing logic, verify intent value |
| Invalid JSON error | Payload format incorrect | Validate JSON, check all quotes match |
| 401 Unauthorized | Twilio credentials invalid | Update credentials in n8n, verify Account SID |

---

## Test Execution Log Template

Use this to track test results:

```
Test Date: 2026-04-30
Tester: [Your Name]

Test Case: [Scenario Name]
Message: [Test message sent]
Intent Detected: [Expected intent]
Response Sent: [Yes/No]
Notion Entry: [Yes/No]
Status: [PASS/FAIL]
Notes: [Any observations]

---

Summary:
Total Tests: __/6
Passed: __/6
Failed: __/6
```

---

**Last Updated:** 2026-04-30  
**Ready for Testing:** Yes
