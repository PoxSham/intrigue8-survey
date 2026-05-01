# WhatsApp Integration - Quick Start Guide

**5-Step Setup in 30 Minutes**

---

## Step 1: Create WhatsApp Webhook Node (5 min)

### In n8n Editor
```
1. Click "+" to add node
2. Search "Webhook" 
3. Select "Webhook" trigger
4. Configure:
   - HTTP Method: POST
   - Path: whatsapp
   - Authentication: None
5. Save
6. Copy the webhook URL shown
```

### What It Looks Like
```
Node Name: "WhatsApp Webhook"
Trigger: Webhook
Output: Sends message data to next node
```

**Save for later:** Webhook URL (paste in Twilio next)

---

## Step 2: Update Intent Extraction Node (5 min)

### In n8n Editor
```
1. Click "Extract Intent with Claude" node
2. Find the Claude prompt
3. Add this line to the prompt:

"Platform: Messages may come from Twilio Voice 
or WhatsApp text/voice notes. Both use same 
intent categories: job_setup, cost_log, labour_log, 
invoice_trigger, payment_received, unknown"

4. Find the input mapping
5. Update to: 
{{ $node['WhatsApp Webhook'].json.Body || 
   $node['Twilio Voice Webhook'].json.Speech }}
6. Save
```

---

## Step 3: Create Response Node (5 min)

### In n8n Editor
```
1. Click "+" to add node after "Route by Intent"
2. Search "HTTP Request"
3. Select HTTP Request
4. Configure:
   
   HTTP Method: POST
   
   URL: https://api.twilio.com/2010-04-01/Accounts/
        {{ $credentials.twilio.accountSid }}/Messages
   
   Authentication: Basic Auth
   - Username: {{ $credentials.twilio.accountSid }}
   - Password: {{ $credentials.twilio.authToken }}
   
   Headers: Content-Type: application/x-www-form-urlencoded
   
   Body (Form-URL-Encoded):
   From: whatsapp:+1234567890
   To: {{ $node['WhatsApp Webhook'].json.From }}
   Body: Your response message here

5. Node name: "Send WhatsApp Response"
6. Save
```

---

## Step 4: Connect Nodes (5 min)

### Wire Up the Workflow
```
WhatsApp Webhook (output)
         ↓
Extract Intent with Claude
         ↓
Route by Intent
         ↓
Send WhatsApp Response
```

**Verify:**
- [ ] White arrow from WhatsApp Webhook to Intent node
- [ ] No red error indicators
- [ ] All nodes have names

---

## Step 5: Register Webhook in Twilio (10 min)

### In Twilio Console
```
1. Log in to Twilio Console
2. Go to: Messaging → Sandbox
3. Click "WhatsApp"
4. Under "Incoming Messages":
   - Webhook URL: [PASTE YOUR n8n URL FROM STEP 1]
   - HTTP Method: POST
5. Click Save
6. Note the sandbox number shown (e.g., +1234567890)
```

---

## Test It Now!

### Send Test Message
```
From your registered test phone:
Send WhatsApp message: "new job for John Smith"

Check:
1. n8n logs show message received
2. Intent extracted as "job_setup"
3. WhatsApp response appears on your phone
4. Notion record created
```

---

## What Happens Behind the Scenes

```
Your Phone: "new job for John"
         ↓
WhatsApp → Twilio → n8n Webhook
         ↓
Claude: "This is job_setup intent"
         ↓
n8n Routes: → Job handler
         ↓
Notion: Creates job record
         ↓
Twilio → WhatsApp: "Job created!"
         ↓
Your Phone: Response received
```

---

## Message Examples You Can Try

```
Job Setup:
  "new job for John Smith plumbing"
  
Cost Log:
  "material cost 45.50 euros"
  
Labour Log:
  "John worked 2 hours today"
  
Invoice:
  "create invoice"
  
Payment:
  "payment received 500 euros"
  
Unknown:
  "hello how are you"
```

---

## Troubleshooting

### Message Not Received
- [ ] Is workflow activated? (toggle switch in n8n)
- [ ] Is webhook URL registered in Twilio?
- [ ] Check webhook URL copied correctly

### Response Not Sending
- [ ] Are Twilio credentials correct?
- [ ] Check Twilio Account SID matches
- [ ] Check Auth Token is current

### Intent Wrong
- [ ] Add more examples to Claude prompt
- [ ] Check message matches one of the templates above
- [ ] Review Claude output in n8n logs

---

## Files for Reference

If you get stuck, read these:

1. **WHATSAPP_NODE_REFERENCE.md**
   - Detailed setup instructions
   - Configuration parameters
   - Credential management

2. **WHATSAPP_TEST_DATA.md**
   - Test messages to send
   - Expected responses
   - Common issues

3. **WHATSAPP_IMPLEMENTATION_CHECKLIST.md**
   - Complete step-by-step
   - Testing procedures
   - Verification steps

---

## Success Checklist

After completing these 5 steps:

- [ ] WhatsApp Webhook node exists
- [ ] Extract Intent node updated
- [ ] Send WhatsApp Response node created
- [ ] All nodes connected
- [ ] Webhook URL registered in Twilio
- [ ] Test message sent and received response
- [ ] Notion entry created
- [ ] Workflow active and monitoring

---

## What's Next?

Once working:

1. **Run full test suite** (see WHATSAPP_TEST_DATA.md)
2. **Test all intent types** (6 test messages)
3. **Verify Notion entries** (all tables populated)
4. **Run regression test** (voice workflow still works)
5. **Deploy to production** (activate for real contractors)

---

## Quick Reference: Node Configuration

### WhatsApp Webhook
- Type: Webhook
- Path: `whatsapp`
- Method: POST
- Auth: None

### HTTP Request Response
- URL: `api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages`
- Method: POST
- Auth: Basic (Account SID + Auth Token)

### Twilio Console
- Path: Messaging → Sandbox → WhatsApp
- Register URL from WhatsApp Webhook node

---

## Contact & Support

If you need help:

1. Review the reference documents in `/docs/`
2. Check n8n execution logs
3. Verify Twilio credentials in console
4. Test with sample payloads from WHATSAPP_TEST_DATA.md

---

**Time to Complete:** 30 minutes  
**Difficulty:** Moderate  
**Prerequisites:** Twilio account, n8n access, Notion setup

**You're ready to add WhatsApp to your Voice-to-Invoice system!**

Start with Step 1 now.
