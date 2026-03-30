#!/bin/sh
# Health check script used by Docker and deployment tooling

HOST="${HOST:-localhost}"
PORT="${PORT:-3000}"
API_VERSION="${API_VERSION:-v1}"
URL="http://${HOST}:${PORT}/api/${API_VERSION}/health/live"

echo "Checking health at: $URL"

response=$(wget --server-response --spider --timeout=5 "$URL" 2>&1)
http_code=$(echo "$response" | grep "HTTP/" | tail -1 | awk '{print $2}')

if [ "$http_code" = "200" ]; then
  echo "Health check PASSED (HTTP $http_code)"
  exit 0
else
  echo "Health check FAILED (HTTP $http_code)"
  exit 1
fi