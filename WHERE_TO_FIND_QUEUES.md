# Where to Find Queues in RabbitMQ

## 🎯 Quick Access

**RabbitMQ Dashboard**: `http://localhost:15672`
- **Username**: `guest`
- **Password**: `guest`

## 📊 Where to Find Queues

### Step 1: Open RabbitMQ Dashboard
1. Go to: `http://localhost:15672`
2. Login with: `guest` / `guest`

### Step 2: Go to Queues Tab
1. Click on **"Queues"** tab at the top
2. You'll see all queues listed

## 🔍 Queues for Each Service

### Donation Service Queues
- **Exchange**: `donation_events`
- **Queues**:
  - `donation.events.all` - All donation events
  - `donation.donation_created` - When donation is created
  - `donation.donation_status_changed` - When status changes
  - `donation.donation_deleted` - When donation is deleted

### Campaign Service Queues
- **Exchange**: `campaign_events`
- **Queues**:
  - `campaign.events.all` - All campaign events
  - `campaign.campaign_created` - When campaign is created
  - `campaign.campaign_status_changed` - When status changes
  - `campaign.campaign_contributed` - When someone contributes
  - `campaign.campaign_completed` - When goal is reached
  - `campaign.campaign_deleted` - When campaign is deleted

### Request Service Queues
- **Exchange**: `request_events`
- **Queues**:
  - `request.events.all` - All request events
  - `request.request_created` - When request is created
  - `request.request_status_changed` - When status changes

### Messaging Service Queues
- **Exchange**: `message_events`
- **Queues**:
  - `message.events.all` - All message events
  - `message.message_sent` - When message is sent
  - `message.message_read` - When message is read

## 🔄 Cross-Consumption Queues

Each service also consumes from other services:

### Donation Service Consumes:
- `campaign.events.all` (from campaign-service)
- `request.events.all` (from request-service)

### Campaign Service Consumes:
- `donation.events.all` (from donation-service)
- `request.events.all` (from request-service)

### Request Service Consumes:
- `campaign.events.all` (from campaign-service)
- `donation.events.all` (from donation-service)

### Messaging Service Consumes:
- `campaign.events.all` (from campaign-service)
- `message.events.all` (from itself)

## 📋 How to View Queues

### Method 1: Queues Tab (Easiest)
1. Go to **"Queues"** tab
2. See all queues with:
   - **Name**: Queue name
   - **Ready**: Messages waiting
   - **Unacked**: Messages being processed
   - **Total**: Ready + Unacked
   - **Consumers**: Number of active consumers

### Method 2: Exchanges Tab
1. Go to **"Exchanges"** tab
2. Click on an exchange (e.g., `donation_events`)
3. See **"Bindings"** section
4. Lists all queues bound to that exchange

### Method 3: Queue Details
1. Go to **"Queues"** tab
2. Click on a queue name (e.g., `donation.events.all`)
3. See detailed information:
   - Message counts
   - Message rates (publish/consume)
   - Consumers (who is consuming)
   - Bindings

## 🎯 Quick Checklist

To see all queues:
1. ✅ Open: `http://localhost:15672`
2. ✅ Login: `guest` / `guest`
3. ✅ Click: **"Queues"** tab
4. ✅ Look for queues starting with:
   - `donation.*`
   - `campaign.*`
   - `request.*`
   - `message.*`

## 💡 Pro Tip

If you don't see queues:
- They're created when events are published
- Send a test event (create donation/campaign/request)
- Queues will appear automatically
