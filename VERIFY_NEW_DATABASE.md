# Verify Campaign Service is Using New Database

## Quick Test

After rebuilding, test by creating a campaign:

1. **Create a campaign** via the API or your frontend
2. **Check the new database**: https://xhkixkkslqvhkzsxddge.supabase.co
   - Go to **Table Editor** → `campaigns` table
   - You should see the new campaign there

3. **Check the old database**: https://iirwgbdkdtktvledsqkb.supabase.co
   - Go to **Table Editor** → `campaigns` table  
   - It should NOT have the new campaign (or it's the old one)

## Verify Environment Variables

```bash
docker compose exec campaign-service env | grep CAMPAIGN_SUPABASE
```

Should show:
```
CAMPAIGN_SUPABASE_URL=https://xhkixkkslqvhkzsxddge.supabase.co
CAMPAIGN_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Check Service Logs

```bash
docker compose logs campaign-service | grep -i "supabase\|database\|campaign"
```

## If Still Using Old Database

1. Make sure you rebuilt: `docker compose build campaign-service`
2. Make sure you restarted: `docker compose up -d campaign-service`
3. Check environment variables are set correctly
4. Verify the `.env` file has the correct values
