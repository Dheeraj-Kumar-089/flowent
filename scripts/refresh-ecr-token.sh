#!/usr/bin/env bash
#
# Script to refresh AWS ECR authentication token in Kubernetes
# ECR tokens expire every 12 hours. This script refreshes the secret and
# ensures all service accounts can pull images without ImagePullBackOff.
#

set -euo pipefail

REGION="${AWS_REGION:-ap-south-1}"
ACCOUNT_ID="360821545863"
REGISTRY="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
K="sudo k3s kubectl"

# If running in standard k8s without k3s, fallback to kubectl
if ! command -v k3s >/dev/null 2>&1; then
  K="kubectl"
fi

echo "[$(date)] Refreshing ECR token for $REGISTRY in region $REGION..."

if ! command -v aws >/dev/null 2>&1; then
  echo "Error: AWS CLI is not installed." >&2
  exit 1
fi

TOKEN=$(aws ecr get-login-password --region "$REGION" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "Error: Failed to obtain ECR login password. Check AWS credentials." >&2
  exit 1
fi

# 1. Create or update the docker-registry secret in Kubernetes
$K create secret docker-registry ecr-secret \
  --docker-server="$REGISTRY" \
  --docker-username=AWS \
  --docker-password="$TOKEN" \
  --namespace=default \
  --dry-run=client -o yaml | $K apply -f -

# 2. Patch default & resource-manager ServiceAccounts so every pod inherits this secret
$K patch serviceaccount default -n default -p '{"imagePullSecrets": [{"name": "ecr-secret"}]}' >/dev/null 2>&1 || true
$K patch serviceaccount resource-manager -n default -p '{"imagePullSecrets": [{"name": "ecr-secret"}]}' >/dev/null 2>&1 || true

echo "[$(date)] Successfully refreshed ecr-secret and patched ServiceAccounts."
