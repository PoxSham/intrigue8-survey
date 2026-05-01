# WhatsApp Integration Implementation Checklist

**Workflow:** Voice-to-Invoice Webhook  
**Status:** Ready for Implementation  
**Date:** 2026-04-30

---

## Phase 1: Preparation (Before Opening n8n)

### Gather Required Credentials

- [ ] Twilio Account SID
  - Location: Twilio Console → Account Settings
  - Format: AC followed by alphanumeric string
  - Store safely in password manager

- [ ] Twilio Auth Token
  - Location: Twilio Console → Account Settings → View Auth Token
  - Keep private and never commit to version control
  - Store safely in password manager

- [ ] WhatsApp Sandbox Number
  - Location: Twilio Console → Messaging → Sandbox
  - Format: +1234567890 (with country code)
  - Screenshot and save for reference

- [ ] Claude API Key
  - Already configured in n8n (verify)
  - Status: ✓ Present in workflow credentials

### Verify Twilio WhatsApp Sandbox Setup

- [ ] WhatsApp Business Account linked
- [ ] Sandbox enabled in Twilio
- [ ] Test number assigned and confirmed
- [ ] Message templates configured (if using pre-formatted responses)

### Document Current State

- [ ] Review existing "Voice-to-Invoice Webhook" workflow
  - Note: Current intent extraction prompt
  - Note: Current response message format
  - Note: Current Notion integration details
  
- [ ] Screenshot current workflow for reference
  - Capture: Node names and connections
  - Capture: Current credential configuration

---

## Phase 2: Create WhatsApp Webhook Node

### Create New Webhook Trigger

1. [ ] Open n8n workflow: https://pxckxts.app.n8n.cloud/workflow/zrGfO5n2M2cHhQhx

2. [ ] Click "+" to add new node

3. [ ] Search "Webhook" and select trigger node

4. [ ] Configure node:
   - [ ] Set HTTP Method: POST
   - [ ] Set Path: `whatsapp`
   - [ ] Set Authentication: None
   - [ ] Node name: "WhatsApp Webhook"

5. [ ] Save node

6. [ ] Copy webhook URL:
   - [ ] URL format: `https://pxckxts.app.n8n.cloud/webhook/whatsapp`
   - [ ] Save URL in project notes

### Connect to Intent Extraction

- [ ] Connect output of "WhatsApp Webhook" to "Extract Intent with Claude"
  - Verify connection arrow appears
  - Verify no validation errors

- [ ] Test node activation:
  - [ ] Click on "WhatsApp Webhook" node
  - [ ] Look for "Execution not active" message
  - [ ] Workflow should be in edit mode (not active/live)

---

## Phase 3: Update Intent Extraction Logic

### Update Claude Prompt

1. [ ] Open "Extract Intent with Claude" node

2. [ ] Find the system prompt or instruction text

3. [ ] Add WhatsApp context:
   ```
   Platform context: This message may come from:
   - Twilio Voice: Transcribed voice message
   - WhatsApp: Text message or voice note transcript
   
   Classify into: job_setup, cost_log, labour_log, 
                  invoice_trigger, payment_received, unknown
   ```

4. [ ] Save changes

### Verify Intent Categories

- [ ] job_setup: "new job for..." messages
- [ ] cost_log: "cost...", "material...", "expense..." messages
- [ ] labour_log: "hours...", "worked...", "labour..." messages
- [ ] invoice_trigger: "invoice...", "create invoice...", "generate..." messages
- [ ] payment_received: "payment...", "received...", "paid..." messages
- [ ] unknown: Anything else

### Update Input Mapping

1. [ ] Locate input mapping for message field

2. [ ] Current mapping (likely):
   ```
   {{ $node['Twilio Voice Webhook'].json.Speech }}
   ```

3. [ ] Update to handle both sources:
   ```
   {{ $node['WhatsApp Webhook'].json.Body || $node['Twilio Voice Webhook'].json.Speech }}
   ```

4. [ ] Test with sample data:
   - [ ] WhatsApp text: "new job for John Smith"
   - [ ] Verify it reaches Claude prompt
   - [ ] Check intent extracted correctly

---

## Phase 4: Create Response Handler Node

### Create HTTP Request Node

1. [ ] Click "+" to add new node after "Route by Intent"

