#!/bin/bash

echo "🚀 Donation Service Setup"
echo "========================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "⚠️  .env file already exists!"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Keeping existing .env file"
        exit 0
    fi
fi

# Get Supabase key
echo "📋 Step 1: Supabase Configuration"
echo "Your Supabase URL is already set: https://lthnayjfieviorabxxof.supabase.co"
echo ""
echo "Please get your 'anon public' key from:"
echo "https://supabase.com/dashboard/project/lthnayjfieviorabxxof/settings/api"
echo ""
read -p "Paste your SUPABASE_KEY here: " SUPABASE_KEY

if [ -z "$SUPABASE_KEY" ]; then
    echo "❌ Error: SUPABASE_KEY cannot be empty!"
    exit 1
fi

# Create .env file
cat > .env << EOF
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://lthnayjfieviorabxxof.supabase.co
SUPABASE_KEY=$SUPABASE_KEY
RABBITMQ_URL=amqp://admin:admin@localhost:5672
JWT_SECRET=my-secret-jwt-key-$(date +%s)
SERVICE_NAME=donation-service
SERVICE_VERSION=1.0.0
LOG_LEVEL=info
EOF

echo ""
echo "✅ .env file created!"
echo ""

# Check if RabbitMQ is running
echo "📋 Step 2: Checking RabbitMQ..."
if docker ps | grep -q rabbitmq; then
    echo "✅ RabbitMQ is already running!"
else
    echo "🐰 Starting RabbitMQ..."
    docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 \
      -e RABBITMQ_DEFAULT_USER=admin \
      -e RABBITMQ_DEFAULT_PASS=admin \
      rabbitmq:3-management
    
    if [ $? -eq 0 ]; then
        echo "✅ RabbitMQ started successfully!"
        echo "   Management UI: http://localhost:15672 (admin/admin)"
    else
        echo "❌ Failed to start RabbitMQ. Make sure Docker is running."
        exit 1
    fi
fi

echo ""
echo "📋 Step 3: Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "To start the service, run:"
    echo "  npm run dev"
    echo ""
    echo "Then test it with:"
    echo "  curl http://localhost:3001/health"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

