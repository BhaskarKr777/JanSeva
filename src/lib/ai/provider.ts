import { Priority } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { runLocalImageForensics, type ForensicSignals } from './image-forensics';
import { classifyDepartmentML, computeTfIdfSimilarity } from './ml-intake';

export type AIProviderMode = 'demo' | 'local-ml' | 'local-forensics' | 'gemini' | 'openai';

export interface IntakeAnalysisInput {
  description: string;
  category: string;
  lat: number;
  lng: number;
  locationDescription?: string;
  nearbyProjects: Array<{
    id: string;
    projectCode: string;
    title: string;
    titleHi: string;
    category: string;
    departmentId: string;
    departmentName: string;
    distanceMeters: number;
  }>;
  nearbyComplaints: Array<{
    id: string;
    referenceNumber: string;
    category: string;
    description: string;
    distanceMeters: number;
    createdAt: string;
  }>;
}

export interface IntakeAnalysisOutput {
  providerUsed: AIProviderMode;
  detectedLanguage: 'hi' | 'en' | 'mixed';
  suggestedCategory: string;
  structuredEnglishSummary: string;
  extractedDetails: {
    issueType: string;
    locationClues: string;
    severitySignals: string[];
    timeSignals: string | null;
  };
  suggestedPriority: Priority;
  priorityExplanation: string;
  suggestedDepartmentCode: string;
  suggestedDepartmentReason: string;
  possibleLinkedProjectId: string | null;
  possibleLinkedProjectReason: string | null;
  potentialDuplicateIds: string[];
  duplicateExplanation: string | null;
  recommendedNextAction: string;
  confidence: number;
  disclaimer: string;
}

export interface DocumentAnalysisInput {
  projectTitle: string;
  sanctionedAmount: number;
  expenditureAmount: number;
  documents: Array<{ docType: string; title: string }>;
  estimates: Array<{ itemName: string; unit: string; sanctionedQty: number; sanctionedAmount: number }>;
  measurements: Array<{ itemName: string; unit: string; recordedQty: number; mbReference: string }>;
}

export interface DocumentAnalysisOutput {
  providerUsed: AIProviderMode;
  neutralSummary: string;
  missingDocuments: string[];
  inconsistentFigures: Array<{
    itemName: string;
    sanctionedQty: number;
    recordedQty: number;
    unit: string;
    difference: number;
    note: string;
  }>;
  expenditureUtilizationPct: number;
  riskFlags: string[];
}

export interface FieldInspectionAnalysisInput {
  observations: string;
  voiceNoteTranscript?: string;
  checklist: Array<{ item: string; checked: boolean }>;
  measurements: Array<{ itemName: string; unit: string; measuredQty: number; sanctionedQty?: number; recordedQty?: number }>;
  photoCount: number;
  priorPhotoCount: number;
}

export interface FieldInspectionAnalysisOutput {
  providerUsed: AIProviderMode;
  structuredSummaryEn: string;
  structuredSummaryHi: string;
  missingChecklistItems: string[];
  measurementDiscrepancies: string[];
  photoComparisonNote: string;
  evidenceCaveat: string;
}

function getProviderMode(): AIProviderMode {
  const mode = (process.env.AI_PROVIDER || 'demo').toLowerCase();
  if (mode === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';
  if (mode === 'openai' && process.env.OPENAI_API_KEY) return 'openai';
  return 'demo';
}

async function callLLMJson<T>(prompt: string): Promise<T | null> {
  const mode = getProviderMode();
  try {
    if (mode === 'gemini' && process.env.GEMINI_API_KEY) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      return JSON.parse(text) as T;
    }

    if (mode === 'openai' && process.env.OPENAI_API_KEY) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: 'Return strict JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content;
      if (!text) return null;
      return JSON.parse(text) as T;
    }
  } catch {
    return null;
  }
  return null;
}

function detectDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}

