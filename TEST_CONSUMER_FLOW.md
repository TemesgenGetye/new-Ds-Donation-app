# 🧪 Test Consumer Flow - Step by Step

## Quick Test (5 minutes)

### Step 1: Open RabbitMQ Dashboard
```
http://localhost:15672
Login: guest / guest
```

1. Click **"Queues"** tab
2. Click on **`message.events.all`**
3. **Keep this tab open** - you'll watch it update

### Step 2: Open Terminal to Watch Logs
```bash
docker compose logs -f messaging-service | grep -E "(Published|CONSUMED|acknowledged)"
```

**Keep this terminal open** - you'll see consumption in real-time

### Step 3: Open Your App
1. Open your app on your phone
2. Navigate to a **Campaign** (any campaign)
3. Click **"Message"** or open the chat

### Step 4: Send a Message
1. Type a message: "Testing consumer!"
2. Click **Send**

### Step 5: Watch All Three Places Simultaneously

#### ✅ In RabbitMQ Dashboard:
- **Before sending**: "Ready" = 0
- **After sending**: "Ready" increases (message published)
- **After 1-2 seconds**: "Ready" decreases (message consumed!)
- **Message rates → deliver/get**: Shows a spike
- **Consumers section**: Shows messaging-service is active

#### ✅ In Terminal:
You'll see:
```
📤 Published event to message_events/message.sent
💬 [CONSUMED] Message Event Received: message.sent
   → Message sent: [id]
   → From: [sender] → To: [receiver]
   ✅ Message event acknowledged and removed from queue
```

#### ✅ In Your App:
- Message appears in chat immediately
- Real-time updates work

## 📊 What You're Seeing

### The Flow:
```
Your App (Send Message)
    ↓
Messaging Service API
    ↓
1. Saves to Database ✅
2. Publishes to RabbitMQ ✅
    ↓
RabbitMQ Queue (message.events.all)
    ↓
Consumer (messaging-service) picks it up ✅
    ↓
Consumer processes it ✅
    ↓
Consumer acknowledges (removes from queue) ✅
```

### In RabbitMQ Dashboard:
- **Ready**: Messages waiting (should go to 0 after consumption)
- **Unacked**: Messages being processed (brief spike, then 0)
- **Total**: Ready + Unacked
- **Message rates**: Shows activity over time

## 🎯 Multiple Messages Test

1. Send 5 messages quickly
2. Watch RabbitMQ:
   - "Ready" count goes up to 5
   - Then decreases one by one as consumed
   - Message rates show activity
3. Watch Terminal:
   - See 5 publish events
   - See 5 consumption events
   - Each one acknowledged

## 🔍 Detailed Monitoring

### Option 1: Watch Queue in Real-Time
1. RabbitMQ Dashboard → Queues → `message.events.all`
2. Enable auto-refresh (every 1 second)
3. Watch "Ready" count change
4. Watch "Message rates" graph

### Option 2: Watch All Queues
1. RabbitMQ Dashboard → Queues
2. See all queues:
   - `message.events.all` - All message events
   - `message.message_sent` - Sent messages
   - `message.message_read` - Read messages
   - `campaign.events.all` - Campaign events

### Option 3: Watch Consumers
1. RabbitMQ Dashboard → Queues → `message.events.all`
2. Scroll to "Consumers" section
3. See:
   - Consumer tag
   - Channel number
   - Connection (messaging-service)
   - Status: Active

## 💡 Pro Tips

1. **Keep RabbitMQ dashboard open** while testing
2. **Use auto-refresh** for real-time updates
3. **Watch the graph** - shows activity over time
4. **Send multiple messages** to see queue fill and drain
5. **Check terminal logs** for detailed consumption info

## 🐛 Troubleshooting

### Not seeing consumption?
- Check service is running: `docker compose ps`
- Check logs: `docker compose logs messaging-service`
- Verify consumer in RabbitMQ dashboard

### Messages stuck?
- Check "Unacked" count
- Restart service: `docker compose restart messaging-service`

### No changes in dashboard?
- Refresh the page
- Check you're on the right queue
- Verify messages are being published
