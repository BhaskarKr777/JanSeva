# JanSeva (जनसेवा)

**Citizen Reporting, Ground-Level Verification and Evidence-Based Government Action Platform — Jharkhand Demonstration**

> **Disclaimer:** This is a demonstration prototype containing **simulated** Gram Panchayats, development projects, and complaint records. It does not claim official government integration or endorsement.

---

## 1. Problem Statement & Why JanSeva is Needed

In rural and semi-urban regions of Jharkhand, citizens frequently report local infrastructure issues—prematurely damaged roads, incomplete community ponds, broken handpumps, blocked drains, or unfinished Panchayat buildings. Traditional grievance portals treat these reports as generic text tickets, disconnected from:
1. Whether a **sanctioned government development project** already exists at that location.
2. The project's **sanctioned estimate, work order, expenditure, Measurement Book (MB), and completion photos**.
3. **Geotagged ground-level verification** by a field engineer with physical measurements and local-language observations.

**JanSeva** bridges this gap with a structured workflow:
**Citizen report → AI-assisted intake & configurable routing → Desk scrutiny → Field verification → Evidence Room comparison → Officer decision → Public-safe resolution tracking.**

---

## 2. Target Users & Roles

1. **Citizen (`CITIZEN`)**: Report issues on an interactive map in Hindi or English without complex registration, attach photos/voice notes, and track status via a unique reference number.
2. **Field Officer (`FIELD_OFFICER`)**: Mobile-first inspection app to capture live GPS coordinates, upload site photos, record physical measurements, dictate Hindi observations, save offline drafts, and submit inspection reports.
3. **Reviewing Officer (`REVIEWING_OFFICER`)**: Conduct Desk Scrutiny of project dossiers, review AI discrepancy flags, schedule field inspections, return cases for missing evidence, and recommend action.
4. **Approving Officer (`APPROVING_OFFICER`)**: Review complete 3-column evidence, approve action/completion, request reinspection, refer cases for further inquiry, and record final resolutions with mandatory reasons.
5. **Administrator (`ADMIN`)**: Configure departments, blocks, Gram Panchayats, issue categories, routing rules, users, and view system-wide analytics.

---

## 3. Jharkhand Context & Complementary Role

JanSeva is tailored for Jharkhand's block and Gram Panchayat governance context (Ranchi district demo blocks: *Ormanjhi*, *Bundu*, *Kanke*; 5 fictional Demo Gram Panchayats). It is designed as a **complementary field-verification and evidence-comparison layer** alongside existing public grievance or scheme portals, rather than replacing official state systems.

---

## 4. Key Features Implemented

- **Hindi-First & English Toggle**: Full bilingual UI with `Noto Sans Devanagari` typography.
- **Interactive Leaflet + OpenStreetMap**: Draggable reporting pin, GPS current-location detection (with graceful permission denial fallback), location search, marker clustering (`leaflet.markercluster`), and project overlays.
- **AI Intake, Document Scrutiny & Field Analysis**: Provider abstraction (`src/lib/ai/provider.ts`) supporting `GEMINI_API_KEY`, `OPENAI_API_KEY`, and a deterministic **Demo Mode** fallback (`AI_PROVIDER="demo"`). AI assists with Hindi-to-English summaries, priority/department suggestions with transparent explanations, duplicate detection, and document/measurement variance detection. **All binding decisions remain with authorised human officers.**
- **Three-Stage Verification Workflow & Project Evidence Room**:
  - **Stage 1 (Desk Scrutiny)**: Inspect Sanction Order, Admin Approval, Technical Sanction, Estimate, Work Order, Expenditure, Measurement Book, Completion Certificate, and Before/During/After photos.
  - **Stage 2 (Field Verification)**: Mobile-first GPS capture, checklist, physical measurements, Hindi voice dictation, and `localStorage` offline draft sync.
  - **Stage 3 (Technical Review & Decision)**: **3-Column Project Evidence Room** comparing *Sanctioned Estimate* vs *MB Official Records* vs *Actual Field Measurements* with numerical variance highlights and mandatory validation caveats.
- **Duplicate & Related Complaint Grouping**: Links nearby/duplicate reports (e.g., multiple reports for the same broken handpump) while preserving each citizen's original complaint and reference number.
- **Immutable Audit Trail & Public-Safe Tracking**: Full case history with actor, timestamp, action, and status transitions; public tracking hides citizen PII and internal officer notes.

---

## 5. Technical Stack & Database Design

- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet + MarkerCluster.
- **Backend**: Next.js API Route Handlers, Zod validation, `bcryptjs` + `jose` JWT HTTP-only session cookies with server-side RBAC.
- **Database**: PostgreSQL + Prisma ORM (`prisma/schema.prisma`) with separate entities for `Complaint`, `Project`, `ProjectDocument`, `ProjectEstimate`, `ProjectMeasurement`, `InspectionAssignment`, `InspectionReport`, `InspectionMeasurement`, `Decision`, `ResolutionRecord`, `AuditEvent`, `Notification`, `RoutingRule`, and `ComplaintRelationship`.

---

## 6. Local Setup, Migrations & Seeding

1. **Install dependencies**:
   ```bash
   npm install
   ```
2. **Configure environment variables**:
   Copy `.env.example` to `.env` and set `DATABASE_URL`, `AUTH_SECRET`, and optionally `AI_PROVIDER` (`demo`, `gemini`, or `openai`).
3. **Push Prisma schema & seed demo data**:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

---

## 7. Demo Credentials (Password: `Demo@123`)

| Role | Email | Primary Workspace |
| :--- | :--- | :--- |
| **Reviewing Officer** | `reviewer@janseva.demo` | `/officer` |
| **Approving Officer** | `approver@janseva.demo` | `/officer` |
| **Field Officer (JE)** | `field@janseva.demo` | `/field` |
| **Field Officer 2 (Bundu)** | `field2@janseva.demo` | `/field` |
| **Administrator** | `admin@janseva.demo` | `/admin` |
| **Citizen** | `citizen@janseva.demo` | `/` & `/track` |

### Seeded Demonstration Scenarios
- **Scenario A (`JSV-2026-0001`)**: Damaged village road linked to `PRJ-RWD-101` — complete end-to-end resolved case.
- **Scenario B (`JSV-2026-0002`)**: Pond construction (`PRJ-MGN-202`) in Technical Review with 3-column measurement discrepancy (Sanctioned `2.0m`, MB `1.8m`, Field `1.5m`).
- **Scenario C (`JSV-2026-0003`)**: Blocked village drainage with no linked sanctioned project.
- **Scenario D (`JSV-2026-0004`, `0005`, `0006`)**: Broken handpump cluster with 3 linked citizen reports.
- **Scenario E (`JSV-2026-0007`)**: Incomplete Panchayat Bhawan (`PRJ-PRI-301`) with 96% expenditure and missing Completion Certificate.

---

## 8. Security, Privacy & Limitations

- Role permissions and workflow status transitions are enforced server-side (`src/lib/auth.ts`, `src/lib/workflow.ts`).
- Public tracking (`/api/track/[ref]`) and public map (`/map`) redact citizen phone numbers, emails, and internal officer notes.
- **Limitations**: Demo mode uses deterministic rules for AI/OCR/voice summaries when no external LLM key is provided; uploaded files are stored locally under `public/uploads/` for development convenience.
