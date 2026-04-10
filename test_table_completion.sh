#!/bin/bash

# Master test script for Table Completion answer persistence fix
# Runs all test suites

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   TABLE COMPLETION ANSWER PERSISTENCE - TEST SUITE        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test_suite() {
    local name="$1"
    local script="$2"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}Running: $name${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    
    if [ -f "$script" ]; then
        if bash "$script"; then
            echo -e "${GREEN}✓ $name PASSED${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}✗ $name FAILED${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${RED}✗ Test script not found: $script${NC}"
        ((FAILED_TESTS++))
    fi
    
    ((TOTAL_TESTS++))
    echo ""
}

# Run test suites
echo "Starting test execution..."
echo ""

# 1. Documentation test
run_test_suite "Documentation & Bug Analysis" "./test_table_completion_fix.sh"

# 2. Automated unit tests
run_test_suite "Automated Unit Tests" "./test_table_completion_automated.sh"

# 3. Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║              ALL AUTOMATED TESTS PASSED! ✓                 ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Next step: Run browser integration tests${NC}"
    echo "Execute: ./test_table_completion_browser.sh"
    echo ""
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║              SOME TESTS FAILED! ✗                          ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Please review the failed tests above."
    echo ""
    exit 1
fi
