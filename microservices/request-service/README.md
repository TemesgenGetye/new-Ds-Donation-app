# Request Service

Microservice for managing donation requests (recipients requesting specific donations).

## Features

- Create and manage donation requests
- Filter requests by donation, recipient, and status
- Pub/Sub event publishing (RabbitMQ) for `request.created` and `request.status.changed`
- Health check endpoint
- Structured logging

## API Endpoints

- `POST /api/requests` - Create a new request for a donation
- `GET /api/requests` - List requests (with filters)
- `GET /api/requests/:id` - Get request by ID
- `PUT /api/requests/:id` - Update a request (e.g. status, message)
- `GET /health` - Health check

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `env.template` to `.env` and configure:
```bash
cp env.template .env
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

- `PORT` - Server port (default: 3004)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT secret for token validation (reserved for future auth)

## Events Published

- `request.created` - When a request is created
- `request.status.changed` - When request status changes

## Docker

```bash
docker build -t request-service .
docker run -p 3004:3004 --env-file .env request-service
```

