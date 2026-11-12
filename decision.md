# JanSeva — Phased Delivery Plan & Architectural Decision Record (`decision.md`)

This document divides the **JanSeva (जनसेवा)** build into structured phases, tracks completion, and documents the **product, governance, and technical problems** alongside **how we solved each problem**.

---

## Part 1: Phased Execution Plan

| Phase | Scope & Deliverables | Status | Verification |
| :--- | :--- | :--- | :--- |
| **Phase 1: Foundation & Relational Database** | Next.js 16 App Router + TypeScript + Tailwind v4 setup; PostgreSQL 17 `janseva` DB; Prisma schema (`prisma/schema.prisma`) with separate `Complaint` and `Project` models, estimates, MB measurements, inspections, decisions, audit trail, routing rules; seeded Jharkhand demo data (`prisma/seed.ts`). | **Completed** | `npx prisma db push` & `npx prisma db seed` (5 GPs, 5 depts, 6 users, 10 projects, 20 complaints). |
| **Phase 2: Security, RBAC & Workflow Engine** | `bcryptjs` password hashing + `jose` HTTP-only JWT session cookies (`src/lib/auth.ts`); server-side `requireRole()` checks; validated state transitions (`src/lib/workflow.ts`); immutable `AuditEvent` logging; public-safe notification creation. | **Completed** | Unauthenticated `/api/admin` returns `401`; Reviewing Officer attempting final resolution returns `403`. |
| **Phase 3: Citizen Portal, Bilingual UI & Maps** | Hindi-first UI with English toggle (`src/lib/i18n.ts`); mobile-first complaint form (`src/app/page.tsx`) with 9 categories, photo upload, voice recording, and Leaflet draggable pin (`LeafletPickerMap.tsx`); clustered public map (`src/app/map/page.tsx`); public-safe tracking (`src/app/track/page.tsx`). | **Completed** | `POST /api/complaints` creates `JSV-2026-XXXX`; `/api/track/JSV-2026-0001` redacts PII. |
| **Phase 4: AI Intake & Configurable Routing** | AI provider abstraction (`src/lib/ai/provider.ts`) supporting Gemini, OpenAI, and deterministic Demo fallback; Hindi-to-English summaries, transparent priority/dept reasoning, duplicate detection, and project proximity matching (`src/lib/routing.ts`); Manual Triage queue for uncertain cases. | **Completed** | Hindi road complaint auto-links to `PRJ-RWD-101` with explanation. |
| **Phase 5: Officer Dashboard, 3-Stage Verification & Evidence Room** | Desktop-first Officer Dashboard (`src/app/officer/page.tsx`) with 8 KPIs, priority queue, and officer map; Case Workspace (`src/app/officer/cases/[id]/page.tsx`) with Stage 1 Desk Scrutiny, **3-Column Project Evidence Room**, Stage 2/3 Inspection & Decision panel, and Audit Trail; Field Officer mobile app (`src/app/field/page.tsx`) with GPS, Hindi dictation, and offline `localStorage` draft sync; Admin Console (`src/app/admin/page.tsx`). | **Completed** | All 7 routes return HTTP `200`; `npx tsc --noEmit` & `npm run build` pass. |
| **Phase 6: Documentation & End-to-End Verification** | Comprehensive `README.md`, `decision.md`, live production server verification (`npm run start`), E2E API/RBAC checks, and clean DB re-seed. | **Completed** | E2E verification script passed against `http://localhost:3000`. |

---

## Part 2: Core Product & Governance Problems and Our Solutions

### Problem 1: Disconnection Between Citizen Complaints and Sanctioned Government Projects
- **The Problem:** Standard grievance portals treat a villager's report ("the new road broke in 2 months") as an isolated text ticket, without linking it to the sanctioned estimate, work order, expenditure, or Measurement Book (MB) of the actual development project.
- **How We Solved It:**
  - Modeled `Project` and `Complaint` as separate relational entities in `prisma/schema.prisma` (since not every civic issue has a capital project, e.g., blocked village drains).
  - During intake (`src/lib/routing.ts`), the system checks Haversine GPS proximity to nearby projects and suggests a project link with a transparent reason, while allowing officers to manually link/unlink projects in the Case Workspace.

