#!/bin/bash
set -e

echo ""
echo "🎽 ThreadCraft T-Shirt Designer — Setup"
echo "========================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js is not installed."
  echo "   Please install Node.js 18+ from https://nodejs.org"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ required. Current: $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi

echo "✅ npm $(npm -v) detected"
echo ""
echo "📦 Installing dependencies..."
echo ""

npm install

echo ""
echo "✅ Dependencies installed!"
echo ""
echo "🚀 Starting development server..."
echo ""
echo "   App will be available at: http://localhost:3000"
echo ""

npm run dev
