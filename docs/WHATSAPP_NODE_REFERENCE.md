# WhatsApp Node Configuration Reference

**Quick Reference for n8n WhatsApp Integration Setup**  
**Workflow ID:** zrGfO5n2M2cHhQhx

---

## Node 1: WhatsApp Webhook Trigger

### Node Properties

| Property | Value |
|----------|-------|
| **Node Type** | Webhook |
| **Node Name** | WhatsApp Webhook |
| **Authentication** | None |
| **HTTP Method** | POST |
| **Path** | `whatsapp` |
| **Full URL** | `https://pxckxts.app.n8n.cloud/webhook/whatsapp` |

### Step-by-Step Setup

1. Click "+" to add new node
2. Search for "Webhook"
3. Select "Webhook" from trigger nodes
4. Configure:
   - **HTTP Method:** Select "POST"
   - **Path:** Type `whatsapp`
   - **Authentication:** Select "None"
5. Click "Save"
6. Copy the webhook URL (shown in node)
7. Connect output to "Extract Intent with Claude" node

### Output Structure

The webhook will output this JSON:

```json
{
  "MessageSid": "string",
  "AccountSid": "string",
  "MessagingServiceSid": "string",
  "From": "whatsapp:+353876543210",
  "To": "whatsapp:+1234567890",
  "Body": "user message text",
  "NumMedia": "0",
  "MediaUrl0": null,
  "MessageType": "text",
  "SmsStatus": "received",
  "Timestamp": "2026-04-30T14:32:45Z"
}
```

---

## Node 2: Extract Intent with Claude (MODIFIED)

### Existing Node - Update Required

**Current Node Name:** "Extract Intent with Claude"

### Changes Needed

#### Change 1: Update Prompt to Handle WhatsApp

**Find the Claude prompt in this node and add:**

```
Platform context: This message may come from:
- Twilio Voice: Transcribed voice message
- WhatsApp: Text message or voice note transcript

Regardless of source, classify into one of these intents:
- job_setup: Creating a new job (e.g., "new job for John Smith")
- cost_log: Logging material costs (e.g., "cost was 45 euros")
- labour_log: Logging labour hours (e.g., "John worked 2 hours")
- invoice_trigger: Requesting invoice (e.g., "create invoice")
- payment_received: Payment confirmation (e.g., "payment received 500")
- unknown: Cannot classify

Extract the intent and any relevant details (names, amounts, hours, etc.)
```

#### Change 2: Update Input Mapping

**In the node's input section, update the message field:**

Find the input field that currently says something like:
```
{{ $node['Twilio Voice Webhook'].json.Speech }}
```

**Replace with:**

```javascript
// This will use the From field to determine the source
{{ $node['WhatsApp Webhook'].json.Body || $node['Twilio Voice Webhook'].json.Speech }}
```

**Or create a separate input field:**

```javascript
{
  "message": "{{ $node['WhatsApp Webhook'].json.Body || $node['Twilio Voice Webhook'].json.Speech }}",
  "source": "{{ $node['WhatsApp Webhook'].json.From ? 'whatsapp' : 'voice' }}",
  "sender": "{{ $node['WhatsApp Webhook'].json.From || $node['Twilio Voice Webhook'].json.From }}"
}
```

#### Change 3: Verify Output Structure

The node output should produce:

```json
{
  "intent": "job_setup",
  "confidence": 0.95,
  "details": {
    "job_name": "plumbing repair",
    "worker_name": "John Smith",
    "date": "2026-04-30"
  }
}
```

---

## Node 3: Route by Intent (NO CHANGES)

**This node already exists and requires no modification.**

**Verify it has routes for:**
- `job_setup` → Job handler
- `cost_log` → Cost handler
- `labour_log` → Labour handler
- `invoice_trigger` → Invoice generator
- `payment_received` → Payment handler
- `unknown` → Error handler / Response

---

## Node 4: Send WhatsApp Response (NEW)

### Node Properties

| Property | Value |
|----------|-------|
| **Node Type** | HTTP Request |
| **Node Name** | Send WhatsApp Response |
| **Request Method** | POST |
| **URL** | `https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages` |
| **Authentication** | Basic Auth |

### Step-by-Step Setup

1. Click "+" to add new node after "Route by Intent"
2. Search for "HTTP Request"
3. Select "HTTP Request"
4. Configure:

   **Request Method:** POST
   
   **URL:** 
   ```
   https://api.twilio.com/2010-04-01/Accounts/{{ $credentials.twilio.accountSid }}/Messages
   ```
   
   **Authentication:**
   - Type: Basic Auth
   - Username: `{{ $credentials.twilio.accountSid }}`
   - Password: `{{ $credentials.twilio.authToken }}`

5. **Headers Tab:**
   - Content-Type: `application/x-www-form-urlencoded`

