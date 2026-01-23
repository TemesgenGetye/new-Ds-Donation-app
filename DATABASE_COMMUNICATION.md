# Database Communication Explained

## Quick Answer

### ❌ Databases DO NOT communicate with each other
- The **Main Database** and **Campaign Database** are completely separate
- They have no connection to each other
- Data in one database is NOT automatically in the other

### ✅ Services communicate via RabbitMQ
- Services send **messages/events** through RabbitMQ
- This is how services coordinate without sharing databases

## Why You Might See Data in the New Database

The migration SQL file (`campaigns_migration.sql`) **ONLY creates the table structure** - it does NOT copy any data.

If you're seeing data in the new database, it could be because:

1. ✅ **Campaign-service is already running** and writing new campaigns to the new database
2. ✅ **You manually inserted data** into the new database
3. ✅ **There was existing data** in that Supabase project
4. ❌ **NOT because the migration copied data** (it doesn't)

## How Services Actually Communicate

### Example: Creating a Campaign

```
1. User creates campaign via API
   ↓
2. campaign-service receives request
   ↓
3. campaign-service writes to Campaign Database
   (xhkixkkslqvhkzsxddge.supabase.co)
   ↓
4. campaign-service publishes event to RabbitMQ
   "campaign.created" event with campaign data
   ↓
5. Other services can listen to this event
   - donation-service might send notification
   - messaging-service might create a message
   - etc.
```

### Code Example

When `campaign-service` creates a campaign, it does this:

```typescript
// 1. Write to Campaign Database
const { data: campaign } = await supabase
  .from('campaigns')
  .insert({ ...data })
  .select()
  .single();

// 2. Publish event to RabbitMQ (other services can listen)
await publishEvent('campaign.created', {
  campaignId: campaign.id,
  recipientId: campaign.recipient_id,
  title: campaign.title,
  // ... other data
});
```

## Data Flow Diagram

```
┌─────────────────┐         ┌─────────────────┐
│  Main Database  │         │ Campaign Database│
│  (Original)     │         │  (New)          │
└─────────────────┘         └─────────────────┘
         │                           │
         │                           │
         │                           │
    ┌────┴────┐                 ┌────┴────┐
    │         │                 │         │
donation   messaging        campaign  (writes
service   service          service   campaigns)
    │         │                 │
    └────┬────┘                 │
         │                      │
         └──────────┬───────────┘
                    │
              ┌─────┴─────┐
              │  RabbitMQ │
              │  (Events) │
              └───────────┘
                    │
         Services send messages here
         (NOT database queries!)
```

## Important Points

### 1. No Direct Database Queries Between Services
- `donation-service` **CANNOT** query the Campaign Database directly
- `campaign-service` **CANNOT** query the Main Database directly
- Each service only accesses its own database

### 2. Communication Happens via Events
- Services publish events when something happens
- Other services subscribe to events they care about
- Events contain the data needed (not database queries)

### 3. If You Need to Copy Existing Data

If you want to copy existing campaigns from the old database to the new one:

1. **Export from old database:**
   ```sql
   -- Run in Main Database
   SELECT * FROM campaigns;
   ```

2. **Import to new database:**
   ```sql
   -- Run in Campaign Database
   INSERT INTO campaigns (id, recipient_id, title, ...)
   VALUES (...);
   ```

3. **Or use a data migration script** (not included in the migration file)

## Summary

| Question | Answer |
|----------|--------|
| Do databases communicate? | ❌ No, they are completely separate |
| Do services communicate? | ✅ Yes, via RabbitMQ events |
| Why is there data in new DB? | Because campaign-service writes there, or you added it manually |
| Can services query each other's DBs? | ❌ No, each service only uses its own database |
| How do services share data? | ✅ Through RabbitMQ events/messages |
