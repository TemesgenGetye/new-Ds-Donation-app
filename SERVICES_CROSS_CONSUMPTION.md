# Services Cross-Consumption Setup

## 🎯 Overview
All three services (donation-service, campaign-service, request-service) now consume each other's events via RabbitMQ.

## 📊 Event Flow

### Donation Service
- **Publishes**: `donation.created`, `donation.status.changed`, `donation.deleted`
- **Consumes**: 
  - Campaign events (`campaign_events` exchange)
  - Request events (`request_events` exchange)

### Campaign Service
- **Publishes**: `campaign.created`, `campaign.status.changed`, `campaign.contributed`, `campaign.completed`, `campaign.deleted`
- **Consumes**:
  - Donation events (`donation_events` exchange)
  - Request events (`request_events` exchange)

### Request Service
- **Publishes**: `request.created`, `request.status.changed`
- **Consumes**:
  - Campaign events (`campaign_events` exchange)
  - Donation events (`donation_events` exchange)

## 🔍 RabbitMQ Exchanges

1. **donation_events** - Donation service events
2. **campaign_events** - Campaign service events
3. **request_events** - Request service events
4. **message_events** - Messaging service events (separate)

## 📋 Queues Created

Each service creates:
- `{service}.events.all` - Default queue for all events from that service
- `{service}.{event_type}` - Specific queues for each event type

## ✅ Verification

1. **Check RabbitMQ Dashboard**: `http://localhost:15672`
   - Go to **Exchanges** → Should see all 4 exchanges
   - Go to **Queues** → Should see queues for each service

2. **Check Service Logs**:
   ```bash
   docker compose logs -f donation-service | grep CONSUMED
   docker compose logs -f campaign-service | grep CONSUMED
   docker compose logs -f request-service | grep CONSUMED
   ```

3. **Test Events**:
   - Create a donation → Check campaign-service and request-service logs
   - Create a campaign → Check donation-service and request-service logs
   - Create a request → Check donation-service and campaign-service logs

## 🎉 All Services Are Now Connected!

Each service can now react to events from the other services, enabling:
- Real-time updates
- Event-driven architecture
- Loose coupling between services
