#!/usr/bin/env bash
#
# Flowent deploy script — run ON the EC2 host.
#
#   ./deploy-server.sh
#
# Secrets are NOT stored in this file. Create /home/ubuntu/flowent.env once
# (chmod 600) with the values listed in ENV_KEYS below.

set -Eeuo pipefail

PUBLIC_HOST="${PUBLIC_HOST:-13.204.81.229.nip.io}"
ENV_FILE="${ENV_FILE:-$HOME/flowent.env}"
REPO_DIR="${REPO_DIR:-$HOME/flowent}"
REPO_URL="${REPO_URL:-https://github.com/Dheeraj-Kumar-089/flowent.git}"
K="sudo k3s kubectl"

ENV_KEYS=(GEMINI_API_KEY MISTRAL_API_KEY JWT_SECRET MONGO_URI REDIS_URL
          GOOGLE_OAUTH_CLIENT_ID GOOGLE_OAUTH_CLIENT_SECRET)

log()  { printf '\n\033[1;36m=== %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mFAILED: %s\033[0m\n' "$*" >&2; exit 1; }

trap 'fail "line $LINENO"' ERR

# ---------------------------------------------------------------- 0. preflight
log "0. Preflight"

[ -f "$ENV_FILE" ] || fail "$ENV_FILE not found. Create it with: ${ENV_KEYS[*]}"
# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a
for k in "${ENV_KEYS[@]}"; do
  [ -n "${!k:-}" ] || fail "$k missing from $ENV_FILE"
done
echo "secrets loaded: ${#ENV_KEYS[@]} keys"

command -v docker >/dev/null || fail "docker not installed"
sudo k3s kubectl version --request-timeout=10s >/dev/null 2>&1 || fail "k3s not reachable"

# Ensure ingress-nginx is installed and bound to host ports 80/443
if ! $K get ingressclass nginx >/dev/null 2>&1; then
  echo "Installing ingress-nginx..."
  $K apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/baremetal/deploy.yaml
  $K patch deployment ingress-nginx-controller -n ingress-nginx --patch '{"spec":{"template":{"spec":{"hostNetwork":true}}}}'
  $K wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s
fi

echo "free disk:"; df -h / | tail -1
echo "memory:";    free -m | head -2

# ---------------------------------------------------------------- 1. source
log "1. Syncing source"
if [ -d "$REPO_DIR/.git" ]; then
  git -C "$REPO_DIR" fetch --all --prune
  git -C "$REPO_DIR" reset --hard origin/main
else
  git clone "$REPO_URL" "$REPO_DIR"
fi
cd "$REPO_DIR"
echo "HEAD: $(git rev-parse --short HEAD) $(git log -1 --pretty=%s)"

# ---------------------------------------------------------------- 2. secrets
log "2. Applying secrets"
KV=()
for k in "${ENV_KEYS[@]}"; do KV+=(--from-literal="$k=${!k}"); done
$K create secret generic flowent-secrets "${KV[@]}" \
  --dry-run=client -o yaml | $K apply -f -

# ---------------------------------------------------------------- 3. TLS
log "3. TLS certificate for $PUBLIC_HOST"
if ! $K get secret flowent-tls-secret >/dev/null 2>&1; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /tmp/tls.key -out /tmp/tls.crt \
    -subj "/CN=$PUBLIC_HOST" \
    -addext "subjectAltName = DNS:$PUBLIC_HOST, DNS:*.$PUBLIC_HOST, DNS:*.preview.$PUBLIC_HOST, DNS:*.agent.$PUBLIC_HOST, DNS:localhost, DNS:*.preview.localhost, DNS:*.agent.localhost"
  $K create secret tls flowent-tls-secret --key /tmp/tls.key --cert /tmp/tls.crt
  shred -u /tmp/tls.key /tmp/tls.crt 2>/dev/null || true
  echo "created"
else
  echo "already present (delete flowent-tls-secret to regenerate)"
fi

