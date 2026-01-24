#!/bin/bash

# Quick Start with Kind (Faster Alternative to Docker Desktop)

set -e

echo "🚀 Setting up Kubernetes with Kind (Fast!)"
echo ""

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo "📦 Installing Kind..."
    brew install kind
else
    echo "✅ Kind is already installed"
fi

# Check if cluster exists
if kind get clusters | grep -q "donation-app"; then
    echo "⚠️  Cluster 'donation-app' already exists"
    read -p "Delete and recreate? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Deleting existing cluster..."
        kind delete cluster --name donation-app
    else
        echo "✅ Using existing cluster"
        kubectl cluster-info
        exit 0
    fi
fi

# Create cluster
echo "🔨 Creating Kubernetes cluster (this takes ~1-2 minutes)..."
kind create cluster --name donation-app

echo ""
echo "✅ Cluster created!"
echo ""

# Verify
echo "🔍 Verifying cluster..."
kubectl cluster-info

echo ""
echo "📦 Loading Docker images into cluster..."
kind load docker-image finaldonationds-donation-service:latest --name donation-app
kind load docker-image finaldonationds-campaign-service:latest --name donation-app
kind load docker-image finaldonationds-messaging-service:latest --name donation-app
kind load docker-image finaldonationds-request-service:latest --name donation-app

echo ""
echo "✅ Images loaded!"
echo ""
echo "🚀 Ready to deploy! Run:"
echo "   kubectl apply -k k8s/"
echo ""
