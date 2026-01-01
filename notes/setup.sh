#!/bin/bash

# Setup script for notes microservice
# Creates .env files from .example files if they don't already exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Setting up notes microservice environment files..."

# .env.db.user
if [ ! -f .env.db.user ]; then
    if [ -f .env.db.user.example ]; then
        cp .env.db.user.example .env.db.user
        echo "✓ Created .env.db.user from .env.db.user.example"
        echo "  Please edit .env.db.user with your actual values"
    else
        echo "✗ Error: .env.db.user.example not found"
        exit 1
    fi
else
    echo "✓ .env.db.user already exists, skipping"
fi

# .env.db.root
if [ ! -f .env.db.root ]; then
    if [ -f .env.db.root.example ]; then
        cp .env.db.root.example .env.db.root
        echo "✓ Created .env.db.root from .env.db.root.example"
        echo "  Please edit .env.db.root with your actual values"
    else
        echo "✗ Error: .env.db.root.example not found"
        exit 1
    fi
else
    echo "✓ .env.db.root already exists, skipping"
fi

echo ""
echo "Setup complete for notes microservice!"
echo "Remember to edit the .env files with your actual values before running docker compose."

