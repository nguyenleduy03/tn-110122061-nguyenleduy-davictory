#!/bin/bash

echo "🧪 Testing Assignment API"
echo "=========================="
echo ""

# Test 1: Check backend is running
echo "1️⃣ Checking backend..."
if curl -s http://localhost:8080/actuator/health > /dev/null 2>&1; then
    echo "   ✅ Backend is running"
else
    echo "   ❌ Backend is NOT running"
    exit 1
fi
echo ""

# Test 2: Check database
echo "2️⃣ Checking database..."
STUDENT_COUNT=$(mysql -u root -p1111 DAVictory -se "SELECT COUNT(*) FROM users WHERE username='student'" 2>/dev/null)
if [ "$STUDENT_COUNT" = "1" ]; then
    echo "   ✅ Student user exists"
else
    echo "   ❌ Student user NOT found"
fi

CLASS_COUNT=$(mysql -u root -p1111 DAVictory -se "SELECT COUNT(*) FROM class_students WHERE user_id=4 AND class_id=12 AND status='ACTIVE'" 2>/dev/null)
if [ "$CLASS_COUNT" = "1" ]; then
    echo "   ✅ Student is in class 12"
else
    echo "   ❌ Student NOT in class 12"
fi

ASSIGNMENT_COUNT=$(mysql -u root -p1111 DAVictory -se "SELECT COUNT(*) FROM assignments WHERE class_id=12 AND status='PUBLISHED' AND is_active=1" 2>/dev/null)
echo "   📝 Published assignments in class 12: $ASSIGNMENT_COUNT"
echo ""

# Test 3: Try to login
echo "3️⃣ Testing login..."
# Try common passwords
for PASSWORD in "student123" "123456" "student" "password"; do
    RESPONSE=$(curl -s -X POST http://localhost:8080/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"student\",\"password\":\"$PASSWORD\"}")
    
    TOKEN=$(echo $RESPONSE | jq -r '.token // empty' 2>/dev/null)
    
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "   ✅ Login successful with password: $PASSWORD"
        echo "   Token: ${TOKEN:0:50}..."
        
        # Test 4: Get classes
        echo ""
        echo "4️⃣ Testing get classes..."
        CLASSES=$(curl -s -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/auth/my-class-management)
        echo "   Response: $CLASSES" | jq '.' 2>/dev/null || echo "   Response: $CLASSES"
        
        # Test 5: Get assignments
        echo ""
        echo "5️⃣ Testing get assignments..."
        ASSIGNMENTS=$(curl -s -H "Authorization: Bearer $TOKEN" \
            http://localhost:8080/api/assignments/student/class/12)
        echo "   Response: $ASSIGNMENTS" | jq '.' 2>/dev/null || echo "   Response: $ASSIGNMENTS"
        
        exit 0
    fi
done

echo "   ❌ Login failed with all common passwords"
echo "   Response: $RESPONSE"
echo ""
echo "💡 Suggestion: Reset student password with:"
echo "   UPDATE users SET password = '\$2a\$10\$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhCy' WHERE username = 'student';"
echo "   (Password will be: student123)"