export async function analyzeComplaintIntake(
  input: IntakeAnalysisInput
): Promise<IntakeAnalysisOutput> {
  const mode = getProviderMode();

  if (mode !== 'demo') {
    const prompt = `Analyze this Jharkhand citizen infrastructure complaint and return JSON matching keys: detectedLanguage ("hi"|"en"|"mixed"), suggestedCategory, structuredEnglishSummary, extractedDetails ({issueType, locationClues, severitySignals, timeSignals}), suggestedPriority ("LOW"|"MEDIUM"|"HIGH"|"URGENT"), priorityExplanation, suggestedDepartmentCode ("RWD"|"MGNREGA"|"PRI"|"DWSD"|"ULB"), suggestedDepartmentReason, possibleLinkedProjectId, possibleLinkedProjectReason, potentialDuplicateIds, duplicateExplanation, recommendedNextAction, confidence (0-1).
Input: ${JSON.stringify(input)}`;
    const llmResult = await callLLMJson<Omit<IntakeAnalysisOutput, 'providerUsed' | 'disclaimer'>>(prompt);
    if (llmResult) {
      return {
        ...llmResult,
        providerUsed: mode,
        disclaimer: 'AI-assisted recommendation only. Authorised human officer must verify and assign.',
      };
    }
  }

  // Real Local ML Fallback (Bilingual Log-Odds Classifier + TF-IDF Cosine Similarity)
  const text = input.description.toLowerCase();
  const isHindi = detectDevanagari(input.description);

  const severitySignals: string[] = [];
  if (/टूट|क्षति|गड्ढ|broken|damaged|collapsed|crack/.test(text)) severitySignals.push('Structural damage reported');
  if (/पानी भर|जलभराव|waterlog|flood|overflow/.test(text)) severitySignals.push('Waterlogging / drainage impact');
  if (/बंद|खराब|सूख|not working|no water|dry/.test(text)) severitySignals.push('Service disruption');
  if (/दो महीने|महीने|month|week|सप्ताह|तुरंत|खतर/.test(text)) severitySignals.push('Premature failure / urgent safety concern');

  let suggestedPriority: Priority = 'MEDIUM';
  let priorityExplanation = 'Standard infrastructure issue pending officer verification.';
  if (
    severitySignals.length >= 2 ||
    /पुल|culvert|bridge|स्कूल|school|हैंडपंप|handpump|पेयजल|drinking|अति|urgent/.test(text) ||
    input.category === 'BROKEN_CULVERT_BRIDGE' ||
    input.category === 'DRINKING_WATER'
  ) {
    suggestedPriority = 'HIGH';
    priorityExplanation =
      'Recommended HIGH (pending human assessment) due to premature failure/waterlogging or essential public utility disruption.';
  }
  if (/गिर|collapse|accident|दुर्घटना|खतरनाक/.test(text)) {
    suggestedPriority = 'URGENT';
    priorityExplanation = 'Recommended URGENT due to potential public safety hazard.';
  }

  const mlDept = classifyDepartmentML(input.description, input.category);
  const deptCode = mlDept.deptCode;
  const deptReason = `Local ML classifier assigned ${deptCode} (confidence ${(mlDept.confidence * 100).toFixed(1)}%, softmax distribution: ${Object.entries(mlDept.scores)
    .map(([k, v]) => `${k}:${Math.round(v * 100)}%`)
    .join(', ')}).`;

  const matchedProject = input.nearbyProjects.find((p) => p.distanceMeters <= 1200) || null;
  const corpus = input.nearbyComplaints.map((c) => c.description);
  const duplicateScores = input.nearbyComplaints
    .map((c) => ({
      c,
      sim: computeTfIdfSimilarity(input.description, c.description, corpus),
    }))
    .filter(
      ({ c, sim }) =>
        (c.distanceMeters <= 600 && (c.category === input.category || sim >= 0.25)) ||
        c.distanceMeters <= 200
    );
  const duplicates = duplicateScores.map((d) => d.c.id);

  const summaryEn = isHindi
    ? `Citizen report in Hindi (${input.category.replace(/_/g, ' ').toLowerCase()}): "${input.description.slice(0, 140)}". ${
        severitySignals.length ? `Key signals: ${severitySignals.join(', ')}.` : ''
      }`
    : `Citizen report (${input.category.replace(/_/g, ' ').toLowerCase()}): ${input.description.slice(0, 160)}`;

  return {
    providerUsed: 'local-ml',
    detectedLanguage: isHindi ? 'hi' : 'en',
    suggestedCategory: input.category,
    structuredEnglishSummary: summaryEn,
    extractedDetails: {
      issueType: input.category,
      locationClues: input.locationDescription || `Coordinates (${input.lat.toFixed(4)}, ${input.lng.toFixed(4)})`,
      severitySignals: severitySignals.length ? severitySignals : ['Reported citizen grievance'],
      timeSignals: /दो महीने|month|week|दिन/.test(text) ? 'Recent / premature defect timeline mentioned' : null,
    },
    suggestedPriority,
    priorityExplanation,
    suggestedDepartmentCode: deptCode,
    suggestedDepartmentReason: deptReason,
    possibleLinkedProjectId: matchedProject ? matchedProject.id : null,
    possibleLinkedProjectReason: matchedProject
      ? `Located ${Math.round(matchedProject.distanceMeters)}m from sanctioned project "${matchedProject.title}" (${matchedProject.projectCode}).`
      : null,
    potentialDuplicateIds: duplicates,
    duplicateExplanation:
      duplicates.length > 0
        ? `Found ${duplicates.length} nearby complaint(s) within 600m (TF-IDF cosine similarity up to ${Math.max(...duplicateScores.map((d) => d.sim)).toFixed(2)}).`
        : null,
    recommendedNextAction: matchedProject
      ? 'Desk scrutiny of linked project records (estimate, MB, photos) followed by field inspection.'
      : 'Review jurisdiction and schedule field verification if required.',
    confidence: matchedProject ? Math.max(0.82, mlDept.confidence) : mlDept.confidence,
    disclaimer:
      'Local ML recommendation (TF-IDF + bilingual classifier). Final department assignment, priority, and administrative decisions rest with the authorised officer.',
  };
}

