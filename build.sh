#!/bin/bash
# Catalyst runs this before starting the app
# Installs frontend deps and builds React into frontend/dist/

echo "=== Installing frontend dependencies ==="
cd frontend
npm install
npm run build
cd ..
echo "=== Frontend build complete ==="
echo "=== Installing Python dependencies ==="
pip install -r requirements.txt
echo "=== All done ==="