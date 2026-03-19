#!/bin/bash
set -e

echo "Starting post-create setup..."

# Run the main setup script
bash scripts/setup.sh

# Install Playwright browsers and dependencies
echo "Installing Playwright browsers..."
npx playwright install --with-deps

echo "Dev container setup complete."

# Generate Vim Configuration
cat <<EOF > ~/.vimrc
set expandtab      " Override: Use 4 spaces (default is 8-char tabs)
set shiftwidth=4   " Override: Indent size
set tabstop=4      " Override: Tab visual size
set cmdheight=2    " Override: Extra space for UI messages
set wmw=0          " Override: Allow ultra-thin window splits
set foldmethod=indent " Override: Enable indent-based code folding
EOF

echo "✅ Vim configuration deployed."