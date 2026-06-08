# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A health & lifestyle tracking WeChat mini-program (小程序) that helps users identify and adjust habits that may contribute to chronic health issues. The app records daily habits (sleep, diet, exercise, work patterns), supports health metric check-ins (weight, blood pressure, etc.), and uses AI to analyze correlations between lifestyle and health indicators.

## Tech Stack

- **Frontend**: uni-app (Vue 3 + TypeScript + Pinia) — WeChat mini-program
- **Backend**: Node.js + Fastify + TypeScript
- **Database**: SQLite (better-sqlite3, WAL mode)
- **AI**: DeepSeek (health analysis), SiliconFlow PaddleOCR-VL (report OCR)

## Development Commands

```bash
# Frontend (from client/)
npm install
npm run dev:mp-weixin      # Dev mode for WeChat
npm run build:mp-weixin    # Production build

# Backend (from server/)
npm install
npm run dev                 # Dev mode with hot reload (tsx watch)

# Type check (from server/)
npx tsc --noEmit
```

## Project Structure

```
client/src/
  pages/          # All pages (index, onboarding, habit, metrics, analysis, report, profile, history)
  stores/         # Pinia stores (user, habit, metric, chat)
  api/            # API request wrapper (auto JWT, 401 retry)
  utils/          # Constants, storage helpers
server/src/
  routes/         # Fastify route handlers (auth, user, habit, metric, analysis, report)
  services/       # AI service (DeepSeek), OCR service (SiliconFlow)
  db/             # SQLite init + schema
```

## Environment Variables (server)

```bash
WX_APPID=          # WeChat mini-program AppID
WX_SECRET=         # WeChat mini-program AppSecret
JWT_SECRET=        # JWT signing secret
DEEPSEEK_API_KEY=  # DeepSeek API key
SILICONFLOW_API_KEY=  # SiliconFlow OCR API key
```

## API Keys

See `requirement.md` lines 144, 146 for SiliconFlow and DeepSeek keys.

## Project Management

OpenSpec is configured in `openspec/config.yaml`. Use `/opsx:propose` to create change proposals, `/opsx:apply` to implement.

## Git

Independent repo at `git@github.com:lx-ruc/health-app.git`.
