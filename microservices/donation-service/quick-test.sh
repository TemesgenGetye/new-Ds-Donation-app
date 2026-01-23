#!/bin/bash

echo "🧪 Quick Test - Donation Service"
echo "================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Testing Health Endpoint..."
HEALTH=$(curl -s http://localhost:3001/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health check: PASSED"
else
    echo "❌ Health check: FAILED"
    echo "$HEALTH"
    exit 1
fi

echo ""

# Test 2: Get All Donations
echo "2️⃣  Testing Get All Donations..."
DONATIONS=$(curl -s http://localhost:3001/api/donations)
if echo "$DONATIONS" | grep -q "\[\|\{"; then
    COUNT=$(echo "$DONATIONS" | python3 -c "import sys, json; print(len(json.load(sys.stdin)))" 2>/dev/null || echo "?")
    echo "✅ Get donations: PASSED (Found $COUNT donations)"
else
    echo "❌ Get donations: FAILED"
    echo "$DONATIONS"
fi

echo ""

# Test 3: Test Validation
echo "3️⃣  Testing Validation (should fail with proper error)..."
VALIDATION_TEST=$(curl -s -X POST http://localhost:3001/api/donations \
  -H "Content-Type: application/json" \
  -d '{"title": "Test"}')

if echo "$VALIDATION_TEST" | grep -q "errors"; then
    echo "✅ Validation: PASSED (correctly rejected invalid data)"
else
    echo "⚠️  Validation: Unexpected response"
    echo "$VALIDATION_TEST"
fi

echo ""

# Test 4: Check Root Endpoint
echo "4️⃣  Testing Root Endpoint..."
ROOT=$(curl -s http://localhost:3001/)
if echo "$ROOT" | grep -q "donation-service"; then
    echo "✅ Root endpoint: PASSED"
else
    echo "❌ Root endpoint: FAILED"
fi

echo ""
echo "================================="
echo "✅ Basic Tests Complete!"
echo ""
echo "📝 Note: To test creating donations, you need:"
echo "   - A real user ID from your database"
echo "   - Or use the seed data IDs you created earlier"
echo ""
echo "💡 To create a donation, use:"
echo "   curl -X POST http://localhost:3001/api/donations \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"donor_id\": \"REAL_USER_UUID\", \"title\": \"...\", \"description\": \"...\", \"category\": \"...\", \"location\": \"...\"}'"
echo ""

