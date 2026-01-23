# Donation Service

Microservice for managing donation listings and lifecycle.

## Features

- Create, read, update, delete donations
- Filter donations by status, category, donor
- Pub/Sub event publishing (RabbitMQ)
- Health check endpoint
- Structured logging

## API Endpoints

- `POST /api/donations` - Create donation
- `GET /api/donations` - List donations (with filters)
- `GET /api/donations/:id` - Get donation by ID
- `PUT /api/donations/:id` - Update donation
- `DELETE /api/donations/:id` - Delete donation
- `GET /health` - Health check

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

3. Start in development:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
npm start
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT secret for token validation

## Events Published

- `donation.created` - When a donation is created
- `donation.status.changed` - When donation status changes
- `donation.deleted` - When a donation is deleted

## Docker

```bash
docker build -t donation-service .
docker run -p 3001:3001 --env-file .env donation-service
```

