# RabbitMQ Consumer Guide

## How to See Who is Consuming Messages

### 1. **RabbitMQ Dashboard - Consumers Tab**

1. Open RabbitMQ Management: `http://localhost:15672`
2. Login: `guest` / `guest`
3. Go to **"Queues"** tab
4. Click on a queue (e.g., `campaign.events.all`)
5. Scroll down to **"Consumers"** section
6. You'll see:
   - **Consumer tag**: Unique identifier for the consumer
   - **Channel**: Channel number
   - **Connection**: Connection details
   - **Status**: Active/Idle

### 2. **RabbitMQ Dashboard - Channels Tab**

1. Go to **"Channels"** tab
2. You'll see all active channels
3. Each channel shows:
   - **Consumer count**: How many consumers are using this channel
   - **Message rates**: Messages consumed per second
   - **Unacked**: Messages being processed (not yet acknowledged)

### 3. **RabbitMQ Dashboard - Connections Tab**

1. Go to **"Connections"** tab
2. You'll see all active connections
3. Each connection shows:
   - **Name**: Connection identifier (usually IP:port)
   - **User**: Which user is connected
   - **Channels**: Number of channels on this connection
   - **State**: Running/Idle

## How to See When Messages are Consumed

### Method 1: RabbitMQ Dashboard (Real-time)

1. Go to **"Queues"** tab
2. Click on `campaign.events.all`
3. Watch these metrics:
   - **Message rates → deliver/get**: Messages consumed per second
   - **Message rates → ack**: Messages acknowledged per second
   - **Ready**: Messages waiting to be consumed (should decrease when consumed)
   - **Unacked**: Messages currently being processed

### Method 2: Service Logs (Detailed)

Check the messaging-service logs to see when messages are consumed:

```bash
docker compose logs -f messaging-service
```

You'll see logs like:
```
📨 [CONSUMED] Campaign Event Received: campaign.created
   → New campaign created: [campaign-id]
   ✅ Message acknowledged and removed from queue
```

### Method 3: Queue Details in Dashboard

1. Go to **"Queues"** → `campaign.events.all`
2. Click **"Get messages"** section
3. You can manually peek at messages (without consuming them)
4. Or check the **"Message rates"** graph to see consumption over time

## Current Consumers

### messaging-service
- **Queue**: `campaign.events.all`
- **Exchange**: `campaign_events`
- **Routing Key**: `#` (all topics)
- **Status**: Active
- **What it does**: 
  - Consumes all campaign events
  - Logs when events are received
  - Acknowledges messages (removes from queue)
  - Can be extended to send notifications, update caches, etc.

## Testing Consumption

1. **Create a campaign** in your app
2. **Watch the logs**:
   ```bash
   docker compose logs -f messaging-service
   ```
3. **Check RabbitMQ Dashboard**:
   - Go to Queues → `campaign.events.all`
   - Watch "Ready" count decrease
   - Check "Message rates" for consumption activity
   - See consumer in "Consumers" section

## Adding More Consumers

To add consumers in other services, use this pattern:

```typescript
// In your service's messaging.ts
export const consumeCampaignEvents = async () => {
  const ch = getChannel();
  const queue = 'campaign.events.all';
  
  await ch.consume(queue, (msg) => {
    if (msg) {
      const content = JSON.parse(msg.content.toString());
      // Process the message
      console.log('Consumed:', content);
      ch.ack(msg); // Acknowledge
    }
  });
};
```

## Troubleshooting

### No Consumers Showing?
- Check if messaging-service is running: `docker compose ps`
- Check logs: `docker compose logs messaging-service`
- Verify RabbitMQ connection in logs

### Messages Not Being Consumed?
- Check if queue has messages: RabbitMQ Dashboard → Queues
- Check consumer is active: RabbitMQ Dashboard → Queues → Consumers
- Check service logs for errors

### Messages Stuck in Queue?
- Consumer might have crashed - restart the service
- Check for unacknowledged messages (Unacked count)
- Verify consumer is properly acknowledging messages
