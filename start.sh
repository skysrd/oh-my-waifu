#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
PYTHON="/opt/homebrew/opt/python@3.11/bin/python3.11"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    echo -e "\n${YELLOW}서버 종료 중...${NC}"
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    wait 2>/dev/null
    echo -e "${GREEN}종료 완료${NC}"
}
trap cleanup EXIT INT TERM

# 1. Python venv 확인/생성
if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "${CYAN}[1/3] Python 가상환경 생성 중...${NC}"
    $PYTHON -m venv "$BACKEND_DIR/.venv"
fi

# 2. Backend 의존성 설치
echo -e "${CYAN}[1/3] 백엔드 의존성 확인 중...${NC}"
source "$BACKEND_DIR/.venv/bin/activate"
pip install -q -r "$BACKEND_DIR/requirements.txt" 2>/dev/null

# 3. Frontend 의존성 설치
echo -e "${CYAN}[2/3] 프론트엔드 의존성 확인 중...${NC}"
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    (cd "$FRONTEND_DIR" && npm install --quiet)
fi

# 4. 서버 실행
echo -e "${CYAN}[3/3] 서버 시작...${NC}"
echo ""

# Backend
(cd "$BACKEND_DIR" && uvicorn main:app --host 0.0.0.0 --port 8000 --reload) &
BACKEND_PID=$!

# Frontend
(cd "$FRONTEND_DIR" && npx vite --host --port 5173) &
FRONTEND_PID=$!

sleep 2
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Oh My Waifu - AI 아바타 어시스턴트${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  프론트엔드: ${CYAN}http://localhost:5173${NC}"
echo -e "  백엔드 API: ${CYAN}http://localhost:8000${NC}"
echo -e "  API 문서:   ${CYAN}http://localhost:8000/docs${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "  ${YELLOW}Ctrl+C${NC}로 종료"
echo ""

wait
