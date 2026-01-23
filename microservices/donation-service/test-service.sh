#!/bin/bash

echo "🧪 Testing Donation Service"
echo "============================"
echo ""

# Test health endpoint
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3001/health 2>&1)

if echo "$HEALTH" | grep -q "healthy\|unhealthy"; then
    echo "✅ Health endpoint is working!"
    echo "$HEALTH" | python3 -m json.tool 2>/dev/null || echo "$HEALTH"
else
    echo "❌ Service might not be running yet"
    echo "   Make sure you ran: npm run dev"
    echo "   Response: $HEALTH"
fi

echo ""
echo "2️⃣  Testing root endpoint..."
ROOT=$(curl -s http://localhost:3001/ 2>&1)
if echo "$ROOT" | grep -q "donation-service"; then
    echo "✅ Root endpoint is working!"
    echo "$ROOT" | python3 -m json.tool 2>/dev/null || echo "$ROOT"
else
    echo "⚠️  Root endpoint response: $ROOT"
fi

echo ""
echo "3️⃣  Testing donations endpoint..."
DONATIONS=$(curl -s http://localhost:3001/api/donations 2>&1)
if echo "$DONATIONS" | grep -q "\[\|\{"; then
    echo "✅ Donations endpoint is working!"
    echo "$DONATIONS" | python3 -m json.tool 2>/dev/null | head -20 || echo "$DONATIONS"
else
    echo "⚠️  Donations endpoint response: $DONATIONS"
fi

echo ""
echo "============================"
echo "✅ Testing complete!"
echo ""
echo "If you see errors, check:"
echo "  - Is the service running? (npm run dev)"
echo "  - Is RabbitMQ running? (docker ps)"
echo "  - Check .env file has correct SUPABASE_KEY"

