# Microservices Architecture

## Database Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Main Supabase Database                    │
│  (Original: iirwgbdkdtktvledsqkb.supabase.co)              │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - profiles                                                  │
│  - donations (donation-service)                             │
│  - requests (request-service)                                │
│  - messages (messaging-service)                              │
│  - ratings                                                   │
│  - reports                                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (reads/writes)
                            │
                    ┌───────┴───────┐
                    │               │
            donation-service  request-service
            messaging-service
                            
┌─────────────────────────────────────────────────────────────┐
│              Campaign Supabase Database                      │
│  (New: xhkixkkslqvhkzsxddge.supabase.co)                    │
├─────────────────────────────────────────────────────────────┤
│  Tables:                                                     │
│  - campaigns (campaign-service)                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ (reads/writes)
                            │
                    campaign-service
```

## Service Communication (RabbitMQ)

```
┌─────────────────────────────────────────────────────────────┐
│                      RabbitMQ Message Broker                  │
│                    (amqp://rabbitmq:5672)                    │
└─────────────────────────────────────────────────────────────┘
         │           │           │           │
         │           │           │           │
    ┌────┴────┐ ┌───┴───┐ ┌─────┴─────┐ ┌───┴───┐
    │         │ │       │ │           │ │       │
donation  campaign messaging  request  │
service   service   service   service  │
    │         │       │         │      │
    └─────────┴───────┴─────────┴──────┘
              │
              │ Services send messages to each other
              │ Example: When a donation is created, 
              │          donation-service publishes event
              │          Other services can subscribe
```

## Key Points

### 1. Databases are SEPARATE
- ❌ Databases do NOT communicate with each other
- ❌ No direct database-to-database connection
- ✅ Each service connects to its own database

### 2. Services communicate via RabbitMQ
- ✅ Services send messages/events through RabbitMQ
- ✅ Example: `donation-service` can publish "donation.created" event
- ✅ Other services can subscribe to these events
- ✅ This is how services coordinate without sharing databases

### 3. Data Flow Example

**Scenario: User creates a campaign**

1. User → `campaign-service` (API call)
2. `campaign-service` → **Campaign Database** (writes campaign)
3. `campaign-service` → **RabbitMQ** (publishes "campaign.created" event)
4. Other services can listen to this event via RabbitMQ
5. Services react to the event (e.g., send notification, update cache)

**Scenario: Services need to share data**

- Services DON'T query each other's databases directly
- Services communicate via:
  - **RabbitMQ messages/events** (async)
  - **API calls** between services (sync)
  - **Shared data** through message payloads

## Current Setup

### Services and Their Databases:

| Service | Database | Connection |
|---------|----------|------------|
| donation-service | Main DB | `SUPABASE_URL` / `SUPABASE_KEY` |
| request-service | Main DB | `SUPABASE_URL` / `SUPABASE_KEY` |
| messaging-service | Main DB | `SUPABASE_URL` / `SUPABASE_KEY` |
| campaign-service | Campaign DB | `CAMPAIGN_SUPABASE_URL` / `CAMPAIGN_SUPABASE_KEY` |

### All Services Connect to:
- **RabbitMQ** (same instance) for inter-service communication

## Why Separate Databases?

✅ **Isolation**: Each service manages its own data
✅ **Scalability**: Can scale databases independently
✅ **Security**: Better access control per service
✅ **Maintenance**: Easier to backup/restore individual services

## Important Notes

⚠️ **Data Migration**: The migration SQL only creates the table structure. 
   - It does NOT copy existing data
   - If you need to copy data, you must do it manually

⚠️ **Cross-Service Queries**: Services cannot directly query each other's databases
   - Use RabbitMQ events or API calls instead

⚠️ **Data Consistency**: Since databases are separate, you need to handle:
   - Eventual consistency (via RabbitMQ)
   - Transaction coordination (via distributed transactions or saga pattern)