### Problem 2: Paper Completion vs. Ground Reality Discrepancies
- **The Problem:** Projects are sometimes marked "completed" on paper with full expenditure drawn, even when physical dimensions (e.g., pond depth or road bitumen thickness) fall short on the ground.
- **How We Solved It:**
  - Built the **3-Column Project Evidence Room** (`src/app/officer/cases/[id]/page.tsx`) comparing:
    1. **Sanctioned Project Information** (`ProjectEstimate`)
    2. **Official Records & Submitted Evidence** (`ProjectMeasurement` / MB + Before/During/After photos)
    3. **Actual Field Inspection Findings** (`InspectionMeasurement` + GPS + site photos)
  - Automatically computes numerical variance (e.g., Scenario B: Sanctioned `2.0m`, MB `1.8m`, Field `1.5m` → `-0.5m` variance) and displays a mandatory notice that **photographs alone cannot prove dimensions, material quality, or structural safety**, requiring technical officer validation.

### Problem 3: AI Overreach vs. Accountable Government Decisions
- **The Problem:** Letting an AI model silently assign departments, reject complaints, or declare wrongdoing violates administrative accountability, and external LLM API keys may not always be configured in demo/offline environments.
- **How We Solved It:**
  - Built a clean provider abstraction (`src/lib/ai/provider.ts`) supporting `gemini`, `openai`, and a deterministic `demo` fallback (`AI_PROVIDER="demo"`).
  - AI only produces **transparent recommendations** (with explanations for priority, department, and missing documents). All binding decisions (`APPROVE_ACTION`, `APPROVE_COMPLETION`, `RETURN_FOR_EVIDENCE`, `REQUEST_REINSPECTION`, `REFER_FOR_INQUIRY`, `REJECT_COMPLAINT`, `RECORD_RESOLUTION`) require an authenticated human officer and a mandatory written reason.

### Problem 4: Duplicate Citizen Reports Losing Individual Accountability
- **The Problem:** When 3 villagers report the same broken handpump, auto-merging or deleting duplicates erases individual citizen tracking numbers.
- **How We Solved It:**
  - `ComplaintRelationship` links nearby/duplicate complaints (`DUPLICATE` / `RELATED_LOCATION`) into a grouped cluster view in the Officer Case Workspace while **preserving every citizen's original complaint and `JSV-2026-XXXX` reference number**.

### Problem 5: Citizen Privacy vs. Public Transparency
- **The Problem:** Citizens need to track their complaint status publicly without logging in, but exposing phone numbers, internal officer notes, or inquiry referrals publicly violates privacy.
- **How We Solved It:**
  - `/api/track/[ref]` and `/api/complaints` (when unauthenticated) strictly redact `citizenPhone`, `citizenEmail`, internal officer notes, and confidential documents, exposing only the 6-step public timeline, department name, and `ResolutionRecord.publicSafeSummary`.

### Problem 6: Rural Connectivity Gaps During Field Inspections
- **The Problem:** Field officers visiting remote Gram Panchayats in Jharkhand often lose mobile data connectivity while recording measurements and observations.
- **How We Solved It:**
  - The Field Officer App (`/field`) monitors `navigator.onLine`, supports **Save Offline Draft** to `localStorage` (`janseva_field_draft_<id>`), and preserves GPS coordinates, checklist state, measurements, and observations until the officer is back online to submit.

---

## Part 3: Technical Challenges Encountered & How We Solved Them

1. **PostgreSQL Port & Prisma Version Compatibility**
   - *Problem:* Local PostgreSQL 17 was listening on port `5433` rather than `5432`, and `npm install prisma` initially pulled an unstable `8.0.0-rc` release.
   - *Solution:* Configured `.env` with port `5433` for the local `janseva` database (while keeping `5432` in `.env.example`), and pinned `prisma@6.6.0` and `@prisma/client@6.6.0` for rock-solid stability.

2. **Next.js 16 Cache Components & Client Hook Prerendering**
   - *Problem:* `npm run build` flagged `usePathname()` in `TopNav.tsx` and `useParams()` in `/officer/cases/[id]/page.tsx` for lacking a `<Suspense>` boundary during static prerendering.
   - *Solution:* Wrapped `<TopNav />` and `{children}` in `<Suspense>` inside `src/app/layout.tsx`, resolving the build error cleanly.

