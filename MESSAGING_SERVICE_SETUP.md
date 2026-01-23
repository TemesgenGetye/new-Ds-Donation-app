# Messaging Service - Separate Database Setup

## ✅ What Has Been Done

### 1. Database Configuration
- ✅ Created `messages_migration.sql` for the new messaging database
- ✅ Updated `messaging-service/src/config/database.ts` to use `MESSAGING_SUPABASE_URL` and `MESSAGING_SUPABASE_KEY`
- ✅ Removed fallback to old `SUPABASE_URL`/`SUPABASE_KEY`

### 2. Docker Configuration
- ✅ Updated `docker-compose.yml` to use new messaging database variables
- ✅ Explicitly unset old `SUPABASE_URL` and `SUPABASE_KEY` to prevent fallback

### 3. RabbitMQ Configuration
- ✅ Updated `publishEvent` to use `message_events` exchange (topic type)
- ✅ Creates queues bound to exchange for dashboard visibility
- ✅ Consumer set up to listen for campaign events

### 4. Frontend Updates
- ✅ Updated `app/(tabs)/campaigns.tsx` to call messaging-service API
- ✅ Updated `app/campaing-details.tsx` to call messaging-service API
- ✅ Added helper function for messaging service URL (uses IP for mobile)

## 📋 Setup Steps

### Step 1: Add Environment Variables

Add these to your root `.env` file:

```env
# Messaging Service Database (NEW separate database)
MESSAGING_SUPABASE_URL=https://tcrsdlenfgebquybnkbo.supabase.co
MESSAGING_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcnNkbGVuZmdlYnF1eWJua2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY3OTUsImV4cCI6MjA4NDY5Mjc5NX0.ivlN_M5Nv7_88b4A7pX_Gz4-f6opq7kM3Su3Q1bieuA
```

### Step 2: Run Migration SQL

1. Go to your new Supabase project: https://tcrsdlenfgebquybnkbo.supabase.co
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `microservices/messaging-service/messages_migration.sql`
4. Click **Run** to execute
5. Verify the `messages` table was created

### Step 3: Rebuild and Restart

```bash
docker compose up --build -d messaging-service
```

### Step 4: Verify Connection

Check the logs:
```bash
docker compose logs messaging-service | grep "connecting to"
```

You should see:
```
🔗 Messaging Service connecting to: https://tcrsdlenfgebquybnkbo.supabase.co
```

## 🎯 API Endpoints

The messaging-service provides these endpoints:

- **Create Message**: `POST http://localhost:3003/api/messages`
  ```json
  {
    "sender_id": "uuid",
    "receiver_id": "uuid",
    "content": "message text",
    "campaign_id": "uuid (optional)",
    "donation_id": "uuid (optional)"
  }
  ```

- **Get Messages**: `GET http://localhost:3003/api/messages?sender_id=...&receiver_id=...&campaign_id=...`
  
- **Mark as Read**: `PATCH http://localhost:3003/api/messages/:id/read`

## 🔔 RabbitMQ Events

The messaging-service publishes these events:

- `message.sent` - When a new message is created
- `message.read` - When a message is marked as read

Exchange: `message_events` (topic type)
Queues:
- `message.events.all` - All message events
- `message.message_sent` - Message sent events
- `message.message_read` - Message read events

## 📊 RabbitMQ Dashboard

After setup, you should see in RabbitMQ Dashboard:

1. **Exchanges Tab**: `message_events` exchange
2. **Queues Tab**: 
   - `message.events.all`
   - `message.message_sent`
   - `message.message_read`
3. **Consumers Tab**: messaging-service consuming from `campaign.events.all` (campaign events)

## 🧪 Testing

1. **Test message creation**:
   ```bash
   curl -X POST http://localhost:3003/api/messages \
     -H "Content-Type: application/json" \
     -d '{
       "sender_id": "test-sender",
       "receiver_id": "test-receiver",
       "content": "Test message"
     }'
   ```

2. **Check RabbitMQ Dashboard**:
   - Go to `http://localhost:15672` → Queues
   - You should see messages in `message.message_sent` queue

3. **Check service logs**:
   ```bash
   docker compose logs -f messaging-service
   ```

## 📝 Frontend Integration

The frontend now calls the messaging-service API:

- **Campaigns Screen**: `handleMessageCampaign` uses API
- **Campaign Details**: `handleSendMessage` uses API
- **Fetch Messages**: Uses API with fallback to direct Supabase

## ⚠️ Important Notes

1. **Environment Variables**: Make sure to add `MESSAGING_SUPABASE_URL` and `MESSAGING_SUPABASE_KEY` to your `.env` file
2. **Migration**: Run the SQL migration in your new Supabase project
3. **Network**: Frontend uses IP address (`192.168.1.3:3003`) for mobile devices
4. **Storage**: A `message-attachments` bucket is created for future file attachments

## 🔍 Troubleshooting

### Service not connecting to new database?
- Check `.env` file has `MESSAGING_SUPABASE_URL` and `MESSAGING_SUPABASE_KEY`
- Restart service: `docker compose restart messaging-service`

### Messages not appearing in RabbitMQ?
- Check service logs for publish errors
- Verify exchange `message_events` exists in RabbitMQ dashboard
- Check queues are bound to the exchange

### Frontend can't reach messaging-service?
- Verify service is running: `docker compose ps messaging-service`
- Check IP address is correct (update `MACHINE_IP` in frontend code if needed)
- Ensure phone and computer are on same WiFi network
