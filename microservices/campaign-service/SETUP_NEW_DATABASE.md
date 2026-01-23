# Campaign Service - New Database Setup

## Overview
Campaign service now uses a **separate Supabase database** for better isolation and scalability.

## Database Credentials
- **Project URL**: https://xhkixkkslqvhkzsxddge.supabase.co
- **API Key**: (stored in .env as CAMPAIGN_SUPABASE_KEY)

## Setup Steps

### 1. Run the Migration
You need to run the migration SQL file on your new Supabase database:

1. Go to your Supabase dashboard: https://xhkixkkslqvhkzsxddge.supabase.co
2. Navigate to **SQL Editor**
3. Copy the contents of `campaigns_migration.sql`
4. Paste and execute it in the SQL Editor

This will create:
- `campaign_status` enum type
- `campaigns` table with all required columns
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers for automatic `updated_at` timestamp
- Realtime publication for the campaigns table

### 2. Verify the Setup
After running the migration, verify the table was created:
```sql
SELECT * FROM campaigns LIMIT 1;
```

### 3. Test the Connection
The campaign-service will automatically connect to the new database using the credentials in `.env`:
- `CAMPAIGN_SUPABASE_URL`
- `CAMPAIGN_SUPABASE_KEY`

## Important Notes

- ✅ The original campaigns table in the main database is **NOT removed** - it's still there
- ✅ This is a **copy** of the campaigns table structure in a new database
- ✅ Campaign service now uses the new database exclusively
- ✅ Other services (donation, messaging, request) continue using the original database

## Environment Variables

The service checks for these environment variables (in order):
1. `CAMPAIGN_SUPABASE_URL` and `CAMPAIGN_SUPABASE_KEY` (preferred)
2. Falls back to `SUPABASE_URL` and `SUPABASE_KEY` if campaign-specific ones are not set

## Restart Services

After setting up the new database, restart the campaign-service:
```bash
docker compose restart campaign-service
```

Or rebuild and restart:
```bash
docker compose up --build -d campaign-service
```
