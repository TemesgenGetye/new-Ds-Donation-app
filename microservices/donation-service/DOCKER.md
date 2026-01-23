# Docker Setup for Donation Service

## Quick Start

1. **Build and run with Docker Compose:**
   ```bash
   cd microservices/donation-service
   docker-compose up -d --build
   ```

2. **Check if containers are running:**
   ```bash
   docker-compose ps
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f donation-service
   ```

4. **Stop containers:**
   ```bash
   docker-compose down
   ```

## Manual Docker Commands

### Build the image:
```bash
docker build -t donation-service:latest .
```

### Run the container:
```bash
docker run -d \
  --name donation-service \
  -p 3001:3001 \
  --env-file .env \
  donation-service:latest
```

## Access

- **Service**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api-docs
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)

