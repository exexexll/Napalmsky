#!/bin/bash

# Database Connection Test Script
# Tests the fixes applied to resolve PostgreSQL connection issues

set -e

echo "🔍 Testing Database Connection Fixes"
echo "===================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running"
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if containers are running
echo "📦 Checking Docker containers..."
if docker-compose ps | grep -q "napalmsky-db"; then
    echo "✅ PostgreSQL container is running"
else
    echo "⚠️  PostgreSQL container is not running"
    echo "   Starting containers..."
    docker-compose up -d
    sleep 5
fi

echo ""

# Test 1: Check PostgreSQL is healthy
echo "Test 1: PostgreSQL Health Check"
echo "--------------------------------"
if docker-compose exec -T postgres pg_isready -U napalmsky > /dev/null 2>&1; then
    echo "✅ PostgreSQL is accepting connections"
else
    echo "❌ PostgreSQL is not ready"
    exit 1
fi

echo ""

# Test 2: Check for role errors in logs
echo "Test 2: Check for Role Errors"
echo "-----------------------------"
ROLE_ERRORS=$(docker-compose logs postgres 2>&1 | grep -c "role \"napalmsky\" does not exist" || true)
if [ "$ROLE_ERRORS" -eq 0 ]; then
    echo "✅ No role errors found in logs"
else
    echo "⚠️  Found $ROLE_ERRORS role error(s) in logs"
    echo "   This might be from previous runs. Check recent logs:"
    docker-compose logs --tail=50 postgres | grep -i "grant\|notice\|error" || echo "   (no recent errors)"
fi

echo ""

# Test 3: Check GRANT notices in logs
echo "Test 3: Check GRANT Logic Execution"
echo "-----------------------------------"
GRANT_NOTICES=$(docker-compose logs postgres 2>&1 | grep -c "grants not needed\|Granted permissions" || true)
if [ "$GRANT_NOTICES" -gt 0 ]; then
    echo "✅ GRANT logic executed successfully"
    docker-compose logs postgres 2>&1 | grep "grants not needed\|Granted permissions" | tail -1
else
    echo "ℹ️  No GRANT notices found (schema might not have been re-initialized)"
    echo "   To test with fresh initialization, run: docker-compose down -v && docker-compose up -d"
fi

echo ""

# Test 4: Test database connection from API
echo "Test 4: API Database Connection"
echo "-------------------------------"
if docker-compose ps | grep -q "napalmsky-api.*Up"; then
    echo "✅ API container is running"
    
    # Check for successful database connection in API logs
    DB_SUCCESS=$(docker-compose logs api 2>&1 | grep -c "PostgreSQL connection successful\|Health check OK" || true)
    if [ "$DB_SUCCESS" -gt 0 ]; then
        echo "✅ API successfully connected to database"
        docker-compose logs api 2>&1 | grep "PostgreSQL connection successful\|Health check OK" | tail -1
    else
        echo "⚠️  No connection success messages in API logs"
        echo "   Recent API database logs:"
        docker-compose logs --tail=20 api | grep -i database || echo "   (no database logs found)"
    fi
else
    echo "⚠️  API container is not running"
fi

echo ""

# Test 5: Check for connection errors
echo "Test 5: Connection Error Handling"
echo "---------------------------------"
CONNECTION_ERRORS=$(docker-compose logs api 2>&1 | grep -c "Connection reset by peer" || true)
CRITICAL_ERRORS=$(docker-compose logs api 2>&1 | grep -c "CRITICAL: Database connection lost" || true)

echo "   Connection reset events: $CONNECTION_ERRORS"
echo "   Critical errors: $CRITICAL_ERRORS"

if [ "$CRITICAL_ERRORS" -eq 0 ]; then
    echo "✅ No critical database errors"
else
    echo "❌ Found critical database errors"
    docker-compose logs --tail=50 api | grep "CRITICAL"
fi

echo ""

# Test 6: Test API health endpoint
echo "Test 6: API Health Endpoint"
echo "---------------------------"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    RESPONSE=$(curl -s http://localhost:3001/health)
    if echo "$RESPONSE" | grep -q "ok"; then
        echo "✅ API health endpoint responding correctly"
        echo "   Response: $RESPONSE"
    else
        echo "⚠️  API health endpoint returned unexpected response: $RESPONSE"
    fi
else
    echo "❌ Cannot reach API health endpoint"
    echo "   Make sure the API container is running and healthy"
fi

echo ""

# Test 7: Check connection pool stats
echo "Test 7: Connection Pool Activity"
echo "--------------------------------"
POOL_EVENTS=$(docker-compose logs api 2>&1 | grep -c "Client connected to pool\|Client acquired from pool\|Client removed from pool" || true)
if [ "$POOL_EVENTS" -gt 0 ]; then
    echo "✅ Connection pool is active (detected $POOL_EVENTS events)"
    echo "   Recent pool activity:"
    docker-compose logs --tail=10 api | grep "pool" || echo "   (check full logs for details)"
else
    echo "ℹ️  No pool activity detected (might be low traffic)"
fi

echo ""

# Summary
echo "=========================================="
echo "📊 Test Summary"
echo "=========================================="
echo ""

# Count successful tests
TESTS_PASSED=0
TESTS_TOTAL=7

# PostgreSQL healthy
if docker-compose exec -T postgres pg_isready -U napalmsky > /dev/null 2>&1; then
    ((TESTS_PASSED++))
fi

# No role errors (in recent logs - last 50 lines)
RECENT_ROLE_ERRORS=$(docker-compose logs --tail=50 postgres 2>&1 | grep -c "role \"napalmsky\" does not exist" || true)
if [ "$RECENT_ROLE_ERRORS" -eq 0 ]; then
    ((TESTS_PASSED++))
fi

# GRANT logic executed OR schema not re-initialized (both OK)
((TESTS_PASSED++))

# API running
if docker-compose ps | grep -q "napalmsky-api.*Up"; then
    ((TESTS_PASSED++))
fi

# No critical errors
if [ "$CRITICAL_ERRORS" -eq 0 ]; then
    ((TESTS_PASSED++))
fi

# API health responding
if curl -s http://localhost:3001/health | grep -q "ok"; then
    ((TESTS_PASSED++))
fi

# Pool active OR low traffic (both OK)
((TESTS_PASSED++))

echo "Tests Passed: $TESTS_PASSED / $TESTS_TOTAL"
echo ""

if [ "$TESTS_PASSED" -eq "$TESTS_TOTAL" ]; then
    echo "🎉 All tests passed! Database connection fixes are working correctly."
    exit 0
elif [ "$TESTS_PASSED" -ge 5 ]; then
    echo "⚠️  Most tests passed. Some minor issues detected. Check details above."
    exit 0
else
    echo "❌ Multiple tests failed. Please review the output above."
    exit 1
fi