export async function analyzeProjectDocuments(
  input: DocumentAnalysisInput
): Promise<DocumentAnalysisOutput> {
  const mode = getProviderMode();
  const requiredDocs = [
    'PROJECT_SANCTION',
    'ADMINISTRATIVE_APPROVAL',
    'TECHNICAL_SANCTION',
    'SANCTIONED_ESTIMATE',
    'WORK_ORDER',
    'EXPENDITURE_RECORD',
    'MEASUREMENT_BOOK',
    'COMPLETION_CERTIFICATE',
  ];

  const presentTypes = new Set(input.documents.map((d) => d.docType));
  const missingDocuments = requiredDocs.filter((d) => !presentTypes.has(d));

  const inconsistentFigures: DocumentAnalysisOutput['inconsistentFigures'] = [];
  for (const est of input.estimates) {
    const mb = input.measurements.find(
      (m) => m.itemName.toLowerCase() === est.itemName.toLowerCase()
    );
    if (mb && Math.abs(mb.recordedQty - est.sanctionedQty) > 0.01) {
      const diff = Number((mb.recordedQty - est.sanctionedQty).toFixed(2));
      inconsistentFigures.push({
        itemName: est.itemName,
        sanctionedQty: est.sanctionedQty,
        recordedQty: mb.recordedQty,
        unit: est.unit,
        difference: diff,
        note:
          diff < 0
            ? `Recorded MB quantity is ${Math.abs(diff)} ${est.unit} less than sanctioned estimate.`
            : `Recorded MB quantity exceeds sanctioned estimate by ${diff} ${est.unit}.`,
      });
    }
  }

  const pct =
    input.sanctionedAmount > 0
      ? Math.round((input.expenditureAmount / input.sanctionedAmount) * 100)
      : 0;

  const riskFlags: string[] = [];
  if (missingDocuments.length > 0) {
    riskFlags.push(`${missingDocuments.length} core project document(s) missing from dossier.`);
  }
  if (inconsistentFigures.length > 0) {
    riskFlags.push(`${inconsistentFigures.length} quantity variance(s) detected between Sanctioned Estimate and Measurement Book.`);
  }
  if (pct >= 95 && missingDocuments.includes('COMPLETION_CERTIFICATE')) {
    riskFlags.push('High expenditure utilization (>=95%) without a Completion Certificate on file.');
  }

  return {
    providerUsed: mode === 'demo' ? 'demo' : mode,
    neutralSummary: `Project "${input.projectTitle}" has sanctioned outlay of ₹${input.sanctionedAmount.toLocaleString('en-IN')} with recorded expenditure of ₹${input.expenditureAmount.toLocaleString('en-IN')} (${pct}%). ${inconsistentFigures.length} measurement variance(s) and ${missingDocuments.length} missing document(s) were flagged for technical officer review.`,
    missingDocuments,
    inconsistentFigures,
    expenditureUtilizationPct: pct,
    riskFlags,
  };
}

