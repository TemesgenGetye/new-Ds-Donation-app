# Campaign Service

Microservice for managing fundraising campaigns.

## Features

- Create, read, update, delete campaigns
- Contribute to campaigns (add money)
- Filter campaigns by status, category, recipient
- Pub/Sub event publishing (RabbitMQ)
- Health check endpoint
- Structured logging

## API Endpoints

- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns` - List campaigns (with filters)
- `GET /api/campaigns/:id` - Get campaign by ID
- `PUT /api/campaigns/:id` - Update campaign
- `POST /api/campaigns/:id/contribute` - Add contribution
- `DELETE /api/campaigns/:id` - Delete campaign
- `GET /health` - Health check

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp env.template .env
```

3. Start in development:
```bash
npm run dev
```

## Environment Variables

- `PORT` - Server port (default: 3002)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT secret for token validation

## Events Published

- `campaign.created` - When a campaign is created
- `campaign.status.changed` - When campaign status changes
- `campaign.contributed` - When someone contributes
- `campaign.completed` - When goal is reached
- `campaign.deleted` - When a campaign is deleted

