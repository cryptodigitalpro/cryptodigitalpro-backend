#!/bin/bash

echo "===== 🔍 BACKEND ROOT DEBUG START ====="

echo ""
echo "📁 Current Directory:"
pwd

echo ""
echo "📦 Node Version:"
node -v

echo ""
echo "📦 Installed Packages Check:"
npm list --depth=0

echo ""
echo "🔐 ENV VARIABLES CHECK:"
if [ -f .env ]; then
  cat .env
else
  echo "❌ .env file NOT found"
fi

echo ""
echo "🌐 PORT CHECK:"
lsof -i :5000 || echo "❌ Nothing running on port 5000"

echo ""
echo "🚀 STARTING SERVER WITH LOGS..."
node server.js > server.log 2>&1 &

sleep 3

echo ""
echo "📄 SERVER LOG OUTPUT:"
cat server.log

echo ""
echo "🔥 CHECK FOR ERRORS:"
grep -i "error" server.log || echo "✅ No obvious errors"

echo ""
echo "🌍 TEST API ENDPOINT:"
curl -X GET http://localhost:5000/api || echo "❌ API not responding"

echo ""
echo "===== ✅ BACKEND DEBUG COMPLETE ====="