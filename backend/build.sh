#!/bin/bash
# build.sh - Deployment build script for Render

echo "Installing Python dependencies..."
pip install -r requirements.txt

echo "Installing Playwright browsers..."
playwright install chromium

echo "Build complete."
