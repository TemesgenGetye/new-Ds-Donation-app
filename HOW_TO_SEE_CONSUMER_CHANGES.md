# How to See Consumer Changes in Real-Time

## 🎯 Complete Test Flow

### Step 1: Open RabbitMQ Dashboard (Keep it Open)
1. Open: `http://localhost:15672` (guest/guest)
2. Go to **"Queues"** tab
3. Click on **`message.events.all`** queue
4. Keep this tab open and visible

### Step 2: Open Service Logs (Terminal)
Open a terminal and run:
```bash
docker compose logs -f messaging-service
```
Keep this running to see consumption in real-time.

### Step 3: Send a Message from Your App
1. Open your app on your phone
2. Go to a campaign detail page
3. Send a message in the chat

### Step 4: Watch the Changes Happen!

**In RabbitMQ Dashboard:**
- **Before sending**: "Ready" count = 0
- **After sending**: "Ready" count increases (message published)
- **After consumption**: "Ready" count decreases (message consumed)
- **Message rates → deliver/get**: Shows consumption activity
- **Consumers section**: Shows messaging-service is active

**In Terminal Logs:**
You'll see:
```
📤 Published event to message_events/message.sent
💬 [CONSUMED] Message Event Received: message.sent
   → Message sent: [message-id]
   → From: [sender-id] → To: [receiver-id]
   ✅ Message event acknowledged and removed from queue
```

**In Your App:**
- Message appears in chat immediately
- Real-time subscription updates the UI

## 📊 What to Look For

### In RabbitMQ Dashboard - Queue Details

1. **Message Counts**:
   - **Ready**: Messages waiting to be consumed
   - **Unacked**: Messages being processed right now
   - **Total**: Ready + Unacked

2. **Message Rates** (Graph):
   - **Publish rate**: Messages being published (incoming)
   - **Deliver/get rate**: Messages being consumed (outgoing)
   - **Ack rate**: Messages being acknowledged

3. **Consumers Section**:
   - Shows who is consuming
   - Consumer tag, channel, connection details
   - Status: Active/Idle

### In Service Logs

Look for these patterns:
- `📤 Published event` - Message published to RabbitMQ
- `💬 [CONSUMED] Message Event Received` - Message consumed
- `✅ Message event acknowledged` - Message removed from queue

## 🧪 Step-by-Step Test

### Test 1: Send a Message and Watch Consumption

1. **Prepare**:
   - Open RabbitMQ Dashboard → Queues → `message.events.all`
   - Open terminal: `docker compose logs -f messaging-service`
   - Open your app → Campaign details → Chat

2. **Send a message** in the app

3. **Watch RabbitMQ Dashboard**:
   - See "Ready" count increase briefly
   - See "Message rates → deliver/get" spike
   - See consumer activity

4. **Watch Terminal**:
   - See publish log
   - See consumption log
   - See acknowledgment

5. **Watch Your App**:
   - Message appears in chat
   - UI updates in real-time

### Test 2: Send Multiple Messages

1. Send 3-5 messages quickly
2. Watch RabbitMQ:
   - "Ready" count goes up and down
   - Message rates show activity
   - Consumer processes them one by one

3. Watch Logs:
   - See multiple consumption events
   - Each message is processed and acknowledged

## 🔍 Real-Time Monitoring Setup

### Option 1: Three-Window Setup (Recommended)

**Window 1: RabbitMQ Dashboard**
- `http://localhost:15672` → Queues → `message.events.all`
- Watch message counts and rates

**Window 2: Terminal Logs**
```bash
docker compose logs -f messaging-service
```
- Watch consumption in real-time

**Window 3: Your App**
- Send messages and see them appear

### Option 2: Use RabbitMQ Dashboard Auto-Refresh

1. In RabbitMQ Dashboard
2. Set refresh to "every 1 second"
3. Watch the numbers update in real-time

## 📱 What Changes You'll See

### When You Send a Message:

1. **RabbitMQ Dashboard**:
   - ✅ "Ready" count increases (message published)
   - ✅ "Message rates → publish" shows activity
   - ✅ "Ready" count decreases (message consumed)
   - ✅ "Message rates → deliver/get" shows activity
   - ✅ "Message rates → ack" shows acknowledgment

2. **Service Logs**:
   - ✅ `📤 Published event to message_events/message.sent`
   - ✅ `💬 [CONSUMED] Message Event Received`
   - ✅ `✅ Message event acknowledged`

3. **Your App**:
   - ✅ Message appears in chat
   - ✅ Real-time subscription updates UI

## 🎬 Complete Test Scenario

1. **Open RabbitMQ Dashboard** → Queues → `message.events.all`
2. **Open Terminal**: `docker compose logs -f messaging-service`
3. **Open Your App** → Go to campaign → Open chat
4. **Send a message**: "Hello, testing consumer!"
5. **Watch all three simultaneously**:
   - Dashboard: See message count change
   - Terminal: See consumption log
   - App: See message appear

## 💡 Pro Tips

- **Keep RabbitMQ dashboard open** while testing
- **Use auto-refresh** (every 1-2 seconds) for real-time updates
- **Watch the "Message rates" graph** - it shows activity over time
- **Check "Consumers" section** - confirms consumer is active
- **Multiple messages**: Send several quickly to see queue fill up and drain

## 🐛 Troubleshooting

### Not seeing consumption?
- Check if messaging-service is running: `docker compose ps`
- Check logs for errors: `docker compose logs messaging-service`
- Verify consumer is active in RabbitMQ dashboard

### Messages stuck in queue?
- Check "Unacked" count - might be processing
- Check service logs for errors
- Restart service if needed: `docker compose restart messaging-service`

### No changes in dashboard?
- Refresh the page
- Check if you're looking at the right queue
- Verify messages are being published (check publish logs)
