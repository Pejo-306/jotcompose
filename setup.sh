#!/bin/bash

# Root setup script for jotcompose
# Calls setup scripts for all microservices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "Setting up jotcompose environment files"
echo "========================================="
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
echo "All microservice environment files have been set up."
echo "Remember to edit the .env files with your actual values before running docker compose up."

