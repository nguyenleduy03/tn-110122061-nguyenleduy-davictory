#!/bin/bash

echo "🔧 Testing Class Management Frontend Fix..."

# Kiểm tra server đang chạy
echo "1. Checking servers..."

# Check backend
if curl -s http://localhost:8080/api/auth/me > /dev/null 2>&1; then
    echo "   ✅ Backend running on port 8080"
else
    echo "   ❌ Backend not running on port 8080"
    exit 1
fi

# Check frontend
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on port 5173"
else
    echo "   ❌ Frontend not running on port 5173"
    exit 1
fi

echo ""
echo "2. Testing API endpoints..."

# Login
TOKEN=$(curl -s -X POST "http://localhost:8080/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testadmin","password":"123456"}' | \
  grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo "   ✅ Login successful"
else
    echo "   ❌ Login failed"
    exit 1
fi

# Test class management API
CLASS_DATA=$(curl -s -X GET "http://localhost:8080/api/class-management/my" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

if echo "$CLASS_DATA" | grep -q '"classes"'; then
    echo "   ✅ Class management API working"
    
    # Count classes
    CLASS_COUNT=$(echo "$CLASS_DATA" | grep -o '"id":[0-9]*' | wc -l)
    echo "   📊 Found $CLASS_COUNT classes"
else
    echo "   ❌ Class management API failed"
    echo "   Response: $CLASS_DATA"
fi

echo ""
echo "🎯 Frontend fixes applied:"
echo "   ✅ Fixed field mapping: classCode → code"
echo "   ✅ Fixed field mapping: studentCount → activeStudentCount"
echo "   ✅ Added debug info for selectedClass"
echo "   ✅ Fixed refresh logic after create/update"
echo "   ✅ Added AuthDebug component"
echo ""
echo "📋 Next steps:"
echo "   1. Open browser: http://localhost:5173/admin/teacher-class"
echo "   2. Login with admin account"
echo "   3. Test create new class"
echo "   4. Click 'Xem chi tiết' on any class"
echo "   5. Check if class details show correctly"
echo "   6. Test update class information"
echo ""
echo "🔍 Debug tips:"
echo "   - Check browser console for errors"
echo "   - Look for AuthDebug widget in top-right corner"
echo "   - Look for blue debug info box in class details"
