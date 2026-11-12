# JanSeva (जनसेवा)

**Citizen Reporting, Ground-Level Verification and Evidence-Based Government Action Platform — Jharkhand Demonstration**

- **Live Deployment:** https://janseva-pi.vercel.app/
- **Source Repository:** https://github.com/BhaskarKr777/JanSeva

> **Disclaimer:** This is a demonstration prototype containing **simulated** Gram Panchayats, development projects, and complaint records. It does **not** claim official government integration, official data connectivity, or government endorsement.

---

## 1. Problem Statement & Why JanSeva Is Needed

In rural and semi-urban regions of Jharkhand, citizens frequently report local infrastructure failures—newly laid roads breaking within months, incomplete community ponds, non-functional handpumps, waterlogging, or unfinished Panchayat buildings.

Conventional grievance portals treat these reports as isolated text tickets, disconnected from:
1. Whether a **sanctioned government development project** already exists at that GPS coordinate.
2. The project's **sanctioned estimate, work order, expenditure, Measurement Book (MB), and completion photographs**.
3. **Ground-level physical verification** by a field engineer with GPS coordinates, site measurements, and Hindi observations.

**JanSeva** unifies citizen reporting, project dossier scrutiny, field verification, and accountable decision-making into a single transparent workflow:

```text
Citizen Report (Map + Photos + Hindi/English)
   → AI/ML Intake & Configurable Department Routing
   → Stage 1: Desk Scrutiny (Project Dossier & MB Variance)
   → Stage 2: Field Verification (Mobile GPS, Measurements, Hindi Dictation, Offline Drafts)
   → Stage 3: Project Evidence Room (3-Column Comparison & Image Forensics)
   → Authorised Officer Decision (Mandatory Reason)
   → Immutable Audit Trail & Public-Safe Citizen Tracking
```

---

## 2. Target Users & Role-Based Access Control

All permissions are enforced server-side (`src/lib/auth.ts`):

| Role | Code | Capabilities |
| :--- | :--- | :--- |
| **Citizen** | `CITIZEN` | Submit map-pinned complaints in Hindi or English without complex registration, upload photos/voice notes, receive a `JSV-2026-XXXX` reference number, and track public-safe updates. |
| **Field Officer** | `FIELD_OFFICER` | Mobile-first inspection workspace (`/field`) to view assigned cases, capture GPS coordinates & timestamps, upload site photos, record physical measurements, dictate Hindi observations, save offline drafts, and submit reports. |
| **Reviewing Officer** | `REVIEWING_OFFICER` | Inspect complaints and project dossiers, review AI/forensic discrepancy flags, link duplicate complaints, schedule field inspections, return cases for missing evidence, and recommend action. |
| **Approving Officer** | `APPROVING_OFFICER` | Review complete 3-column evidence, approve action or completion, request reinspection, refer cases for inquiry, reject unsupported complaints with a mandatory reason, and record final public-safe resolutions. |
| **Administrator** | `ADMIN` | Manage users, departments, districts, blocks, Gram Panchayats, routing rules (`/admin`), and view system-wide analytics. |

---

## 3. Jharkhand Context & Complementary Role

JanSeva is modeled around Jharkhand's district–block–Gram Panchayat structure (Ranchi district demonstration blocks: *Ormanjhi*, *Bundu*, and *Kanke* across 5 clearly labelled Demo Gram Panchayats).

Existing national/state portals (such as CPGRAMS, e-Samadhan, or scheme-specific MIS dashboards like eGramSwaraj/MGNREGA) focus either on high-level grievance forwarding or internal accounting. **JanSeva complements them** by acting as a **geo-linked ground verification and 3-column evidence comparison layer** between citizen complaints and sanctioned infrastructure works.

---

## 4. Application Workflow & Key Features

### Citizen Portal (`/`, `/track`, `/map`)
- **Bilingual Hindi-First UI:** Instant Hindi (`Noto Sans Devanagari`) / English toggle across the entire platform.
- **Interactive Leaflet + OpenStreetMap:** Draggable reporting marker, browser geolocation with graceful permission-denial fallback, marker clustering (`leaflet.markercluster`), category/status/priority filters, and project overlays.
- **9 Issue Categories:** Damaged road, incomplete construction, poor construction quality, drainage & waterlogging, broken culvert/bridge, drinking water, streetlight, public building damage, and other public infrastructure.
- **Public-Safe Tracking (`/track`):** Citizens enter their `JSV-2026-XXXX` reference number to view a 6-step timeline (`Complaint received → Under review → Field inspection scheduled → Inspection completed → Action initiated → Resolved`) and public-safe resolution summaries.

