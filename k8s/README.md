# Kubernetes Deployment Guide

This directory contains the Kubernetes manifests to deploy the Donation Platform microservices architecture.

## 📁 Directory Structure

```
k8s/
├── infrastructure/          # Core infrastructure components
│   ├── namespace.yaml       # Namespace definition
│   ├── configmap.yaml       # Non-sensitive configuration
│   ├── secrets.yaml         # Sensitive data (API keys, passwords)
│   └── rabbitmq.yaml        # RabbitMQ message broker
├── services/                # Microservices deployments
│   ├── donation-service.yaml
│   ├── campaign-service.yaml
│   ├── messaging-service.yaml
│   └── request-service.yaml
├── policies/                # Security policies (RBAC, NetworkPolicies)
│   └── (add policies here)
├── kustomization.yaml       # Kustomize configuration
└── README.md               # This file
```

## 🎯 What is Kustomize?

**Kustomize** is a tool built into `kubectl` that helps you:
- ✅ Manage multiple Kubernetes environments (dev, staging, prod)
- ✅ Reuse configurations without duplication
- ✅ Apply common labels and namespaces
- ✅ Organize files better

**Think of it as:** A smart way to organize and deploy all your Kubernetes files together.

## 🚀 Quick Start

### Prerequisites

1. **Kubernetes cluster** (choose one):
   - **Docker Desktop**: Enable Kubernetes in Settings
   - **Minikube**: `brew install minikube && minikube start`
   - **Kind**: `brew install kind && kind create cluster`

2. **kubectl installed**:
   ```bash
   brew install kubectl
   ```

### Step 1: Update Secrets

**IMPORTANT:** Edit `infrastructure/secrets.yaml` with your actual API keys:

```yaml
stringData:
  SUPABASE_URL: "your-actual-url"
  SUPABASE_KEY: "your-actual-key"
  # ... etc
```

### Step 2: Build Docker Images

```bash
# Build all services
docker compose build

# Or individually
docker build --build-arg SERVICE_PATH=microservices/donation-service -t finaldonationds-donation-service:latest .
docker build --build-arg SERVICE_PATH=microservices/campaign-service -t finaldonationds-campaign-service:latest .
docker build --build-arg SERVICE_PATH=microservices/messaging-service -t finaldonationds-messaging-service:latest .
docker build --build-arg SERVICE_PATH=microservices/request-service -t finaldonationds-request-service:latest .
```

### Step 3: Load Images (if using Minikube/Kind)

```bash
# For Minikube
minikube image load finaldonationds-donation-service:latest
minikube image load finaldonationds-campaign-service:latest
minikube image load finaldonationds-messaging-service:latest
minikube image load finaldonationds-request-service:latest

# For Kind
kind load docker-image finaldonationds-donation-service:latest
kind load docker-image finaldonationds-campaign-service:latest
kind load docker-image finaldonationds-messaging-service:latest
kind load docker-image finaldonationds-request-service:latest
```

### Step 4: Deploy Everything

**Using Kustomize (Recommended):**
```bash
kubectl apply -k k8s/
```

**Or manually:**
```bash
kubectl apply -f k8s/infrastructure/
kubectl apply -f k8s/services/
```

## 📊 Check Status

```bash
# View all resources
kubectl get all -n donation-app

# Check pods
kubectl get pods -n donation-app

# Check services
kubectl get services -n donation-app

# View logs
kubectl logs -f deployment/donation-service -n donation-app
kubectl logs -f deployment/campaign-service -n donation-app
kubectl logs -f deployment/messaging-service -n donation-app
kubectl logs -f deployment/request-service -n donation-app
kubectl logs -f deployment/rabbitmq -n donation-app
```

## 🌐 Access Services

### Port Forwarding

```bash
# Donation Service
kubectl port-forward service/donation-service 3001:3001 -n donation-app

# Campaign Service
kubectl port-forward service/campaign-service 3002:3002 -n donation-app

# Messaging Service
kubectl port-forward service/messaging-service 3003:3003 -n donation-app

# Request Service
kubectl port-forward service/request-service 3004:3004 -n donation-app

# RabbitMQ Management
kubectl port-forward service/rabbitmq 15672:15672 -n donation-app
```

### NodePort (Docker Desktop/Minikube)

- Donation Service: `localhost:30001`
- Campaign Service: `localhost:30002`
- Messaging Service: `localhost:30003`
- Request Service: `localhost:30004`

## 🔧 Common Commands

```bash
# Scale a service
kubectl scale deployment donation-service --replicas=3 -n donation-app

# Restart a deployment
kubectl rollout restart deployment/donation-service -n donation-app

# Update after changing YAML
kubectl apply -k k8s/

# Delete everything
kubectl delete namespace donation-app

# Describe a pod (debug)
kubectl describe pod <pod-name> -n donation-app

# Execute command in pod
kubectl exec -it <pod-name> -n donation-app -- /bin/sh
```

## 📋 Architecture

```
┌─────────────────────────────────────────┐
│         Kubernetes Cluster               │
│  ┌───────────────────────────────────┐  │
│  │      Namespace: donation-app       │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │   Infrastructure             │  │  │
│  │  │   - RabbitMQ                 │  │  │
│  │  │   - ConfigMap                │  │  │
│  │  │   - Secrets                  │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │   Services (2 replicas each) │  │  │
│  │  │   - Donation Service         │  │  │
│  │  │   - Campaign Service         │  │  │
│  │  │   - Messaging Service        │  │  │
│  │  │   - Request Service          │  │  │
│  │  └──────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## 🔒 Security Notes

1. **Never commit secrets.yaml** - Add to `.gitignore`
2. **Use Kubernetes Secrets** for production (not stringData)
3. **Add NetworkPolicies** in `policies/` directory
4. **Use RBAC** for service accounts

## 🐛 Troubleshooting

**Pods not starting?**
```bash
kubectl describe pod <pod-name> -n donation-app
kubectl logs <pod-name> -n donation-app
```

**Services not accessible?**
- Check if pods are running: `kubectl get pods -n donation-app`
- Verify service type: `kubectl get services -n donation-app`
- Check port-forwarding or NodePort

**Image pull errors?**
- Ensure images are built: `docker images | grep finaldonationds`
- Load images into cluster (Minikube/Kind)
- Check `imagePullPolicy: IfNotPresent`

## 📚 Next Steps

- ✅ Add **Ingress** for external access
- ✅ Add **Persistent Volumes** for RabbitMQ data
- ✅ Set up **Horizontal Pod Autoscaler** (auto-scaling)
- ✅ Add **NetworkPolicies** for security
- ✅ Configure **Resource Quotas**
- ✅ Set up **Monitoring** (Prometheus/Grafana)