export async function analyzeFieldInspection(
  input: FieldInspectionAnalysisInput
): Promise<FieldInspectionAnalysisOutput> {
  const mode = getProviderMode();
  const missingChecklistItems = input.checklist
    .filter((c) => !c.checked)
    .map((c) => c.item);

  const measurementDiscrepancies: string[] = [];
  for (const m of input.measurements) {
    if (typeof m.sanctionedQty === 'number' && Math.abs(m.measuredQty - m.sanctionedQty) > 0.05) {
      const diff = Number((m.measuredQty - m.sanctionedQty).toFixed(2));
      measurementDiscrepancies.push(
        `${m.itemName}: Field measured ${m.measuredQty} ${m.unit} vs Sanctioned ${m.sanctionedQty} ${m.unit} (diff: ${diff > 0 ? '+' : ''}${diff} ${m.unit}).`
      );
    }
    if (typeof m.recordedQty === 'number' && Math.abs(m.measuredQty - m.recordedQty) > 0.05) {
      const diff = Number((m.measuredQty - m.recordedQty).toFixed(2));
      measurementDiscrepancies.push(
        `${m.itemName}: Field measured ${m.measuredQty} ${m.unit} vs MB Recorded ${m.recordedQty} ${m.unit} (diff: ${diff > 0 ? '+' : ''}${diff} ${m.unit}).`
      );
    }
  }

  const combinedText = [input.observations, input.voiceNoteTranscript].filter(Boolean).join(' | ');
  const structuredSummaryEn = `Field inspection recorded ${input.measurements.length} physical measurement(s) and ${input.photoCount} site photograph(s). Officer notes: "${combinedText.slice(0, 220)}". ${
    measurementDiscrepancies.length
      ? `${measurementDiscrepancies.length} numerical variance(s) require technical officer validation.`
      : 'No numerical variance flagged against available reference figures.'
  }`;

  const structuredSummaryHi = `स्थल निरीक्षण में ${input.measurements.length} भौतिक माप और ${input.photoCount} फोटो दर्ज किए गए। ${
    missingChecklistItems.length > 0
      ? `चेकलिस्ट के ${missingChecklistItems.length} बिंदु शेष हैं।`
      : 'चेकलिस्ट के सभी बिंदु पूर्ण हैं।'
  }`;

  const photoComparisonNote =
    input.priorPhotoCount > 0 && input.photoCount > 0
      ? `${input.photoCount} current inspection photo(s) available alongside ${input.priorPhotoCount} earlier project photo(s) for visual side-by-side comparison.`
      : input.photoCount === 0
      ? 'No site inspection photographs uploaded yet.'
      : 'Site inspection photographs uploaded; no prior completion photographs on file for visual comparison.';

  return {
    providerUsed: mode === 'demo' ? 'demo' : mode,
    structuredSummaryEn,
    structuredSummaryHi,
    missingChecklistItems,
    measurementDiscrepancies,
    photoComparisonNote,
    evidenceCaveat:
      'Important: Photographs alone cannot prove physical dimensions, material quality, or structural safety. Authorised technical officers must validate physical measurements and test records.',
  };
}

// ─── Image Authenticity Analysis ───────────────────────────────────────────

export interface ImageAuthenticityResult {
  providerUsed: AIProviderMode;
  isLikelyAuthentic: boolean;
  confidenceScore: number; // 0–1
  verdict: 'LIKELY_AUTHENTIC' | 'POTENTIALLY_MANIPULATED' | 'INSUFFICIENT_DATA';
  flags: string[];
  recommendation: string;
  disclaimer: string;
  forensics?: ForensicSignals;
}

/**
 * Call Gemini Vision API with an image (base64) and a text prompt.
 * Returns parsed JSON of type T, or null on failure.
 */