### Officer Dashboard & 3-Stage Verification (`/officer`, `/officer/cases/[id]`, `/field`)
- **8 KPI Metrics & Priority Queue:** Total, pending, high-priority, inspections awaiting submission, cases awaiting technical review, returned for evidence, resolved, and overdue cases with search, filters, and sorting.
- **Stage 1 — Desk Scrutiny (`दस्तावेज़ जाँच`):** Structured viewer and uploader for Project Sanction, Administrative Approval, Technical Sanction, Sanctioned Estimate, Work Order, Expenditure Records, Measurement Book (MB), Completion Certificate, and Before/During/After photos.
- **Stage 2 — Field Verification (`स्थल निरीक्षण`):** Mobile-friendly field app with GPS capture, project checklist, physical measurements, camera/file upload, Hindi Web Speech voice dictation, and `localStorage` offline draft persistence (`janseva_field_draft_<id>`).
- **Stage 3 — Project Evidence Room (3-Column Comparison):** Side-by-side comparison of:
  1. **Sanctioned Project Information** (`ProjectEstimate`)
  2. **Official Records & Submitted Evidence** (`ProjectMeasurement` / MB + Before/During/After photos)
  3. **Actual Field Inspection Findings** (`InspectionMeasurement` + GPS + site photos)
  Automatically highlights numerical variances (e.g., Sanctioned `2.0m` vs MB `1.8m` vs Field `1.5m`) and displays the mandatory technical notice that photographs alone cannot prove dimensions, material quality, or structural safety.
- **Duplicate & Related Complaint Clustering:** Links nearby complaints into one investigation while preserving every citizen's original complaint and reference number.
- **Immutable Audit Trail:** Every submission, assignment, document upload, inspection, return, decision, and resolution is logged in `AuditEvent` with user, timestamp, previous status, new status, and reason.

---

## 5. AI, Local ML & Image Forensics

JanSeva uses a clean provider abstraction (`src/lib/ai/provider.ts`) so **AI remains strictly advisory**—no autonomous approvals, rejections, or accusations of wrongdoing.

1. **LLM Provider Abstraction (`gemini` | `openai` | `local-ml`):**
   - When `GEMINI_API_KEY` (`gemini-2.0-flash`) or `OPENAI_API_KEY` (`gpt-4o-mini`) is configured, intake analysis uses live LLM JSON mode for Hindi-to-English summaries, priority reasoning, and department suggestions.
   - When no external API key is set, JanSeva runs a **real local ML engine** (`src/lib/ai/ml-intake.ts`):
     - **Bilingual Log-Odds Softmax Classifier** (`classifyDepartmentML`) trained on Hindi + English infrastructure terms.
     - **TF-IDF Cosine Similarity** (`computeTfIdfSimilarity`) to score text similarity against nearby complaints in PostgreSQL.
2. **Real Image Authenticity & Forensics (`src/lib/ai/image-forensics.ts` + `POST /api/analyze-image`):**
   - **EXIF / XMP / IPTC Parsing (`exifr`):** Checks camera make/model, capture timestamp, embedded GPS, and flags editing/AI-generation software tags (`Photoshop`, `GIMP`, `Canva`, `Midjourney`, `DALL-E`, `Stable Diffusion`, `C2PA`).
   - **Error Level Analysis (`sharp`):** Re-compresses uploaded photos at JPEG Q=90 and measures 16×16 block RGB pixel residuals (`elaMeanDiff`, `elaStdDev`, `elaMaxBlockDiff`, `elaAnomalyRatio`) to detect localized splicing or manipulation.
   - **SHA-256 Duplicate Photo Detection:** Detects recycled/reused evidence photos across uploads.
   - **Hybrid Gemini Vision:** When `GEMINI_API_KEY` is configured, combines local pixel/EXIF forensics with Gemini 2.0 Flash Vision analysis and surfaces confidence badges (`LIKELY_AUTHENTIC`, `POTENTIALLY_MANIPULATED`, `INSUFFICIENT_DATA`) in the Case Workspace.

---

## 6. Technical Architecture & Database Design

- **Frontend:** Next.js 16 (App Router, Turbopack), React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Leaflet + MarkerCluster.
- **Backend:** Next.js API Route Handlers (`src/app/api/**`), Zod validation, `bcryptjs` password hashing, `jose` HTTP-only JWT session cookies.
- **Database:** PostgreSQL + Prisma ORM (`prisma/schema.prisma`) with 20+ relational models:
  - *Jurisdiction & Org:* `District`, `Block`, `GramPanchayat`, `Village`, `Department`, `User`, `RoutingRule`
  - *Development Projects:* `Project`, `ProjectDocument`, `ProjectEstimate`, `ProjectMeasurement`
  - *Complaints & Workflow:* `Complaint`, `ComplaintAttachment`, `ComplaintRelationship`, `DepartmentAssignment`, `InspectionAssignment`, `InspectionReport`, `InspectionMeasurement`, `EvidenceFile`, `Decision`, `ResolutionRecord`, `Notification`, `AuditEvent`

