#!/bin/bash
# MachineAlert AI - Automated API Smoke Test Script
# Verifies health, prediction endpoints, latency, and machine registry

set -e
BASE_URL="http://127.0.0.1:8000"

echo "=========================================================="
echo " Starting MachineAlert AI Automated Smoke Test"
echo " Target API: ${BASE_URL}"
echo "=========================================================="

# 1. Health Probe
echo -n "[1/5] Testing /health endpoint... "
HEALTH_RESP=$(curl -s -w "\n%{http_code}" "${BASE_URL}/health")
HTTP_CODE=$(echo "$HEALTH_RESP" | tail -n1)
BODY=$(echo "$HEALTH_RESP" | head -n-1)

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "PASS (HTTP 200 - Healthy)"
else
  echo "FAIL (HTTP $HTTP_CODE)"
  exit 1
fi

# 2. Model Info
echo -n "[2/5] Testing /api/v1/model/info endpoint... "
MODEL_RESP=$(curl -s "${BASE_URL}/api/v1/model/info")
if echo "$MODEL_RESP" | grep -q "accuracy"; then
  echo "PASS (Metrics loaded)"
else
  echo "FAIL (Invalid response)"
  exit 1
fi

# 3. Nominal Prediction
echo -n "[3/5] Testing /api/v1/predict with nominal sensor telemetry... "
PRED_PAYLOAD='{
  "air_temperature": 298.1,
  "process_temperature": 308.6,
  "rotational_speed": 1551,
  "torque": 42.8,
  "tool_wear": 10,
  "type": "M"
}'
PRED_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/predict" \
  -H "Content-Type: application/json" \
  -d "$PRED_PAYLOAD")

if echo "$PRED_RESP" | grep -q '"risk_level":"Normal"'; then
  echo "PASS (Risk: Normal, Low Probability)"
else
  echo "FAIL: $PRED_RESP"
  exit 1
fi

# 4. Critical Failure Prediction
echo -n "[4/5] Testing /api/v1/predict under high wear/torque conditions... "
FAIL_PAYLOAD='{
  "air_temperature": 302.0,
  "process_temperature": 311.5,
  "rotational_speed": 1310,
  "torque": 68.0,
  "tool_wear": 235,
  "type": "L"
}'
FAIL_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/predict" \
  -H "Content-Type: application/json" \
  -d "$FAIL_PAYLOAD")

if echo "$FAIL_RESP" | grep -q 'High Risk\|Medium Risk'; then
  echo "PASS (Elevated risk alert triggered)"
else
  echo "FAIL: $FAIL_RESP"
  exit 1
fi

# 5. Machines Registry
echo -n "[5/5] Testing /api/v1/machines asset listing... "
MACH_RESP=$(curl -s "${BASE_URL}/api/v1/machines")
if echo "$MACH_RESP" | grep -q 'MCH-0001'; then
  echo "PASS (Assets populated)"
else
  echo "FAIL (No machines returned)"
  exit 1
fi

echo "=========================================================="
echo " All API Smoke Tests PASSED successfully!"
echo "=========================================================="
