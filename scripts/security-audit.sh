#!/bin/bash

echo "=== HRM Security Audit Report ==="
echo "Generated on: $(date)"
echo ""

echo "=== NPM Audit ==="
npm audit --audit-level=moderate

echo ""
echo "=== Checking for sensitive files in git ==="
# Check for common sensitive file patterns
find . -name "*.env*" -not -path "./node_modules/*" -not -path "./.git/*"
find . -name "*secret*" -not -path "./node_modules/*" -not -path "./.git/*"
find . -name "*key*" -not -path "./node_modules/*" -not -path "./.git/*"

echo ""
echo "=== Git secrets check ==="
# Check git history for potential secrets (basic patterns)
echo "Checking for potential secrets in recent commits..."
git log --oneline -10 --grep="password\|secret\|key\|token" || echo "No suspicious commit messages found"

echo ""
echo "=== Package audit summary ==="
echo "Run this script regularly to monitor security status"
echo "Consider integrating with CI/CD pipeline"
echo "Report generated at: $(date)"

