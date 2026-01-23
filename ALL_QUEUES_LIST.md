# All RabbitMQ Queues Created

## 📊 Complete Queue List

### Donation Service Queues
**Exchange**: `donation_events`

1. `donation.events.all` - All donation events (default queue)
2. `donation.donation_created` - When donation is created
3. `donation.donation_status_changed` - When donation status changes
4. `donation.donation_deleted` - When donation is deleted

**Consumes from:**
- `campaign.events.all` (from campaign-service)
- `request.events.all` (from request-service)

---

### Campaign Service Queues
**Exchange**: `campaign_events`

1. `campaign.events.all` - All campaign events (default queue)
2. `campaign.campaign_created` - When campaign is created
3. `campaign.campaign_status_changed` - When campaign status changes
4. `campaign.campaign_contributed` - When someone contributes to campaign
5. `campaign.campaign_completed` - When campaign goal is reached
6. `campaign.campaign_deleted` - When campaign is deleted

**Consumes from:**
- `donation.events.all` (from donation-service)
- `request.events.all` (from request-service)

---

### Request Service Queues
**Exchange**: `request_events`

1. `request.events.all` - All request events (default queue)
2. `request.request_created` - When request is created
3. `request.request_status_changed` - When request status changes (approved/rejected)

**Consumes from:**
- `campaign.events.all` (from campaign-service)
- `donation.events.all` (from donation-service)

---

### Messaging Service Queues
**Exchange**: `message_events`

1. `message.events.all` - All message events (default queue)
2. `message.message_sent` - When message is sent
3. `message.message_read` - When message is read

**Consumes from:**
- `campaign.events.all` (from campaign-service)
- `request.events.all` (from request-service)
- `message.events.all` (from itself)

---

## 🎯 Total Queues: 17+

### By Service:
- **Donation Service**: 4 queues
- **Campaign Service**: 6 queues
- **Request Service**: 3 queues
- **Messaging Service**: 3 queues
- **Cross-consumption**: 3 queues (shared)

## 📍 Where to See Them

1. **RabbitMQ Dashboard**: `http://localhost:15672`
2. **Login**: `guest` / `guest`
3. **Go to**: "Queues" tab
4. **You'll see**: All queues listed above

## ✅ All Queues Created on Startup

All queues are now created automatically when services start, so they're visible in RabbitMQ dashboard even before any events are published!
