# Setup Messaging Service with Separate Database

This guide will help you set up the messaging-service to use a dedicated Supabase database.

## Step 1: Create New Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project (or use existing one)
3. Note down:
   - Project URL: `https://tcrsdlenfgebquybnkbo.supabase.co`
   - Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## Step 2: Run Migration SQL

1. Go to your new Supabase project
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `messages_migration.sql`
4. Click **Run** to execute the migration
5. Verify the `messages` table was created

## Step 3: Update Environment Variables

Add these to your root `.env` file:

```env
# Messaging Service Database (NEW separate database)
MESSAGING_SUPABASE_URL=https://tcrsdlenfgebquybnkbo.supabase.co
MESSAGING_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjcnNkbGVuZmdlYnF1eWJua2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMTY3OTUsImV4cCI6MjA4NDY5Mjc5NX0.ivlN_M5Nv7_88b4A7pX_Gz4-f6opq7kM3Su3Q1bieuA
```

## Step 4: Rebuild and Restart Services

```bash
docker compose up --build -d messaging-service
```

## Step 5: Verify Connection

Check the logs to confirm it's connecting to the new database:

```bash
docker compose logs messaging-service | grep "connecting to"
```

You should see:
```
🔗 Messaging Service connecting to: https://tcrsdlenfgebquybnkbo.supabase.co
```

## Step 6: Test the Service

1. Check health endpoint:
   ```bash
   curl http://localhost:3003/health
   ```

2. Create a test message via API:
   ```bash
   curl -X POST http://localhost:3003/api/messages \
     -H "Content-Type: application/json" \
     -d '{
       "sender_id": "test-sender-id",
       "receiver_id": "test-receiver-id",
       "content": "Test message"
     }'
   ```

## What Changed

- ✅ `messaging-service` now uses `MESSAGING_SUPABASE_URL` and `MESSAGING_SUPABASE_KEY`
- ✅ Old `SUPABASE_URL` and `SUPABASE_KEY` are explicitly unset in docker-compose
- ✅ Service will ONLY connect to the new messaging database
- ✅ RabbitMQ consumer is set up to listen for campaign events
- ✅ Messages table with RLS policies created in new database

## Frontend Integration

The frontend should call the messaging-service API instead of directly accessing Supabase:

- **Create message**: `POST http://localhost:3003/api/messages`
- **Get messages**: `GET http://localhost:3003/api/messages?sender_id=...&receiver_id=...`
- **Mark as read**: `PATCH http://localhost:3003/api/messages/:id/read`

## Storage Bucket

A storage bucket `message-attachments` is created for future file attachments in messages. Currently, messages only support text content.