3. **Leaflet SSR & Marker Clustering in Next.js App Router**
   - *Problem:* Leaflet references `window` on import, which breaks Server-Side Rendering.
   - *Solution:* Dynamically imported `leaflet` and `leaflet.markercluster` inside `useEffect` in `'use client'` map components (`LeafletPickerMap.tsx`, `LeafletOverviewMap.tsx`) and imported Leaflet/MarkerCluster CSS in `layout.tsx`.

---

## Part 4: Phase 7 — Real AI/ML Integration (Image Authenticity Detection)

| Phase | Scope & Deliverables | Status | Verification |
| :--- | :--- | :--- | :--- |
| **Phase 7: Real Gemini AI & Image Authenticity Detection** | Real Gemini Vision API for image authenticity analysis; `analyzeImageAuthenticity()` function in `src/lib/ai/provider.ts`; `POST /api/analyze-image` route; `imageAnalysisJson Json?` field on `EvidenceFile` model; **Analyze Image** buttons on all 3 photo evidence columns in Officer Case Workspace and Citizen Attachments section. | **Completed** | Build passes (0 errors); `ƒ /api/analyze-image` appears in Next.js route manifest; `npx prisma db push` applied `imageAnalysisJson` column. |

### Problem 7: Fake / Manipulated Evidence Photos
- **The Problem:** Officers or unscrupulous contractors may submit manipulated, stock, or recycled photographs as "site evidence" for completed projects (e.g., re-using the same "after" photo for multiple completion certificates, or submitting a stock image of a road instead of an actual site photo). Without technical AI-assisted checking, reviewers cannot quickly detect these.
- **How We Solved It:**
  - Added `analyzeImageAuthenticity(fileUrl, context)` to `src/lib/ai/provider.ts`.
  - When `AI_PROVIDER=gemini` and `GEMINI_API_KEY` is set, the function reads the uploaded image file from disk, base64-encodes it, and calls the **Gemini 2.0 Flash Vision API** with a detailed field-verification prompt, returning:
    - `verdict`: `LIKELY_AUTHENTIC` | `POTENTIALLY_MANIPULATED` | `INSUFFICIENT_DATA`
    - `confidenceScore`: 0–1 float
    - `flags[]`: Specific observations (e.g. "Uniform background inconsistent with field setting", "Consistent lighting and natural image noise")
    - `recommendation`: Clear one-sentence action for the reviewing officer
    - `disclaimer`: Mandatory caveat that AI cannot certify authenticity with certainty
  - Demo fallback when no key is configured: returns `INSUFFICIENT_DATA` with a clear message instructing how to enable real analysis.
  - Created `POST /api/analyze-image` (officer-only, session-authenticated) which calls the function and optionally persists the JSON result to `EvidenceFile.imageAnalysisJson` in the database.
  - Added `ImageAuthBadge` component (inline in `/officer/cases/[id]/page.tsx`) showing:
    - 🟢 Green shield for `LIKELY_AUTHENTIC`
    - 🔴 Red shield for `POTENTIALLY_MANIPULATED`
    - 🟡 Amber shield for `INSUFFICIENT_DATA`
  - **"Analyze Image" button** appears on every photo card in the Officer Case Workspace:
    1. Citizen complaint attachments (Overview tab) — context: `citizen_complaint`
    2. Project Before/During photos (Evidence Room tab) — context: `project_document`
    3. Project completion/After photos (Evidence Room tab) — context: `project_document`
    4. Field inspection evidence files (Evidence Room tab) — context: `field_inspection`

### How to Enable Real AI (Gemini)
```env
# In .env:
AI_PROVIDER=gemini
GEMINI_API_KEY=your_actual_gemini_api_key_here
```
Once set, restart the server (`npm run start` or `npm run dev`). All intake analysis, routing explanation, and image authenticity checks will use live Gemini 2.0 Flash API calls. The system gracefully falls back to the deterministic demo if the key is invalid or the API call fails.

### Critical Design Constraints Maintained
- **AI is advisory only.** The image analysis result shows as a badge with confidence score and flags — it never automatically rejects a photo or blocks submission. The human officer must decide.
- **Mandatory disclaimer** is always shown: *"AI image analysis is an advisory tool. Photographs alone cannot prove physical dimensions, structural quality, or authenticity with certainty."*
- **Privacy:** The `/api/analyze-image` route requires officer authentication; citizens cannot call it.
- **Graceful degradation:** If the GEMINI_API_KEY is not configured or the API fails, the system returns a clear demo/fallback response instead of crashing.