2. [ ] Search "HTTP Request" and select node

3. [ ] Configure HTTP Request:
   - [ ] Request Method: POST
   - [ ] URL: `https://api.twilio.com/2010-04-01/Accounts/{{ $credentials.twilio.accountSid }}/Messages`

4. [ ] Set Authentication:
   - [ ] Type: Basic Auth
   - [ ] Username: `{{ $credentials.twilio.accountSid }}`
   - [ ] Password: `{{ $credentials.twilio.authToken }}`

5. [ ] Set Headers:
   - [ ] Content-Type: `application/x-www-form-urlencoded`

6. [ ] Set Body (Form-URL-Encoded):
   ```
   From: whatsapp:+1234567890  [replace with your Twilio WhatsApp number]
   To: {{ $node['WhatsApp Webhook'].json.From }}
   Body: {{ $node['Send Message'].json.message }}  [or your message mapping]
   ```

7. [ ] Node name: "Send WhatsApp Response"

8. [ ] Save node

### Connect Response Node

- [ ] Connect "Route by Intent" to "Send WhatsApp Response"
  - [ ] All intent paths should route here
  - [ ] Use conditional logic to set message per intent

- [ ] Verify Twilio credentials loaded:
  - [ ] Click node and check "Credentials" dropdown
  - [ ] Select Twilio credentials
  - [ ] If not present, add new Twilio credential with Account SID and Auth Token

---

## Phase 5: Set Up Message Responses

### Create Message Set Node (Optional but Recommended)

1. [ ] Click "+" to add new node before "Send WhatsApp Response"

2. [ ] Search "Set" and select node

3. [ ] Node name: "Format Response Message"

4. [ ] Set up message mapping:
   ```javascript
   {
     "message": "{{ 
       $node['Route by Intent'].json.intent === 'job_setup' 
         ? 'Job created: ' + details.job_name
         : $node['Route by Intent'].json.intent === 'cost_log'
         ? 'Cost logged: €' + details.amount
         : $node['Route by Intent'].json.intent === 'labour_log'
         ? details.hours + ' hours logged'
         : $node['Route by Intent'].json.intent === 'invoice_trigger'
         ? 'Invoice created - check Notion'
         : $node['Route by Intent'].json.intent === 'payment_received'
         ? 'Payment €' + details.amount + ' received'
         : 'Sorry, I didn''t understand. Try: new job for [name]'
     }}"
   }
   ```

5. [ ] Connect output to "Send WhatsApp Response"

### Configure Message Templates

- [ ] job_setup response: "Job created: [job_name] for [client]"
- [ ] cost_log response: "Cost logged: €[amount]"
- [ ] labour_log response: "[hours] hours logged for [worker]"
- [ ] invoice_trigger response: "Invoice created - check Notion"
- [ ] payment_received response: "Payment €[amount] received"
- [ ] unknown response: "Sorry, I didn't understand. Try: 'new job for [name]'"

---

## Phase 6: Register Webhook in Twilio

### Configure WhatsApp Sandbox

1. [ ] Log in to Twilio Console

2. [ ] Navigate to Messaging → Sandbox

3. [ ] In WhatsApp Sandbox settings:
   - [ ] Copy webhook URL from n8n (from WhatsApp Webhook node)
   - [ ] Paste into "When a message comes in" webhook field
   - [ ] Set HTTP Method: POST
   - [ ] Save

4. [ ] Verify sandbox phone number:
   - [ ] Note: WhatsApp sandbox number (format: +1234567890)
   - [ ] Store in project documentation

5. [ ] Add test numbers:
   - [ ] Your personal WhatsApp number
   - [ ] Any other test numbers needed
   - [ ] Follow Twilio's sandbox invitation process

---

## Phase 7: Testing - Unit Tests

### Test 1: Webhook Reception

**Goal:** Verify n8n receives WhatsApp messages

1. [ ] Open n8n workflow in editor

2. [ ] Activate workflow:
   - [ ] Click "Activate" or toggle switch
   - [ ] Confirm workflow is active

3. [ ] Send WhatsApp test message:
   - [ ] From your registered test number
   - [ ] Send: "new job for John Smith"

4. [ ] Check webhook receipt:
   - [ ] Watch n8n logs in real-time
   - [ ] Look for "Webhook fired" or execution log
   - [ ] Verify message content appears

