#!/bin/bash

# Test script for react-auto-i18ner
# This script tests the package functionality

echo "🧪 Testing React Auto i18ner Package"
echo "======================================"

echo ""
echo "1. Building the package..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else 
    echo "❌ Build failed"
    exit 1
fi

echo ""
echo "2. Testing CLI help..."
node dist/cli.js --help | head -5

echo ""
echo "3. Testing CLI version..."
node dist/cli.js --version

echo ""
echo "4. Testing project validation (should fail in this directory)..."
echo "Expected: Should detect this is not a React project"
node dist/cli.js 2>&1 | head -10

echo ""
echo "✅ All tests completed!"
echo ""
echo "🚀 Ready to publish! Users can now run:"
echo "   npx react-auto-i18ner"
echo ""
echo "📦 To publish to npm:"
echo "   npm publish"