---

## 7. Security & Privacy Decisions

- **Server-Side RBAC:** Route handlers enforce role checks (`requireRole()`, `getSessionUser()`); e.g., Reviewing Officers cannot execute final `RECORD_RESOLUTION` actions (`403`).
- **PII Redaction:** Public tracking (`/api/track/[ref]`) and unauthenticated map queries (`/api/complaints`) strip `citizenPhone`, `citizenEmail`, internal officer notes, and confidential documents.
- **Immutable Audit History:** No update/delete endpoints exist for `AuditEvent` records.
- **No Committed Secrets:** `.env*` is excluded by `.gitignore` (with `.env.example` tracked as a template).

---

## 8. Local Setup, Environment Variables & Seeding

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or a free cloud Neon PostgreSQL database)

### Setup Steps
1. **Clone & install dependencies:**
   ```bash
   git clone https://github.com/BhaskarKr777/JanSeva.git
   cd JanSeva
   npm install
   ```
2. **Configure environment variables:**
   Copy `.env.example` to `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/janseva?schema=public"
   AUTH_SECRET="replace-with-a-secure-random-32-char-secret"
   AI_PROVIDER="demo"          # "demo" (local ML + forensics) | "gemini" | "openai"
   GEMINI_API_KEY=""           # Optional: enables live Gemini 2.0 Flash LLM & Vision
   OPENAI_API_KEY=""           # Optional: enables OpenAI gpt-4o-mini
   NEXT_PUBLIC_APP_NAME="JanSeva"
   ```
3. **Push Prisma schema & seed demonstration data:**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. **Run the application:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

---

## 9. Demo Credentials (Password: `Demo@123`)

| Role | Email | Primary Workspace |
| :--- | :--- | :--- |
| **Reviewing Officer** | `reviewer@janseva.demo` | `/officer` |
| **Approving Officer** | `approver@janseva.demo` | `/officer` |
| **Field Officer (JE)** | `field@janseva.demo` | `/field` |
| **Field Officer 2 (Bundu)** | `field2@janseva.demo` | `/field` |
| **Administrator** | `admin@janseva.demo` | `/admin` |
| **Citizen** | `citizen@janseva.demo` | `/` & `/track` |

### Seeded Demonstration Scenarios
- **Scenario A (`JSV-2026-0001`):** Damaged village road linked to `PRJ-RWD-101` — complete end-to-end resolved case.
- **Scenario B (`JSV-2026-0002`):** Pond construction (`PRJ-MGN-202`) in Technical Review with 3-column measurement discrepancy (Sanctioned `2.0m`, MB `1.8m`, Field `1.5m`).
- **Scenario C (`JSV-2026-0003`):** Blocked village drainage with no linked sanctioned project.
- **Scenario D (`JSV-2026-0004`, `0005`, `0006`):** Broken handpump cluster with 3 linked citizen reports.
- **Scenario E (`JSV-2026-0007`):** Incomplete Panchayat Bhawan (`PRJ-PRI-301`) with 96% expenditure and missing Completion Certificate.

---

## 10. Deployment (Vercel + Neon PostgreSQL)

1. Create a free PostgreSQL database on [Neon](https://neon.tech) and copy its connection string.
2. Run `npx prisma db push` and `npx prisma db seed` against the Neon `DATABASE_URL`.
3. Import `BhaskarKr777/JanSeva` into [Vercel](https://vercel.com), configure `DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`, and optional `GEMINI_API_KEY`, and deploy. (`package.json` includes `"postinstall": "prisma generate"` for automatic Vercel builds.)

---

## 11. Limitations & Future Scope

### Current Limitations
- **File Storage:** Uploaded attachments currently write to `public/uploads/` on local disk; on serverless platforms like Vercel, uploads are ephemeral across deployments unless connected to object storage.
- **Voice & OCR:** Field voice dictation uses browser Web Speech API (`hi-IN`); full scanned-PDF OCR requires `GEMINI_API_KEY` or an external OCR service.
- **Simulated Data:** All Gram Panchayats, projects, estimates, and complaints are fictional demonstration records.

### Future Scope
- Persistent cloud object storage (Cloudflare R2 / Supabase Storage / S3) for citizen & field photos.
- Background IndexedDB sync queue with Service Worker for full offline-first PWA field inspections.
- Optional SMS/WhatsApp citizen status notifications and automated scanned PDF Measurement Book OCR extraction.