5. [ ] Document result:
   - [ ] ✓ Message received | ✗ Not received
   - [ ] Note timestamp and message content

### Test 2: Intent Extraction

**Goal:** Verify Claude correctly classifies intent

1. [ ] Check execution logs for "Extract Intent" node

2. [ ] Verify output:
   ```json
   {
     "intent": "job_setup",
     "details": { ... }
   }
   ```

3. [ ] Test each intent type:
   - [ ] "new job for John Smith" → job_setup
   - [ ] "material cost 45 euros" → cost_log
   - [ ] "John worked 2 hours" → labour_log
   - [ ] "create invoice" → invoice_trigger
   - [ ] "payment received 500 euros" → payment_received
   - [ ] "hello how are you" → unknown

4. [ ] Document accuracy:
   - [ ] Correct: __/6 tests passed
   - [ ] If failures, note which intents need prompt refinement

### Test 3: Route Execution

**Goal:** Verify Route by Intent directs to correct handler

1. [ ] Check execution flow in logs:
   - [ ] Verify correct intent detected
   - [ ] Verify correct handler executed
   - [ ] Verify no errors in route decision

2. [ ] Test routing for all intents:
   - [ ] job_setup → Job handler executed
   - [ ] cost_log → Cost handler executed
   - [ ] labour_log → Labour handler executed
   - [ ] invoice_trigger → Invoice handler executed
   - [ ] payment_received → Payment handler executed
   - [ ] unknown → Error handler executed

### Test 4: WhatsApp Response Reception

**Goal:** Verify response message sent back via WhatsApp

1. [ ] Check n8n logs for "Send WhatsApp Response" node

2. [ ] Look for successful HTTP response:
   - [ ] Status: 200 or 201
   - [ ] Response body includes MessageSid

3. [ ] Check WhatsApp phone:
   - [ ] Wait 5-10 seconds
   - [ ] Verify response message received
   - [ ] Check message content is appropriate

4. [ ] Document result:
   - [ ] ✓ Response received | ✗ Not received
   - [ ] ✓ Content correct | ✗ Content incorrect

### Test 5: Notion Integration

**Goal:** Verify Notion records created from WhatsApp messages

1. [ ] Open Notion workspace

2. [ ] Check relevant tables:
   - [ ] job_records: New job entry created
   - [ ] costs: New cost entry created
   - [ ] labour: New labour entry created
   - [ ] invoices: New invoice created
   - [ ] payments: Payment recorded

3. [ ] Verify data accuracy:
   - [ ] All extracted details present
   - [ ] No missing or incorrect fields
   - [ ] Timestamps correct
   - [ ] Source clearly marked as WhatsApp

4. [ ] Document result:
   - [ ] Entries created: __/5
   - [ ] Data accuracy: __/5

---

## Phase 8: Testing - Integration Tests

### Test Case 1: Multiple Sequential Messages

**Goal:** Verify workflow handles multiple messages correctly

1. [ ] Send 3 different messages in sequence:
   - [ ] Message 1: "new job for plumbing"
   - [ ] Message 2: "cost 45 euros"
   - [ ] Message 3: "worked 2 hours"

2. [ ] Wait for all to complete (watch logs)

3. [ ] Verify:
   - [ ] All 3 received and processed
   - [ ] All 3 intents extracted correctly
   - [ ] All 3 responses sent
   - [ ] All 3 Notion entries created

4. [ ] Document:
   - [ ] ✓ All processed sequentially | ✗ Some failed
   - [ ] Response time per message: __ seconds

### Test Case 2: Voice vs Text Same Intent

**Goal:** Verify both voice and WhatsApp work for same intent

1. [ ] Send voice message (if available):
   - [ ] Use Twilio Voice webhook
   - [ ] Transcribed text: "new job for electrician"

2. [ ] Send same WhatsApp text:
   - [ ] Message: "new job for electrician"

3. [ ] Compare results:
   - [ ] Both intents extracted correctly
   - [ ] Both create Notion entries
   - [ ] Both send responses
   - [ ] Entries have correct source marked

4. [ ] Document:
   - [ ] ✓ Identical behavior | ✗ Differences found

### Test Case 3: Error Handling

**Goal:** Verify system handles errors gracefully

