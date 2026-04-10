#!/bin/bash

# Integration test for Table Completion in browser
# Requires: Chrome/Chromium with DevTools Protocol

echo "=== TABLE COMPLETION BROWSER INTEGRATION TEST ==="
echo ""

# Check if frontend is running
FRONTEND_URL="http://localhost:5173"

echo "Checking if frontend is running at $FRONTEND_URL..."
if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
    echo "✓ Frontend is running"
else
    echo "✗ Frontend is not running"
    echo "Please start frontend with: cd frontend && npm run dev"
    exit 1
fi

echo ""
echo "=== MANUAL TEST INSTRUCTIONS ==="
echo ""
echo "1. Open browser to: $FRONTEND_URL/test-builder"
echo ""
echo "2. Create a new Table Completion block"
echo ""
echo "3. Test Case 1: Basic answer persistence"
echo "   a. In first cell, type: 'Name: [blank]'"
echo "   b. In second cell, type: 'Age: [blank]'"
echo "   c. Enter answer for Q1: 'John'"
echo "   d. Enter answer for Q2: '25'"
echo "   e. Edit first cell to: 'Full Name: [blank]'"
echo "   f. VERIFY: Answer 'John' is still there"
echo "   g. Edit second cell to: 'Age (years): [blank]'"
echo "   h. VERIFY: Answer '25' is still there"
echo ""
echo "4. Test Case 2: Multiple blanks in one cell"
echo "   a. In a cell, type: '[blank] and [blank]'"
echo "   b. Enter answers for both questions"
echo "   c. Edit cell to: '[blank] or [blank]'"
echo "   d. VERIFY: Both answers are preserved"
echo ""
echo "5. Test Case 3: Adding/removing blanks"
echo "   a. Add a new blank: '[blank]'"
echo "   b. VERIFY: Old answers preserved, new question created"
echo "   c. Remove a blank (delete [blank])"
echo "   d. VERIFY: Corresponding answer removed, others preserved"
echo ""
echo "6. Test Case 4: Paste from Excel"
echo "   a. Click 'Paste từ Excel/Sheets/Word'"
echo "   b. Paste table with blanks"
echo "   c. Enter answers"
echo "   d. Edit any cell"
echo "   e. VERIFY: All answers preserved"
echo ""
echo "7. Test Case 5: Column/row operations"
echo "   a. Enter answers for all blanks"
echo "   b. Add a new column"
echo "   c. VERIFY: Existing answers preserved"
echo "   d. Add a new row"
echo "   e. VERIFY: Existing answers preserved"
echo "   f. Delete a column (without blanks)"
echo "   g. VERIFY: Answers preserved"
echo ""

echo "=== EXPECTED BEHAVIOR ==="
echo "✓ Answers should persist when editing cells (if blank count unchanged)"
echo "✓ Answers should be preserved when adding new blanks"
echo "✓ Only corresponding answers should be removed when deleting blanks"
echo "✓ Answer order should match blank order (row by row, left to right)"
echo ""

echo "=== DEBUGGING TIPS ==="
echo "If answers are lost:"
echo "1. Open DevTools Console (F12)"
echo "2. Check for errors"
echo "3. Add breakpoint in setCell() function"
echo "4. Verify questionsRef.current has correct values"
echo "5. Check if onUpdate() receives correct questions array"
echo ""

echo "Press Enter to open browser..."
read

# Try to open browser
if command -v xdg-open > /dev/null; then
    xdg-open "$FRONTEND_URL/test-builder"
elif command -v open > /dev/null; then
    open "$FRONTEND_URL/test-builder"
else
    echo "Please manually open: $FRONTEND_URL/test-builder"
fi

echo ""
echo "Test instructions displayed. Please perform manual tests in browser."
