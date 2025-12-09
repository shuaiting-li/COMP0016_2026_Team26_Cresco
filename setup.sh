#!/bin/bash
# Quick setup script for Agritech Assistant
# Run this after cloning the repository

set -e  # Exit on error

echo "🌱 Agritech Assistant - Setup Script"
echo "===================================="
echo ""

# Check Python version
echo "📋 Checking Python version..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 is not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "✅ Found Python $PYTHON_VERSION"

# Check Node.js version
echo ""
echo "📋 Checking Node.js version..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Warning: Node.js is not installed"
    echo "   Frontend setup will be skipped"
    echo "   Install Node.js 18+ from: https://nodejs.org/"
    SKIP_FRONTEND=true
else
    NODE_VERSION=$(node --version)
    echo "✅ Found Node.js $NODE_VERSION"
    SKIP_FRONTEND=false
fi

# Create virtual environment
echo ""
echo "🔨 Creating virtual environment..."
if [ -d ".venv" ]; then
    echo "⚠️  .venv directory already exists, skipping..."
else
    python3 -m venv .venv
    echo "✅ Virtual environment created"
fi

# Activate virtual environment
echo ""
echo "🔌 Activating virtual environment..."
source .venv/bin/activate
echo "✅ Virtual environment activated"

# Upgrade pip
echo ""
echo "📦 Upgrading pip..."
pip install --upgrade pip -q
echo "✅ pip upgraded"

# Install Python dependencies
echo ""
echo "📚 Installing Python dependencies..."
pip install -e .[dev] -q
echo "✅ Python dependencies installed"

# Create .env if it doesn't exist
echo ""
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists, skipping..."
else
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "✅ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env and add your GEMINI_API_KEY"
    echo "   Get your key from: https://aistudio.google.com/app/apikey"
fi

# Run Python tests
echo ""
echo "🧪 Running backend tests..."
pytest -v --tb=short
if [ $? -eq 0 ]; then
    echo "✅ All backend tests passed!"
else
    echo "❌ Some tests failed"
    exit 1
fi

# Setup Frontend
if [ "$SKIP_FRONTEND" = false ]; then
    echo ""
    echo "🎨 Setting up frontend..."
    cd frontend
    
    if [ -d "node_modules" ]; then
        echo "⚠️  node_modules already exists, skipping npm install..."
    else
        echo "📦 Installing frontend dependencies..."
        npm install --silent
        echo "✅ Frontend dependencies installed"
    fi
    
    echo ""
    echo "🔨 Building frontend..."
    npm run build --silent
    if [ $? -eq 0 ]; then
        echo "✅ Frontend build successful!"
    else
        echo "❌ Frontend build failed"
        exit 1
    fi
    
    cd ..
fi

# Success message
echo ""
echo "✅ Setup complete!"
echo ""
echo "======================================"
echo "🚀 Quick Start Guide"
echo "======================================"
echo ""
echo "1. Activate the virtual environment:"
echo "   source .venv/bin/activate"
echo ""
echo "2. Edit .env and add your GEMINI_API_KEY"
echo ""
echo "3. Start the backend server:"
echo "   uvicorn app.main:app --reload"
echo ""
if [ "$SKIP_FRONTEND" = false ]; then
    echo "4. Start the frontend (in a new terminal):"
    echo "   cd frontend && npm run dev"
    echo ""
    echo "5. Open http://localhost:3000 in your browser"
else
    echo "4. Visit http://127.0.0.1:8000/docs to test the API"
fi
echo ""
echo "For more details, see docs/SETUP.md"