# ---------------------------------------------------------------- 4. cleanup
log "4. Reaping orphaned sandbox pods"
$K delete pod -l app=sandbox --field-selector=status.phase!=Running --ignore-not-found >/dev/null 2>&1 || true
$K get pods -l app=sandbox -o name 2>/dev/null | grep '^pod/sandbox-pod-' || echo "none"
sudo docker image prune -f >/dev/null 2>&1 || true

# ---------------------------------------------------------------- 5. build
log "5. Building and importing images"
ECR_REGISTRY="360821545863.dkr.ecr.ap-south-1.amazonaws.com"
build() {
  local tag_name="$1" ctx="$2"
  local ecr_tag="${ECR_REGISTRY}/flowent-${tag_name}:latest"
  echo "--- $tag_name ($ecr_tag)"
  sudo docker build -q -t "$tag_name:latest" -t "$ecr_tag" "$ctx" \
    || fail "docker build failed for $tag_name (context: $ctx)"
  sudo docker save "$ecr_tag" | sudo k3s ctr -n k8s.io images import - >/dev/null \
    || fail "ctr import failed for $tag_name"
}
build ai       ./ai-orchestration
build sandbox  ./sandbox/server
build router   ./sandbox/router
build agent    ./sandbox/agent
build template ./sandbox/template
build auth     ./auth
build frontend ./frontend

# ---------------------------------------------------------------- 6. apply
log "6. Applying manifests"
if [ -f "scripts/refresh-ecr-token.sh" ]; then
  chmod +x scripts/refresh-ecr-token.sh
  ./scripts/refresh-ecr-token.sh || true
fi
$K apply -f k8s/rbac.yml
$K apply -f k8s/seed-images.yml
$K apply -f k8s/auth-deployment.yml     -f k8s/auth-service.yml
$K apply -f k8s/ai-deployment.yml       -f k8s/ai-service.yml
$K apply -f k8s/sandbox-deployment.yml  -f k8s/sandbox-service.yml
$K apply -f k8s/router-deployment.yml   -f k8s/router-service.yml
$K apply -f k8s/frontend-deployment.yml -f k8s/frontend-service.yml
$K apply -f k8s/ingress.yml

# ---------------------------------------------------------------- 7. rollout
log "7. Rolling out"
DEPLOYMENTS=(auth-deployment ai-deployment sandbox-deployment router-deployment frontend-deployment)
for d in "${DEPLOYMENTS[@]}"; do $K rollout restart "deployment/$d"; done

trap - ERR   # from here we report failures instead of aborting
BAD=0
for d in "${DEPLOYMENTS[@]}"; do
  printf '  %-22s ' "$d"
  if $K rollout status "deployment/$d" --timeout=180s >/dev/null 2>&1; then
    echo "OK"
  else
    echo "STALLED"
    BAD=1
    SEL=$($K get deployment "$d" -o jsonpath='{.spec.selector.matchLabels}' | tr -d '{}"' | tr ',' '\n' | head -1)
    POD=$($K get pods -l "$SEL" -o name 2>/dev/null | head -1)
    if [ -n "$POD" ]; then
      echo "    --- events ---"
      $K describe "$POD" | sed -n '/Events:/,$p' | tail -15 | sed 's/^/    /'
      echo "    --- logs ---"
      $K logs "$POD" --tail=40 --all-containers 2>&1 | sed 's/^/    /'
    fi
  fi
done

# ---------------------------------------------------------------- 8. verify
log "8. Cluster state"
$K get pods -o wide
$K get svc
$K get ingress

log "9. Endpoint smoke test"
for path in /api/sandbox/health /api/status/healthz /api/auth/me /; do
  printf '  %-24s ' "$path"
  curl -sk -o /dev/null -m 15 -w '%{http_code}\n' "https://$PUBLIC_HOST$path" || echo "unreachable"
done

if [ "$BAD" -ne 0 ]; then
  printf '\n\033[1;31mDEPLOY FINISHED WITH STALLED DEPLOYMENTS (see above)\033[0m\n'
  exit 1
fi
printf '\n\033[1;32mDEPLOY COMPLETE — https://%s\033[0m\n' "$PUBLIC_HOST"
