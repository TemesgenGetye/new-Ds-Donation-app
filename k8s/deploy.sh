#!/bin/bash

# Kubernetes Deployment Script
# This script deploys all services to Kubernetes using Kustomize

set -e

echo "🚀 Starting Kubernetes Deployment..."

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    echo "❌ kubectl is not installed. Please install it first."
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "k8s/kustomization.yaml" ]; then
    echo "❌ kustomization.yaml not found. Please run from project root."
    exit 1
fi

# Deploy using Kustomize (applies everything in correct order)
echo "📦 Deploying all resources with Kustomize..."
kubectl apply -k k8s/

echo "⏳ Waiting for RabbitMQ to be ready..."
kubectl wait --for=condition=ready pod -l app=rabbitmq -n donation-app --timeout=120s || echo "⚠️  RabbitMQ may still be starting..."

echo "⏳ Waiting for services to be ready..."
kubectl wait --for=condition=available deployment/donation-service -n donation-app --timeout=60s || echo "⚠️  Services may still be starting..."
kubectl wait --for=condition=available deployment/campaign-service -n donation-app --timeout=60s || echo "⚠️  Services may still be starting..."
kubectl wait --for=condition=available deployment/messaging-service -n donation-app --timeout=60s || echo "⚠️  Services may still be starting..."
kubectl wait --for=condition=available deployment/request-service -n donation-app --timeout=60s || echo "⚠️  Services may still be starting..."

echo "✅ Deployment complete!"
echo ""
echo "📊 Check status with:"
echo "   kubectl get all -n donation-app"
echo "   kubectl get pods -n donation-app"
echo "   kubectl get services -n donation-app"
echo ""
echo "📝 View logs with:"
echo "   kubectl logs -f deployment/donation-service -n donation-app"
echo "   kubectl logs -f deployment/campaign-service -n donation-app"
echo "   kubectl logs -f deployment/messaging-service -n donation-app"
echo "   kubectl logs -f deployment/request-service -n donation-app"
echo "   kubectl logs -f deployment/rabbitmq -n donation-app"
echo ""
echo "🌐 Access services:"
echo "   kubectl port-forward service/donation-service 3001:3001 -n donation-app"
echo "   kubectl port-forward service/campaign-service 3002:3002 -n donation-app"
echo "   kubectl port-forward service/messaging-service 3003:3003 -n donation-app"
echo "   kubectl port-forward service/request-service 3004:3004 -n donation-app"
echo "   kubectl port-forward service/rabbitmq 15672:15672 -n donation-app"
