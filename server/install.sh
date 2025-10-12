#!/bin/bash

# ===== NAPALM SKY SERVER INSTALLATION SCRIPT =====
# Run this after cloning the repository
# Usage: chmod +x install.sh && ./install.sh

set -e  # Exit on error

echo "🚀 Installing Napalm Sky Server Dependencies..."
echo ""

# Check Node.js version
echo "📋 Checking Node.js version..."
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18+ required (found: $(node -v))"
    echo "   Install from: https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js version OK: $(node -v)"
echo ""

# Install dependencies
echo "📦 Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p uploads
echo "✅ Uploads directory created"
echo ""

# Copy environment template
if [ ! -f ".env.production" ]; then
    echo "📝 Creating .env.production from template..."
    cp env.production.template .env.production
    echo "✅ .env.production created"
    echo "⚠️  IMPORTANT: Edit .env.production and replace all placeholders!"
else
    echo "ℹ️  .env.production already exists (skipping)"
fi
echo ""

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build
echo "✅ Build complete"
echo ""

# Verify critical dependencies
echo "🔍 Verifying critical dependencies..."
DEPS=("bcrypt" "express-rate-limit" "stripe" "socket.io")
for dep in "${DEPS[@]}"; do
    if npm list "$dep" > /dev/null 2>&1; then
        echo "✅ $dep installed"
    else
        echo "❌ $dep missing!"
        exit 1
    fi
done
echo ""

echo "✅ ===== INSTALLATION COMPLETE ====="
echo ""
echo "Next steps:"
echo "1. Edit .env.production (replace all REPLACE_WITH_* placeholders)"
echo "2. Set up AWS services (RDS, S3, ElastiCache)"
echo "3. Run database schema: psql -h your-endpoint -U postgres -d napalmsky_prod -f schema.sql"
echo "4. Test locally: npm run dev"
echo "5. Deploy to production: docker build -t napalmsky-api ."
echo ""
echo "📚 See PRODUCTION-DEPLOYMENT-GUIDE.md for detailed instructions"

