#!/bin/bash
set -e

echo "=== Installing Python dependencies ==="
pip install -r requirements.txt

echo "=== Starting IntelliCrime API ==="
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000