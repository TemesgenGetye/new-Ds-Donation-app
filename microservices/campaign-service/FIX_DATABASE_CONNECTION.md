# Fix: Campaign Service Using Wrong Database

## Problem
Campaigns are being created in the old database instead of the new Campaign Database.

## Root Cause
The Docker image has old compiled code that doesn't check for `CAMPAIGN_SUPABASE_URL` and `CAMPAIGN_SUPABASE_KEY`.

## Solution: Rebuild the Service

The service needs to be rebuilt to include the updated code that uses the new database credentials.

### Step 1: Rebuild and Restart

```bash
cd "/Users/temesgengetye/Desktop/Final Donation Ds"
docker compose build campaign-service
docker compose up -d campaign-service
```

### Step 2: Verify Environment Variables

Check that the container has the correct environment variables:

```bash
docker compose exec campaign-service env | grep CAMPAIGN_SUPABASE
```

You should see:
```
CAMPAIGN_SUPABASE_URL=https://xhkixkkslqvhkzsxddge.supabase.co
CAMPAIGN_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Check Service Logs

```bash
docker compose logs campaign-service
```

The service should start without errors and connect to the new database.

### Step 4: Test

Create a campaign and verify it goes to the new database:
- Old database: https://iirwgbdkdtktvledsqkb.supabase.co
- New database: https://xhkixkkslqvhkzsxddge.supabase.co

## Verification

After rebuilding, the service should:
1. ✅ Use `CAMPAIGN_SUPABASE_URL` and `CAMPAIGN_SUPABASE_KEY`
2. ✅ Connect to the new Campaign Database
3. ✅ Create campaigns in the new database's `campaigns` table

## If Rebuild Fails

If you get network errors during rebuild, try:
1. Check your internet connection
2. Restart Docker Desktop
3. Try again: `docker compose build campaign-service`

## Quick Check

To see which database the service is currently using, check the logs:
```bash
docker compose logs campaign-service | grep -i "supabase\|database\|connect"
```

The service should connect to: `xhkixkkslqvhkzsxddge.supabase.co` (new database)
