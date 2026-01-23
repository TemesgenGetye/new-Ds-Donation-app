# Request Service Setup Guide

## 🎯 Overview
This guide will help you set up the request-service with its own separate Supabase database.

## 📋 Prerequisites
- New Supabase project created
- Supabase URL: `https://ivpnnctdgzhixklvewto.supabase.co`
- Supabase Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cG5uY3RkZ3poaXhrbHZld3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjAzNzQsImV4cCI6MjA4NDY5NjM3NH0.G9M2HnycixaCecfTomEa_xxmtsJIYo4GhMbDhqQbWZk`

## 🔧 Step 1: Add Environment Variables

Add these to your `.env` file:

```env
REQUEST_SUPABASE_URL=https://ivpnnctdgzhixklvewto.supabase.co
REQUEST_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2cG5uY3RkZ3poaXhrbHZld3RvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxMjAzNzQsImV4cCI6MjA4NDY5NjM3NH0.G9M2HnycixaCecfTomEa_xxmtsJIYo4GhMbDhqQbWZk
```

## 🗄️ Step 2: Run SQL Migration

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `microservices/request-service/requests_migration.sql`
4. Click **Run** to execute the migration

This will create:
- `requests` table
- `request_status` enum type
- RLS policies
- Indexes
- Triggers

## 🐳 Step 3: Rebuild and Start Service

```bash
docker compose up --build -d request-service
```

## ✅ Step 4: Verify Setup

1. **Check service logs:**
   ```bash
   docker compose logs -f request-service
   ```

2. **Check RabbitMQ:**
   - Open: `http://localhost:15672`
   - Go to **Exchanges** → Look for `request_events`
   - Go to **Queues** → Look for `request.events.all`

3. **Test the API:**
   ```bash
   curl http://localhost:3004/health
   ```

## 📊 Events Published

The request-service publishes these events to RabbitMQ:

- `request.created` - When a new request is created
- `request.status.changed` - When request status changes (pending → approved/rejected)

## 🔍 Monitoring

Watch RabbitMQ dashboard for:
- **Exchange**: `request_events`
- **Queues**: 
  - `request.events.all` (all request events)
  - `request.request_created` (created events)
  - `request.request_status_changed` (status change events)

## 🎉 Done!

Your request-service is now set up with its own database and RabbitMQ integration!