6. **Body Tab (Form-URL-Encoded):**

   | Key | Value |
   |-----|-------|
   | From | `whatsapp:+1234567890` |
   | To | `{{ $node['WhatsApp Webhook'].json.From }}` |
   | Body | `{{ $node['Send WhatsApp Response'].json.message }}` |

   **Or use Variables (if numbers in .env):**
   ```
   From=whatsapp:{{ env.TWILIO_WHATSAPP_NUMBER }}
   To={{ $node['WhatsApp Webhook'].json.From }}
   Body={{ $node['Send WhatsApp Response'].json.message }}
   ```

7. Click "Save"

### Response Message Mapping

Connect the output of "Route by Intent" and each handler to this node. Use conditional logic to set the message:

```javascript
// In a Set node before "Send WhatsApp Response"
{
  "message": "{{ 
    $node['Route by Intent'].json.intent === 'job_setup' 
      ? 'Job created: ' + $node['Job Setup Handler'].json.job_name
      : $node['Route by Intent'].json.intent === 'cost_log'
      ? 'Cost logged: €' + $node['Cost Log Handler'].json.amount
      : $node['Route by Intent'].json.intent === 'labour_log'
      ? $node['Labour Log Handler'].json.hours + ' hours logged'
      : $node['Route by Intent'].json.intent === 'invoice_trigger'
      ? 'Invoice ' + $node['Invoice Generator'].json.id + ' created'
      : $node['Route by Intent'].json.intent === 'payment_received'
      ? 'Payment €' + $node['Payment Handler'].json.amount + ' received'
      : 'Sorry, I didn''t understand that. Try: \"new job for [name]\"'
  }}"
}
```

### Testing the Response Node

To test without running the full workflow:

1. Manually set the response body in n8n test mode:
   ```json
   {
     "message": "Test message from WhatsApp integration"
   }
   ```

2. Execute the HTTP Request node

3. Check response status (should be 200 or 201)

4. Verify Twilio Message SID in response

---

## Connection Diagram

```
┌─────────────────────┐
│ WhatsApp Webhook    │
│ (trigger node)      │
└──────────┬──────────┘
           │
           ↓
┌──────────────────────────────┐
│ Extract Intent with Claude   │
│ (claude/openai node)         │
└──────────┬───────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ Route by Intent              │
│ (switch node)                │
└─┬──┬──┬──┬──┬──┬───────────┘
  │  │  │  │  │  │
  │  │  │  │  │  └─ unknown → Error Response
  │  │  │  │  └───── payment_received → Payment Handler
  │  │  │  └──────── invoice_trigger → Invoice Generator
  │  │  └─────────── labour_log → Labour Handler
  │  └────────────── cost_log → Cost Handler
  └─────────────────── job_setup → Job Handler
  
  [All handlers converge]
           │
           ↓
┌──────────────────────────────┐
│ Send WhatsApp Response        │
│ (HTTP Request to Twilio)      │
└──────────────────────────────┘
           │
           ↓
┌──────────────────────────────┐
│ Response sent to sender       │
└──────────────────────────────┘
```

---

## Credentials Setup

### Required Twilio Credentials in n8n

1. Go to n8n → Credentials
2. Create new credential: "Twilio"
3. Enter:
   - **Account SID:** From Twilio Console
   - **Auth Token:** From Twilio Console

### How to Find Credentials

1. Log in to Twilio Console
2. Go to Account → Account Settings
3. Copy "Account SID"
4. In Auth Token section, click "View"
5. Copy the token
6. Paste both into n8n credentials

---

## Message Content Mapping

### For job_setup Intent

```javascript
{
  "intent": "job_setup",
  "details": {
    "job_name": "extracted from message",
    "client_name": "extracted from message",
    "worker": "extracted from message"
  }
}

// Response message
"Job created: {{ details.job_name }} for {{ details.client_name }}"
```

### For cost_log Intent

```javascript
{
  "intent": "cost_log",
  "details": {
    "amount": "extracted numeric value",
    "currency": "EUR",
    "description": "extracted item description"
  }
}

// Response message
"Cost logged: €{{ details.amount }} - {{ details.description }}"
```

### For labour_log Intent

```javascript
{
  "intent": "labour_log",
  "details": {
    "worker": "extracted worker name",
    "hours": "extracted numeric value",
    "date": "extracted or current date"
  }
}

// Response message
"{{ details.hours }} hours logged for {{ details.worker }}"
```

### For invoice_trigger Intent

```javascript
{
  "intent": "invoice_trigger",
  "details": {
    "job_id": "associated job ID if available"
  }
}

// Response message
"Invoice created - check Notion for details"
```

### For payment_received Intent

```javascript
{
  "intent": "payment_received",
  "details": {
    "amount": "extracted numeric value",
    "date": "transaction date if provided"
  }
}

// Response message
"Payment €{{ details.amount }} received - thank you!"
```

