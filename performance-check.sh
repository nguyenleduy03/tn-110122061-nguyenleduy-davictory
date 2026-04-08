#!/bin/bash

# Script kiểm tra hiệu suất chi tiết DAVictory
# Chạy: chmod +x performance-check.sh && ./performance-check.sh

echo "🔍 KIỂM TRA HIỆU SUẤT DAVICTORY"
echo "================================"
echo ""

# 1. Kiểm tra N+1 queries
echo "1️⃣  Kiểm tra N+1 Query Problems..."
echo "-----------------------------------"
n1_count=$(grep -r "findBy\|findAll" backend/src/main/java --include="*.java" | wc -l)
join_fetch_count=$(grep -r "JOIN FETCH" backend/src/main/java --include="*.java" | wc -l)
echo "   ❌ Tổng số findBy/findAll queries: $n1_count"
echo "   ✅ Số queries có JOIN FETCH: $join_fetch_count"
echo "   ⚠️  Tỷ lệ tối ưu: $(echo "scale=2; $join_fetch_count * 100 / $n1_count" | bc)%"
echo ""

# 2. Kiểm tra FetchType.EAGER
echo "2️⃣  Kiểm tra FetchType.EAGER..."
echo "-----------------------------------"
eager_count=$(grep -r "FetchType.EAGER" backend/src/main/java --include="*.java" | wc -l)
if [ $eager_count -gt 0 ]; then
    echo "   ❌ Tìm thấy $eager_count FetchType.EAGER:"
    grep -rn "FetchType.EAGER" backend/src/main/java --include="*.java"
else
    echo "   ✅ Không có FetchType.EAGER"
fi
echo ""

# 3. Kiểm tra Caching
echo "3️⃣  Kiểm tra Caching..."
echo "-----------------------------------"
cache_count=$(grep -r "@Cacheable\|@CacheEvict\|@EnableCaching" backend/src/main/java --include="*.java" | wc -l)
if [ $cache_count -eq 0 ]; then
    echo "   ❌ Không tìm thấy caching configuration"
else
    echo "   ✅ Tìm thấy $cache_count cache annotations"
fi
echo ""

# 4. Kiểm tra useEffect trong React
echo "4️⃣  Kiểm tra React useEffect..."
echo "-----------------------------------"
useeffect_count=$(grep -r "useEffect" frontend/src --include="*.jsx" --include="*.js" | wc -l)
echo "   📊 Tổng số useEffect: $useeffect_count"
echo "   Top 5 files có nhiều useEffect nhất:"
grep -r "useEffect" frontend/src --include="*.jsx" --include="*.js" -c | sort -t: -k2 -rn | head -5 | while read line; do
    file=$(echo $line | cut -d: -f1)
    count=$(echo $line | cut -d: -f2)
    echo "      - $(basename $file): $count useEffect"
done
echo ""

# 5. Kiểm tra Database Indexes
echo "5️⃣  Kiểm tra Database Indexes..."
echo "-----------------------------------"
if [ -f "backend/src/main/resources/application.yaml" ]; then
    show_sql=$(grep "show-sql" backend/src/main/resources/application.yaml)
    echo "   📝 SQL Logging: $show_sql"
fi
index_files=$(find . -name "*.sql" -exec grep -l "CREATE INDEX" {} \; | wc -l)
echo "   📊 Số file SQL có CREATE INDEX: $index_files"
echo ""

# 6. Kiểm tra File Size Limits
echo "6️⃣  Kiểm tra File Upload Limits..."
echo "-----------------------------------"
if [ -f "backend/src/main/resources/application.yaml" ]; then
    max_file=$(grep "max-file-size" backend/src/main/resources/application.yaml)
    max_request=$(grep "max-request-size" backend/src/main/resources/application.yaml)
    echo "   $max_file"
    echo "   $max_request"
fi
echo ""

# 7. Kiểm tra Dependencies
echo "7️⃣  Kiểm tra Dependencies..."
echo "-----------------------------------"
if [ -f "frontend/package.json" ]; then
    vite_version=$(grep '"vite"' frontend/package.json)
    react_version=$(grep '"react"' frontend/package.json | head -1)
    echo "   $vite_version"
    echo "   $react_version"
fi
echo ""

# 8. Kiểm tra Log Errors
echo "8️⃣  Kiểm tra Backend Logs..."
echo "-----------------------------------"
if [ -f ".run/backend.log" ]; then
    error_count=$(grep -c "ERROR\|Exception\|IllegalArgumentException" .run/backend.log 2>/dev/null || echo "0")
    warn_count=$(grep -c "WARN" .run/backend.log 2>/dev/null || echo "0")
    echo "   ❌ Số lỗi ERROR: $error_count"
    echo "   ⚠️  Số cảnh báo WARN: $warn_count"
    
    if [ $error_count -gt 0 ]; then
        echo ""
        echo "   Lỗi gần nhất:"
        grep "ERROR\|Exception" .run/backend.log | tail -3
    fi
fi
echo ""

# 9. Kiểm tra Memory Usage
echo "9️⃣  Kiểm tra Process đang chạy..."
echo "-----------------------------------"
if [ -f ".run/backend.pid" ]; then
    backend_pid=$(cat .run/backend.pid)
    if ps -p $backend_pid > /dev/null 2>&1; then
        echo "   ✅ Backend đang chạy (PID: $backend_pid)"
        backend_mem=$(ps -p $backend_pid -o rss= | awk '{print $1/1024 " MB"}')
        echo "      Memory: $backend_mem"
    else
        echo "   ❌ Backend không chạy"
    fi
fi

if [ -f ".run/frontend.pid" ]; then
    frontend_pid=$(cat .run/frontend.pid)
    if ps -p $frontend_pid > /dev/null 2>&1; then
        echo "   ✅ Frontend đang chạy (PID: $frontend_pid)"
        frontend_mem=$(ps -p $frontend_pid -o rss= | awk '{print $1/1024 " MB"}')
        echo "      Memory: $frontend_mem"
    else
        echo "   ❌ Frontend không chạy"
    fi
fi
echo ""

# 10. Tổng kết
echo "🎯 TỔNG KẾT"
echo "================================"
echo ""

score=100
issues=()

if [ $join_fetch_count -lt 10 ]; then
    score=$((score - 30))
    issues+=("❌ Thiếu JOIN FETCH optimization (-30 điểm)")
fi

if [ $eager_count -gt 0 ]; then
    score=$((score - 20))
    issues+=("❌ Có FetchType.EAGER (-20 điểm)")
fi

if [ $cache_count -eq 0 ]; then
    score=$((score - 15))
    issues+=("❌ Không có caching (-15 điểm)")
fi

if [ $useeffect_count -gt 100 ]; then
    score=$((score - 10))
    issues+=("⚠️  Quá nhiều useEffect (-10 điểm)")
fi

if [ $index_files -eq 0 ]; then
    score=$((score - 10))
    issues+=("⚠️  Thiếu database indexes (-10 điểm)")
fi

echo "📊 Điểm hiệu suất: $score/100"
echo ""

if [ ${#issues[@]} -gt 0 ]; then
    echo "🔴 Các vấn đề cần khắc phục:"
    for issue in "${issues[@]}"; do
        echo "   $issue"
    done
else
    echo "✅ Không phát hiện vấn đề nghiêm trọng"
fi

echo ""
echo "📄 Chi tiết đầy đủ: PERFORMANCE_AUDIT_REPORT.md"
echo ""
