# How to See Who is Consuming Messages in RabbitMQ

## 🎯 Current Consumers

### messaging-service
The messaging-service is currently consuming from **TWO** queues:

1. **Campaign Events Queue**: `campaign.events.all`
   - **Exchange**: `campaign_events`
   - **What it consumes**: All campaign events (campaign.created, campaign.status.changed, etc.)
   - **Purpose**: Listen to campaign events for notifications, logging, etc.

2. **Message Events Queue**: `message.events.all` ⭐ NEW
   - **Exchange**: `message_events`
   - **What it consumes**: All message events (message.sent, message.read)
   - **Purpose**: Listen to message events for notifications, real-time updates, etc.

## 📊 How to Check Consumers in RabbitMQ Dashboard

### Method 1: View Consumers in Queue Details (Easiest)

1. **Open RabbitMQ Dashboard**: `http://localhost:15672` (login: guest/guest)
2. **Go to "Queues" tab**
3. **Click on a queue** (e.g., `message.events.all` or `campaign.events.all`)
4. **Scroll down to "Consumers" section**
5. **You'll see**:
   - **Consumer tag**: Unique identifier (e.g., `amq.ctag-xxx`)
   - **Channel**: Channel number
   - **Connection**: Connection details (IP:port)
   - **Status**: Active/Idle
   - **Prefetch count**: How many messages it can process at once

### Method 2: View All Channels (Shows Consumer Count)

1. **Go to "Channels" tab**
2. **Look at the "Consumer" column**
   - Shows how many consumers are using each channel
   - If you see `1`, that means 1 consumer is active on that channel

### Method 3: View Connections (Shows Active Services)

1. **Go to "Connections" tab**
2. **You'll see all active connections**:
   - Each service has a connection
   - Shows IP address and port
   - Shows number of channels
   - **State**: Running/Idle

### Method 4: Check Queue Message Rates (Shows Consumption Activity)

1. **Go to "Queues" tab**
2. **Click on a queue** (e.g., `message.events.all`)
3. **Look at "Message rates" section**:
   - **deliver/get**: Messages consumed per second
   - **ack**: Messages acknowledged per second
   - If these numbers are increasing, messages are being consumed!

## 🔍 Step-by-Step: Check Who is Consuming Message Events

### Step 1: Open RabbitMQ Dashboard
```
http://localhost:15672
Login: guest / guest
```

### Step 2: Go to Queues Tab
- Click on **"Queues and Streams"** tab

### Step 3: Find the Queue
- Look for: `message.events.all`
- Or: `message.message_sent`
- Or: `message.message_read`

### Step 4: Click on the Queue
- Click on `message.events.all`

### Step 5: Scroll to Consumers Section
- Scroll down past the message rates
- Find the **"Consumers"** section
- You should see:
  ```
  Consumers (1)
  Consumer tag: amq.ctag-xxxxx
  Channel: 1
  Connection: 172.21.0.x:xxxxx
  ```

### Step 6: Check Message Activity
- **Ready**: Should decrease when messages are consumed
- **Unacked**: Messages currently being processed
- **Message rates → deliver/get**: Should show activity when consuming

## 🧪 Test Consumption

1. **Send a message** from your app (via messaging-service API)
2. **Watch the queue**:
   - Go to Queues → `message.events.all`
   - Watch "Ready" count
   - Check "Message rates" graph
3. **Check service logs**:
   ```bash
   docker compose logs -f messaging-service
   ```
   You should see:
   ```
   💬 [CONSUMED] Message Event Received: message.sent
   → Message sent: [message-id]
   ✅ Message event acknowledged and removed from queue
   ```

## 📋 Summary: Who is Consuming What

| Queue | Exchange | Consumer | What It Does |
|-------|----------|----------|--------------|
| `campaign.events.all` | `campaign_events` | messaging-service | Consumes campaign events, logs them |
| `message.events.all` | `message_events` | messaging-service | Consumes message events, logs them |
| `message.message_sent` | `message_events` | messaging-service | Receives message.sent events |
| `message.message_read` | `message_events` | messaging-service | Receives message.read events |

## 🔧 Adding More Consumers

If you want other services to consume message events, add this to their messaging config:

```typescript
// In any service's messaging.ts
export const consumeMessageEvents = async () => {
  const ch = getChannel();
  const queue = 'message.events.all';
  
  await ch.consume(queue, (msg) => {
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      // Process the message
      console.log('Consumed message event:', content);
      ch.ack(msg); // Acknowledge
    }
  });
};
```

## ⚠️ Important Notes

- **Multiple consumers** can consume from the same queue (load balancing)
- **Each message** is delivered to only ONE consumer (round-robin)
- **Unacked messages** are messages being processed (not yet acknowledged)
- **Ready messages** are waiting to be consumed
- **Consumers must acknowledge** messages to remove them from queue