1. [ ] Send message that triggers "unknown" intent:
   - [ ] Message: "xyz abc 123 nonsense"

2. [ ] Verify:
   - [ ] Intent: "unknown" correctly identified
   - [ ] Error response sent to user
   - [ ] No Notion entry created for unknown intent
   - [ ] Workflow continues without crashing

3. [ ] Document:
   - [ ] ✓ Handled gracefully | ✗ Error occurred

### Test Case 4: Concurrent Channels

**Goal:** Verify voice and WhatsApp work simultaneously

1. [ ] Start voice call (if possible)
   - [ ] Speak: "new job for plumber"

2. [ ] While call active, send WhatsApp:
   - [ ] Message: "cost 50 euros"

3. [ ] Verify:
   - [ ] Both processed independently
   - [ ] No data cross-contamination
   - [ ] Both complete successfully
   - [ ] Notion entries separate and correct

4. [ ] Document:
   - [ ] ✓ No conflicts | ✗ Issues found

---

## Phase 9: Regression Testing

### Verify Existing Voice Workflow Intact

- [ ] Voice webhook still triggers
  - [ ] Send test voice message
  - [ ] Verify received in n8n logs
  - [ ] Verify processed correctly

- [ ] Voice intent extraction unchanged
  - [ ] Intents classified correctly
  - [ ] Same accuracy as before

- [ ] Voice response delivery unchanged
  - [ ] Responses sent via Twilio Voice
  - [ ] Same format as before

- [ ] Notion entries from voice unchanged
  - [ ] Records created with correct data
  - [ ] Source marked as voice

### Verify No Side Effects

- [ ] n8n performance:
  - [ ] No slowdown in execution
  - [ ] No increased error rates
  - [ ] Logs clean without warnings

- [ ] API usage:
  - [ ] Claude API calls normal
  - [ ] Twilio calls normal
  - [ ] Notion API calls normal

- [ ] Data integrity:
  - [ ] No duplicate entries
  - [ ] No missing data
  - [ ] Correct timestamps

---

## Phase 10: Documentation & Deployment

### Update Project Documentation

- [ ] CLAUDE.md
  - [ ] Note WhatsApp integration added
  - [ ] Update tech stack status

- [ ] Architecture diagram
  - [ ] Include WhatsApp webhook
  - [ ] Show parallel channels
  - [ ] Update flow diagram

- [ ] README or setup guide
  - [ ] Document webhook URL
  - [ ] Note testing procedures
  - [ ] Add troubleshooting section

### Prepare for Production

- [ ] Review security:
  - [ ] Credentials stored securely
  - [ ] No API keys in code
  - [ ] HTTPS endpoints only

- [ ] Review performance:
  - [ ] Response time acceptable (< 10 seconds)
  - [ ] API rate limits considered
  - [ ] Notion quotas not exceeded

- [ ] Review monitoring:
  - [ ] Logs configured
  - [ ] Error alerts set up
  - [ ] Success metrics tracked

### Enable in Production

- [ ] [ ] Activate workflow (if not already)

- [ ] [ ] Monitor first 24 hours:
  - [ ] Watch error logs
  - [ ] Track response times
  - [ ] Verify all intents working

- [ ] [ ] Get user feedback:
  - [ ] Test with real contractors
  - [ ] Gather response quality feedback
  - [ ] Note any refinements needed

---

## Troubleshooting Quick Reference

| Issue | Symptom | Solution |
|-------|---------|----------|
| Webhook not receiving | No logs, no messages | Register URL in Twilio console |
| Intent wrong | Extraction shows wrong intent | Add examples to Claude prompt |
| Response not sent | HTTP 500 error in logs | Check Twilio credentials |
| Notion entry missing | Record not created | Check Notion integration in handlers |
| Slow response | > 15 second wait | Optimize Claude prompt, check API |
| Message format wrong | Garbled text in WhatsApp | Verify message mapping in Format node |
| Duplicate entries | Same message creates 2 records | Check webhook retries, disable if needed |

---

## Sign-Off

- [ ] All tests passed
- [ ] Documentation complete
- [ ] No regression issues
- [ ] Ready for production
- [ ] User acceptance confirmed

**Date Completed:** _______________

**Tested By:** _______________

**Approved By:** _______________

---

**Last Updated:** 2026-04-30  
**Status:** Ready for Implementation
