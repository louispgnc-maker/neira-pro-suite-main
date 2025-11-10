#!/usr/bin/env bash
# Interactive helper to replace placeholders and run REST/RPC checks against Supabase
# Usage: run locally, provide your project URL, JWT and cabinet UUID when prompted.
# WARNING: keep your JWT secret. Do not paste it in public chats.

set -euo pipefail

read -rp "Supabase project URL (example: yourproj.supabase.co): " PROJECT_HOST
if [[ -z "$PROJECT_HOST" ]]; then
  echo "No project host provided — aborting." >&2
  exit 1
fi

read -rp "JWT (Bearer token) [HIT ENTER to abort]: " JWT
if [[ -z "$JWT" ]]; then
  echo "No JWT provided — aborting." >&2
  exit 1
fi

read -rp "Cabinet UUID (the cabinet to inspect): " CABINET_UUID
if [[ -z "$CABINET_UUID" ]]; then
  echo "No cabinet UUID provided — aborting." >&2
  exit 1
fi

read -rp "(Optional) Your user UUID (enter to skip): " USER_UUID
read -rp "(Optional) Your email (for diagnostics) (enter to skip): " USER_EMAIL

BASE_URL="https://${PROJECT_HOST}"
API_BASE="$BASE_URL/rest/v1"
RPC_URL="$BASE_URL/rest/v1/rpc/get_cabinet_members"

echo
echo "==> Calling RPC get_cabinet_members as the provided user (via POST)"
echo "RPC endpoint: $RPC_URL"
echo
curl -s -w "\n-- HTTP_STATUS:%{http_code}\n" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Content-Type: application/json" \
  -d "{\"cabinet_id\":\"${CABINET_UUID}\"}" \
  "$RPC_URL"

echo
echo "==> Calling table endpoint /public.cabinet_members as the provided user (via GET)"
echo "GET: $API_BASE/public.cabinet_members?cabinet_id=eq.${CABINET_UUID}"
echo
curl -s -w "\n-- HTTP_STATUS:%{http_code}\n" \
  -H "Authorization: Bearer ${JWT}" \
  -H "Accept: application/json" \
  "$API_BASE/public.cabinet_members?cabinet_id=eq.${CABINET_UUID}"

if [[ -n "$USER_UUID" ]]; then
  echo
  echo "==> Checking your own membership row via REST"
  echo "$API_BASE/public.cabinet_members?cabinet_id=eq.${CABINET_UUID}&user_id=eq.${USER_UUID}"
  curl -s -w "\n-- HTTP_STATUS:%{http_code}\n" \
    -H "Authorization: Bearer ${JWT}" \
    -H "Accept: application/json" \
    "$API_BASE/public.cabinet_members?cabinet_id=eq.${CABINET_UUID}&user_id=eq.${USER_UUID}"
fi

echo
echo "==> (Admin) run these SQL queries in Supabase SQL editor if you need to inspect table contents directly:" 
echo "  -- List members for cabinet (admin)"
echo "  SELECT id, cabinet_id, user_id, email, role_cabinet, status, joined_at, created_at"
echo "  FROM public.cabinet_members"
echo "  WHERE cabinet_id = '${CABINET_UUID}'::uuid;"

echo
echo "Script finished. If results are empty from RPC/REST but admin SQL shows rows, check the JWT (auth.uid()) and the RLS policy applied to public.cabinet_members."
