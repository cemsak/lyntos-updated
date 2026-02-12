# LYNTOS Project Instructions

## Session Protocol

### On Session Start
1. Read SESSION_TRACKER: `/Users/cemsak/.claude/projects/-Users-cemsak-lyntos/memory/SESSION_TRACKER.md`
2. The tracker tells you: current session number, what to do, specific files to touch
3. Read only the audit report(s) listed for that session (NEVER load all 10)
4. Confirm with user: "Session N hazir: [gorev ozeti]. Basla?"

### On Session End (at 60-70% context OR task complete)
1. Run build verification: `cd /Users/cemsak/lyntos/lyntos-ui && pnpm build`
2. Run backend check if Python files changed: `cd /Users/cemsak/lyntos/backend && .venv/bin/python -m pytest tests/ -q`
3. Update SESSION_TRACKER.md with: completed items, any blockers, next session's scope
4. Update MEMORY.md if architectural patterns changed
5. Report: "Session N tamam. [X] dosya degisti. [Y] ogeler bitti. Sonraki: Session N+1: [ozet]"

### Rules
- ONE focused area per session (max 2 related areas)
- Use Task agents for batch operations (grep/replace across 10+ files)
- NEVER load all audit reports at once -- only the one(s) relevant to current session
- Build MUST pass at end of every session
- No changes without user approval
- Context budget: stop at 60-70%, prepare handoff
- Audit reports location: `/Users/cemsak/lyntos/AUDIT_REPORT/`

## Project Essentials
- **Path**: `/Users/cemsak/lyntos/` | Frontend: `lyntos-ui/` | Backend: `backend/`
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS, pnpm (port 3000)
- **Backend**: Python 3.12, FastAPI, SQLite (port 8000)
- **Build**: `cd /Users/cemsak/lyntos/lyntos-ui && pnpm build`
- **Backend start**: `cd /Users/cemsak/lyntos/backend && .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
- **Backend test**: `cd /Users/cemsak/lyntos/backend && .venv/bin/python -m pytest tests/ -q`
- **Auth**: JWT + DEV bypass (`LYNTOS_DEV_AUTH_BYPASS=1`), token `DEV_HKOZKAN`
- **KRITIK**: `getAuthToken()` already returns `Bearer xxx` -- NEVER double-wrap with `Bearer ${token}`
- **Centralized API client**: `app/v2/_lib/api/client.ts` -- `api.get/post/put/patch/delete`
- **API endpoints config**: `app/v2/_lib/config/api.ts` (200+ endpoints)
- **Response envelope**: Backend `utils/response.py` provides `ok(data)` / `error(msg)`, frontend auto-normalizes
- **DB**: SQLite at `backend/database/lyntos.db`, 66 tables
- **Period format**: Frontend sends `2025-Q1` (dash), DB stores `2025_Q1` (underscore)
- **SMMM Isolation**: Her SMMM sadece kendi mukelleflerini gormeli -- `WHERE smmm_id = ?` (asla `OR smmm_id IS NULL`)
- **Branch**: `refactor/backend-upload`
