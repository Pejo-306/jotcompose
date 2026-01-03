#!/bin/bash

# Root setup script for jotcompose
# Sets up environment files for the root and all microservices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "========================================="
echo "Setting up jotcompose environment files"
echo "========================================="
echo ""

# Setup root .env file
echo "Setting up root environment file..."
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✓ Created .env from .env.example"
        echo "  Please edit .env with your actual values if needed"
    else
        echo "✗ Error: .env.example not found in repo root"
        exit 1
    fi
else
    echo "✓ .env already exists, skipping"
fi
echo ""

# Setup notebooks microservice
if [ -f notebooks/setup.sh ]; then
    echo "Running notebooks/setup.sh..."
    bash notebooks/setup.sh
    echo ""
else
    echo "⚠ Warning: notebooks/setup.sh not found, skipping notebooks setup"
    echo ""
fi

# Setup notes microservice
if [ -f notes/setup.sh ]; then
    echo "Running notes/setup.sh..."
    bash notes/setup.sh
    echo ""
else
    echo "⚠ Warning: notes/setup.sh not found, skipping notes setup"
    echo ""
fi

echo "========================================="
echo "Root setup complete!"
echo "========================================="
echo ""
echo "All environment files have been set up."
echo "The default values in .env files should work for local development."
echo "You may edit the .env files with your actual values if needed before running 'docker compose up'."