### For unknown Intent

```javascript
{
  "intent": "unknown",
  "confidence": "low score"
}

// Response message
"Sorry, I didn't understand that. Try: 'new job for [client name]' or 'cost [amount]'"
```

---

## Environment Variables (Optional)

For better configuration management, add these to n8n environment:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWILIO_WHATSAPP_NUMBER=+1234567890
CLAUDE_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Then reference in nodes:
```javascript
{{ env.TWILIO_WHATSAPP_NUMBER }}
{{ env.TWILIO_ACCOUNT_SID }}
```

---

## Testing Checklist

### Pre-Deployment Tests

- [ ] **Node Creation**
  - [ ] WhatsApp Webhook node exists with correct path
  - [ ] Extract Intent node connects to webhook
  - [ ] Route by Intent receives intent data
  - [ ] Send WhatsApp Response node configured

- [ ] **Webhook Endpoint**
  - [ ] Copy webhook URL from WhatsApp Webhook node
  - [ ] Register URL in Twilio WhatsApp Sandbox
  - [ ] Test webhook receives POST requests (check logs)

- [ ] **Intent Extraction**
  - [ ] Send test message: "new job for John Smith"
  - [ ] Verify intent extracted as "job_setup"
  - [ ] Check extracted details (job_name, worker)

- [ ] **Routing**
  - [ ] Verify correct route taken for each intent
  - [ ] Check all 6 intent paths execute correctly
  - [ ] Verify unknown intent handling

- [ ] **Response Delivery**
  - [ ] Check Twilio HTTP response is 200/201
  - [ ] Verify WhatsApp message sent to user phone
  - [ ] Confirm message content matches intent

- [ ] **Notion Integration**
  - [ ] Verify Notion records created for each intent
  - [ ] Check all required fields populated
  - [ ] Verify data accuracy (amounts, names, dates)

### Regression Tests

- [ ] **Existing Twilio Voice Workflow**
  - [ ] Voice webhook still triggers correctly
  - [ ] Intent extraction works for voice transcripts
  - [ ] Notion records created via voice still work
  - [ ] Voice response delivery unchanged

- [ ] **Simultaneous Channels**
  - [ ] Send WhatsApp message while voice call active
  - [ ] Verify both are processed independently
  - [ ] Check no data cross-contamination

---

## Common Issues & Solutions

### Issue: Webhook not receiving messages

**Cause:** Webhook URL not registered in Twilio

**Solution:**
1. Copy URL from WhatsApp Webhook node (look for "Call this endpoint to trigger webhook")
2. Log in to Twilio Console
3. Go to Messaging → Sandbox → WhatsApp
4. Paste URL in "Webhook URL" field
5. Set method to POST
6. Save

---

### Issue: "Twilio authentication failed"

**Cause:** Invalid Account SID or Auth Token

**Solution:**
1. Log in to Twilio Console
2. Verify Account SID in Account Settings (starts with "AC")
3. Verify Auth Token by clicking "View" in Auth Token section
4. Update n8n Twilio credentials with correct values
5. Test HTTP node manually with test data

---

### Issue: Response message not sending

**Cause:** Missing or incorrect "From" number in HTTP body

**Solution:**
1. Verify `From` field uses your Twilio WhatsApp number
2. Check format: `whatsapp:+1234567890` (include country code)
3. Verify number matches sandbox number in Twilio
4. Check Twilio response in n8n logs for error message

---

### Issue: Intent classification incorrect

**Cause:** Claude prompt not clear enough

**Solution:**
1. Add more examples to the Claude prompt
2. Include sample messages for each intent type
3. Clarify which keywords indicate each intent
4. Test with actual user message patterns
5. Iterate on prompt based on results

---

## Performance Considerations

### Execution Time

- **Webhook trigger:** ~0ms
- **Claude API call:** ~2-4 seconds
- **Route decision:** ~100ms
- **Notion write:** ~1-2 seconds
- **Twilio response:** ~1-2 seconds
- **Total end-to-end:** ~5-9 seconds

### Optimization Tips

1. Use Notion batch writes for multiple fields
2. Cache Claude prompt as system message
3. Consider response queue if message volume high
4. Monitor n8n execution logs for bottlenecks

---

## Security Considerations

1. **Credential Management**
   - Store Twilio credentials in n8n secure credentials
   - Never hardcode API keys in workflow
   - Rotate tokens periodically

2. **Data Protection**
   - Ensure n8n uses HTTPS for webhook
   - Validate incoming webhook format
   - Sanitize Claude prompt input if user-facing

3. **Access Control**
   - Restrict n8n workflow editing to authorized users
   - Monitor webhook access logs
   - Set up alerts for unusual activity

---

**Last Updated:** 2026-04-30  
**Ready for Implementation:** Yes
