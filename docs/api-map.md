# API map — generated reference

Regenerate: `npm run api:map` (scans app/api — do not edit by hand).
Generated: 2026-09-10T09:55:49.304Z

**65 routes.** Auth legend: admin = admin session cookie · user = employee PIN session · user-own = session may only touch its own slug · cron-secret = Bearer CRON_SECRET · OPEN = no auth (must be justified below).

## OPEN

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/admin/login` | POST | — | login_attempts | — |
| `/api/admin/logout` | POST | — | — | — |
| `/api/auth/verify-pin` | POST | — | employees, login_attempts | — |
| `/api/basecamp/auth` | GET | — | — | — |
| `/api/basecamp/callback` | GET | — | — | — |
| `/api/basecamp/webhook` | POST | `/api/checkin`<br>`/api/checkout`<br>`/api/admin/chatbot-data` | — | — |
| `/api/beta-signup` | POST | — | beta_signups | — |
| `/api/employees` | GET | — | employees | — |

## admin

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/admin/basecamp-announcement` | POST | — | — | — |
| `/api/admin/birthdays` | GET | — | employees | — |
| `/api/admin/check-auth` | GET | — | — | — |
| `/api/admin/employees/:id` | DELETE, GET, PATCH, POST, PUT | — | employee_documents, employees | — |
| `/api/admin/holidays` | DELETE, GET, POST | — | holidays | — |
| `/api/admin/set-pin` | DELETE, POST | — | employees | — |
| `/api/basecamp/create-chatbot` | POST | — | — | — |
| `/api/basecamp/setup-chatbot` | GET | — | — | — |
| `/api/basecamp/test-webhook` | POST | — | — | — |
| `/api/employee` | POST | — | employees | — |
| `/api/leave/accrual` | POST | — | employees, leave_accruals, leave_balances, leave_types, sessions | — |

## admin ∨ user

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/admin-chat` | POST | — | — | — |
| `/api/admin/attendance-report` | GET | — | employees, leave_requests, sessions | — |
| `/api/admin/chatbot-data` | GET | — | employees, sessions | — |
| `/api/admin/daily-stats` | GET | — | employees, sessions | — |
| `/api/admin/historical-data` | GET | — | sessions | — |
| `/api/admin/knowledge-base` | DELETE, GET, POST, PUT | — | — | — |
| `/api/admin/leaderboard` | GET | — | employees, sessions | — |
| `/api/admin/leave-requests` | GET | — | leave_requests | — |
| `/api/admin/leave-requests/process` | POST | — | leave_requests | — |
| `/api/admin/mood-data` | GET | — | sessions | — |
| `/api/admin/recent-activity` | GET | — | employees, sessions | — |
| `/api/admin/recommend-tags` | POST | — | — | — |
| `/api/admin/reset-sessions` | POST | — | sessions | — |
| `/api/admin/saved-responses` | DELETE, GET, POST, PUT | — | saved_responses | — |
| `/api/admin/stats` | GET | — | employees, sessions | — |
| `/api/admin/today` | GET | — | employees, leave_requests, sessions | — |
| `/api/admin/today-export` | GET | — | employees, sessions | — |
| `/api/admin/update-leave-balance` | POST | — | leave_balances, leave_types | — |
| `/api/admin/user-stats` | GET | — | employees, sessions | — |
| `/api/admin/users` | DELETE, GET, POST, PUT | — | employees, leave_balances, leave_types | — |
| `/api/ai/assistant` | POST | — | — | — |
| `/api/ai/insights` | POST | — | — | — |
| `/api/ai/notification` | POST | — | — | — |
| `/api/ai/report` | POST | — | — | — |
| `/api/ai/schedule-suggestions` | POST | — | — | — |
| `/api/ai/sentiment` | POST | — | — | — |
| `/api/wfh-schedule` | GET, POST | — | wfh_schedule | — |

## cron-secret

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/cron/auto-checkout` | POST | — | sessions | — |
| `/api/cron/summary` | POST | — | — | — |

## user

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/attendance/history` | GET | — | employees, sessions | — |
| `/api/attendance/monthly` | GET | — | holidays, leave_requests, sessions | — |
| `/api/auth/change-pin` | POST | — | employees | — |
| `/api/checkin` | POST | — | employees, sessions | — |
| `/api/checkout` | POST | — | employees, sessions | — |
| `/api/dashboard/init` | GET | `/api/leave/balance`<br>`/api/monthly/stats`<br>`/api/stats/punctuality`<br>`/api/today/summary` | employees | — |
| `/api/session/open` | GET | — | employees, sessions | — |
| `/api/summary/me` | GET | — | employees, sessions | — |

## user-own ∨ user|admin

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/leave/balance` | GET | — | — | — |
| `/api/leave/request` | GET, PATCH, POST | — | employees, leave_balances, leave_requests, leave_types | — |
| `/api/monthly/stats` | GET | — | employees, sessions | — |
| `/api/stats/punctuality` | GET | — | employees, sessions | — |

## user|admin

| Route | Methods | Calls (internal) | Tables | RPCs |
|---|---|---|---|---|
| `/api/giphy/get-well` | GET | — | — | — |
| `/api/leave/types` | GET | — | leave_types | — |
| `/api/sessions/update-mood` | PUT | — | employees, sessions | — |
| `/api/today` | GET | — | — | — |
| `/api/today/summary` | GET | — | employees, sessions | — |

## ⚠ Cookie-dropping self-fetches

These routes fetch sibling API routes without forwarding the request cookie — the inner call silently 401s once the target is auth-gated:

- `/api/basecamp/webhook` → /api/checkin, /api/checkout, /api/admin/chatbot-data

## OPEN routes — justification register

Every route below has no auth. Keep this list short and each entry justified:
- `/api/admin/login` — credential check itself (rate-limited via login_attempts)
- `/api/admin/logout` — clears a cookie; nothing read
- `/api/auth/verify-pin` — credential check itself (rate-limited via login_attempts)
- `/api/basecamp/auth` — OAuth entry redirect
- `/api/basecamp/callback` — OAuth callback (verifies state/code with Basecamp)
- `/api/basecamp/webhook` — shared-secret token gate (BASECAMP_WEBHOOK_TOKEN) — see route
- `/api/beta-signup` — public beta signup form (validated + capped goals)
- `/api/employees` — login-screen name autocomplete; returns id/full_name/slug only, ≥2-char query, limit 10
