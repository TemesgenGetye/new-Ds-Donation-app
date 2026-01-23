# 🚀 Quick Test: See Consumer Changes

## ⚡ 3-Step Test (2 minutes)

### Step 1: Open RabbitMQ Dashboard
1. Go to: `http://localhost:15672` (guest/guest)
2. Click **"Queues"** tab
3. Click on **`message.events.all`**
4. **Keep this tab open** - watch the numbers change

### Step 2: Watch Service Logs
Open terminal and run:
```bash
docker compose logs -f messaging-service | grep -E "(Published|CONSUMED|acknowledged)"
```

### Step 3: Send a Message from Your App
1. Open your app
2. Go to any campaign
3. Open chat
4. **Send a message**

## 👀 What You'll See

### In RabbitMQ Dashboard:
- **"Ready" count**: Goes up (message published) → Goes down (message consumed)
- **"Message rates"**: Shows activity spikes
- **"Consumers" section**: Shows messaging-service is active

### In Terminal:
```
📤 Published event to message_events/message.sent
💬 [CONSUMED] Message Event Received: message.sent
   → Message sent: [id]
   ✅ Message event acknowledged and removed from queue
```

### In Your App:
- Message appears in chat immediately

## 🎯 That's It!

**The consumer is working when:**
- ✅ RabbitMQ "Ready" count decreases after sending
- ✅ Terminal shows consumption logs
- ✅ Message appears in your app

**Keep all three open and send more messages to see the pattern!**
