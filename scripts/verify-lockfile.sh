set -e

echo "Verifying pnpm-lock.yaml is synchronized..."

# Check if package.json was modified
if git diff --cached --name-only | grep -q package.json; then
  echo "package.json modified, checking lockfile sync..."

  # Run pnpm install to verify lockfile
  if ! pnpm install --frozen-lockfile; then
    echo "❌ ERROR: pnpm-lock.yaml is out of sync with package.json"
    echo "Please run: pnpm install"
    echo "Then stage the updated pnpm-lock.yaml file"
    exit 1
  fi

  # Check if lockfile needs to be staged
  if git diff --name-only | grep -q pnpm-lock.yaml; then
    echo "❌ ERROR: pnpm-lock.yaml has unstaged changes"
    echo "Please stage the updated lockfile: git add pnpm-lock.yaml"
    exit 1
  fi
fi

echo "✅ Lockfile verification passed"
