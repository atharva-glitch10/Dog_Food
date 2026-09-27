#!/bin/bash
# ==============================================================================
# DOGFOOD 2026 — One-Command Stack Setup Script
#
# Automatically initializes environment variables, starts PostgreSQL,
# provisions schemas, seeds realistic test fixtures, and boots the backend & frontend.
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}   🐕 DOGFOOD 2026: Hackathon Judging & Submission Platform   ${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# 1. Environment Config Setup
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}[1/4] Generating .env from .env.example...${NC}"
    cp .env.example .env
else
    echo -e "${GREEN}[1/4] .env configuration detected.${NC}"
fi

# Also ensure backend/.env exists
if [ ! -f "backend/.env" ]; then
    cp .env backend/.env
fi

# 2. Check Docker availability
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo -e "${GREEN}[2/4] Docker daemon active. Booting entire stack via Docker Compose...${NC}"
    
    # Check docker compose syntax
    if docker compose version >/dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi

    echo -e "${BLUE}[3/4] Building and launching containers in detached mode...${NC}"
    $COMPOSE_CMD down -v --remove-orphans 2>/dev/null || true
    $COMPOSE_CMD up --build -d

    echo -e "${YELLOW}[4/4] Waiting for services to reach healthy status...${NC}"
    
    # Wait for backend healthcheck
    MAX_RETRIES=40
    COUNT=0
    until curl -s http://localhost:4000/api/health | grep -q "healthy" || [ $COUNT -eq $MAX_RETRIES ]; do
        sleep 2
        COUNT=$((COUNT+1))
        echo -n "."
    done
    echo ""

    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo -e "${YELLOW}Notice: Backend is taking longer than usual to seed. Check logs with '$COMPOSE_CMD logs -f backend'.${NC}"
    else
        echo -e "${GREEN}✓ All services are UP and HEALTHY!${NC}"
    fi

else
    echo -e "${YELLOW}[2/4] Docker daemon is not running or not installed.${NC}"
    echo -e "${BLUE}      Falling back to local Node.js development mode...${NC}"
    
    # Check node
    if ! command -v node >/dev/null 2>&1; then
        echo -e "${RED}Error: Node.js (v18+) is required to run locally without Docker.${NC}"
        exit 1
    fi

    echo -e "${BLUE}[3/4] Installing backend dependencies and generating Prisma client...${NC}"
    cd backend
    npm install
    npx prisma generate
    cd ..

    echo -e "${BLUE}[4/4] Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    cd ..

    echo -e "${GREEN}✓ Dependencies installed successfully!${NC}"
    echo -e "${YELLOW}To launch local development servers:${NC}"
    echo -e "  Backend:  cd backend && npm run dev"
    echo -e "  Frontend: cd frontend && npm run dev"
    exit 0
fi

echo ""
echo -e "${GREEN}======================================================================${NC}"
echo -e "${GREEN}   🚀 PLATFORM READY AT: http://localhost:3000                        ${NC}"
echo -e "${GREEN}======================================================================${NC}"
echo ""
echo -e "${BLUE}Endpoint URLs:${NC}"
echo -e "  • Frontend Web UI:        ${GREEN}http://localhost:3000${NC}"
echo -e "  • Backend REST API:       ${GREEN}http://localhost:4000/api${NC}"
echo -e "  • Interactive Swagger:    ${GREEN}http://localhost:4000/api/docs${NC}"
echo -e "  • Health Check:           ${GREEN}http://localhost:4000/api/health${NC}"
echo ""
echo -e "${BLUE}Demo User Credentials (Password for all: 'Dogfood2026!'):${NC}"
echo -e "  • Admin Superuser:        ${YELLOW}admin@dogfood.local${NC}"
echo -e "  • Organizer Director:     ${YELLOW}organizer@dogfood.local${NC}"
echo -e "  • Harsh Judge:            ${YELLOW}judge.harsh@dogfood.local${NC}"
echo -e "  • Lenient Judge:          ${YELLOW}judge.lenient@dogfood.local${NC}"
echo -e "  • Team Alpha Lead:        ${YELLOW}lead.alice@dogfood.local${NC}"
echo -e "  • Team Beta Lead:         ${YELLOW}lead.carol@dogfood.local${NC}"
echo ""
echo -e "To view live logs:    ${YELLOW}docker compose logs -f${NC}"
echo -e "To stop the stack:    ${YELLOW}docker compose down${NC}"
echo -e "${BLUE}======================================================================${NC}"