async function callGeminiVision<T>(imageBase64: string, mimeType: string, prompt: string): Promise<T | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inlineData: {
                    mimeType,
                    data: imageBase64,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    if (!res.ok) {
      console.error('[GeminiVision] HTTP error:', res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (e) {
    console.error('[GeminiVision] Error:', e);
    return null;
  }
}

/**
 * Analyze whether an uploaded image appears to be authentic (genuine field/site photo)
 * or potentially manipulated/fake, using Gemini Vision API.
 *
 * @param fileUrl  Relative URL path like "/uploads/complaints/xyz.jpg" or absolute disk path
 * @param context  What kind of image this is
 */
export async function analyzeImageAuthenticity(
  fileUrl: string,
  context: 'citizen_complaint' | 'field_inspection' | 'project_document' = 'field_inspection'
): Promise<ImageAuthenticityResult> {
  const mode = getProviderMode();
  const disclaimer =
    'AI & forensic image analysis is an advisory tool. Photographs alone cannot prove physical dimensions, structural quality, or authenticity with certainty. Authorised officers must validate all evidence in person.';

  // Step 1: Always run real local image forensics (EXIF, Sharp Error Level Analysis, SHA-256 duplicate check)
  const forensics = await runLocalImageForensics(fileUrl);
  const localFlags = [...forensics.suspiciousIndicators, ...forensics.authenticIndicators];

  // Step 2: If Gemini Vision API key is available, combine local forensics with Gemini 2.0 Flash Vision
  if (mode === 'gemini' || (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 10)) {
    try {
      const diskPath = fileUrl.startsWith('/')
        ? path.join(process.cwd(), 'public', fileUrl.replace(/^\/+/, ''))
        : path.resolve(fileUrl);

      if (fs.existsSync(diskPath)) {
        const fileBuffer = fs.readFileSync(diskPath);
        const imageBase64 = fileBuffer.toString('base64');
        const ext = path.extname(diskPath).toLowerCase();
        const mimeMap: Record<string, string> = {
          '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
          '.png': 'image/png', '.webp': 'image/webp',
          '.gif': 'image/gif', '.heic': 'image/heic',
        };
        const imageMime = mimeMap[ext] || 'image/jpeg';

        const contextDescription = {
          citizen_complaint: 'submitted by a citizen reporting a local infrastructure problem in rural Jharkhand, India',
          field_inspection: 'submitted by a government field officer as site inspection evidence for a development project',
          project_document: 'submitted as a project completion/progress photograph for a sanctioned government infrastructure project',
        }[context];

        const prompt = `You are an AI assistant for a government digital platform that verifies images ${contextDescription}.

Local forensic signals already extracted from the file:
- Has EXIF: ${forensics.hasExif} (${[forensics.cameraMake, forensics.cameraModel].filter(Boolean).join(' ') || 'unknown camera'})
- Software tag: ${forensics.softwareTag || 'none'}
- ELA mean diff: ${forensics.elaMeanDiff ?? 'n/a'}, max block diff: ${forensics.elaMaxBlockDiff ?? 'n/a'}
- Binary duplicates found in uploads: ${forensics.duplicateFilesFound.length}

Analyze the visual content carefully and respond with ONLY valid JSON:
{
  "isLikelyAuthentic": boolean,
  "confidenceScore": number between 0.0 and 1.0,
  "verdict": "LIKELY_AUTHENTIC" or "POTENTIALLY_MANIPULATED" or "INSUFFICIENT_DATA",
  "flags": ["specific visual and forensic indicators"],
  "recommendation": "One clear sentence for the reviewing officer"
}`;

        type GeminiVisionResult = {
          isLikelyAuthentic: boolean;
          confidenceScore: number;
          verdict: 'LIKELY_AUTHENTIC' | 'POTENTIALLY_MANIPULATED' | 'INSUFFICIENT_DATA';
          flags: string[];
          recommendation: string;
        };

        const result = await callGeminiVision<GeminiVisionResult>(imageBase64, imageMime, prompt);

        if (result) {
          const combinedVerdict =
            forensics.verdict === 'POTENTIALLY_MANIPULATED'
              ? 'POTENTIALLY_MANIPULATED'
              : result.verdict || (result.isLikelyAuthentic ? 'LIKELY_AUTHENTIC' : 'POTENTIALLY_MANIPULATED');

          return {
            providerUsed: 'gemini',
            isLikelyAuthentic: combinedVerdict === 'LIKELY_AUTHENTIC',
            confidenceScore: Number(((result.confidenceScore + forensics.forensicScore) / 2).toFixed(2)),
            verdict: combinedVerdict,
            flags: [...(Array.isArray(result.flags) ? result.flags : []), ...localFlags],
            recommendation: result.recommendation || 'Human officer should verify the image against field visit records.',
            disclaimer,
            forensics,
          };
        }
      }
    } catch (e) {
      console.error('[ImageAuth] Gemini Vision failed, using local forensic engine:', e);
    }
  }

  // Step 3: Real Local Forensics Result (EXIF + Sharp ELA + SHA-256 duplicate check)
  const recommendation =
    forensics.verdict === 'POTENTIALLY_MANIPULATED'
      ? 'Forensic anomalies detected (editing signature, ELA outlier, or recycled duplicate). Request original unedited camera photo or conduct physical site verification.'
      : forensics.verdict === 'LIKELY_AUTHENTIC'
      ? 'EXIF camera metadata and Error Level Analysis appear consistent with an unedited photo. Still verify location on site.'
      : 'Image lacks camera EXIF metadata (common in WhatsApp/compressed or synthetic images). Ask citizen/officer for original photo or verify during site visit.';

  return {
    providerUsed: 'local-forensics',
    isLikelyAuthentic: forensics.verdict === 'LIKELY_AUTHENTIC',
    confidenceScore: forensics.forensicScore,
    verdict: forensics.verdict,
    flags: localFlags.length > 0 ? localFlags : ['No forensic metadata or pixel anomalies detected.'],
    recommendation,
    disclaimer,
    forensics,
  };
}

