# Messaging Service

Microservice for managing user-to-user chat messages linked to donations and campaigns.

## Features

- Create and list chat messages between users
- Filter messages by sender, receiver, donation, or campaign
- Pub/Sub event publishing (RabbitMQ) for `message.sent` and `message.read`
- Health check endpoint
- Structured logging

## API Endpoints

- `POST /api/messages` - Send a new message
- `GET /api/messages` - List messages with filters
- `PATCH /api/messages/:id/read` - Mark a message as read
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

- `PORT` - Server port (default: 3003)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_KEY` - Supabase anon key
- `RABBITMQ_URL` - RabbitMQ connection string
- `JWT_SECRET` - JWT secret for token validation (reserved for future auth)

## Events Published

- `message.sent` - When a new message is created
- `message.read` - When a message is marked as read

## Docker

```bash
docker build -t messaging-service .
docker run -p 3003:3003 --env-file .env messaging-service
```

