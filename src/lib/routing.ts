import { ComplaintStatus, Priority } from '@prisma/client';
import { prisma } from './prisma';
import { haversineDistanceMeters } from './utils';
import { analyzeComplaintIntake, IntakeAnalysisOutput } from './ai/provider';

export interface RoutingResult {
  aiAnalysis: IntakeAnalysisOutput;
  suggestedDeptId: string | null;
  assignedDeptId: string | null;
  assignedOfficerId: string | null;
  reviewingOfficerId: string | null;
  approvingOfficerId: string | null;
  linkedProjectId: string | null;
  gramPanchayatId: string | null;
  villageId: string | null;
  initialStatus: ComplaintStatus;
  priority: Priority;
  inManualTriage: boolean;
  routingReason: string;
}

export async function runIntakeAndRouting(params: {
  category: string;
  description: string;
  lat: number;
  lng: number;
  locationDescription?: string;
  gramPanchayatId?: string;
}): Promise<RoutingResult> {
  const [gramPanchayats, villages, projects, recentComplaints, departments, rules, officers] =
    await Promise.all([
      prisma.gramPanchayat.findMany({ include: { block: true } }),
      prisma.village.findMany(),
      prisma.project.findMany({ include: { department: true } }),
      prisma.complaint.findMany({
        select: {
          id: true,
          referenceNumber: true,
          category: true,
          description: true,
          lat: true,
          lng: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      prisma.department.findMany(),
      prisma.routingRule.findMany({ where: { active: true }, include: { department: true } }),
      prisma.user.findMany({ where: { active: true } }),
    ]);

  // Nearest Gram Panchayat
  let gpId = params.gramPanchayatId || null;
  let blockId: string | null = null;
  if (!gpId && gramPanchayats.length > 0) {
    let best = gramPanchayats[0];
    let bestDist = haversineDistanceMeters(params.lat, params.lng, best.lat, best.lng);
    for (const gp of gramPanchayats) {
      const d = haversineDistanceMeters(params.lat, params.lng, gp.lat, gp.lng);
      if (d < bestDist) {
        best = gp;
        bestDist = d;
      }
    }
    gpId = best.id;
    blockId = best.blockId;
  } else if (gpId) {
    const matchedGp = gramPanchayats.find((g) => g.id === gpId);
    blockId = matchedGp?.blockId || null;
  }

  // Nearest Village
  let villageId: string | null = null;
  const gpVillages = gpId ? villages.filter((v) => v.gramPanchayatId === gpId) : villages;
  if (gpVillages.length > 0) {
    let bestV = gpVillages[0];
    let bestVDist = haversineDistanceMeters(params.lat, params.lng, bestV.lat, bestV.lng);
    for (const v of gpVillages) {
      const d = haversineDistanceMeters(params.lat, params.lng, v.lat, v.lng);
      if (d < bestVDist) {
        bestV = v;
        bestVDist = d;
      }
    }
    villageId = bestV.id;
  }

  const nearbyProjects = projects
    .map((p) => ({
      id: p.id,
      projectCode: p.projectCode,
      title: p.title,
      titleHi: p.titleHi,
      category: p.category,
      departmentId: p.departmentId,
      departmentName: p.department.name,
      distanceMeters: haversineDistanceMeters(params.lat, params.lng, p.lat, p.lng),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5);

  const nearbyComplaints = recentComplaints
    .map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      category: c.category,
      description: c.description,
      distanceMeters: haversineDistanceMeters(params.lat, params.lng, c.lat, c.lng),
      createdAt: c.createdAt.toISOString(),
    }))
    .filter((c) => c.distanceMeters <= 2500)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 8);

  const aiAnalysis = await analyzeComplaintIntake({
    description: params.description,
    category: params.category,
    lat: params.lat,
    lng: params.lng,
    locationDescription: params.locationDescription,
    nearbyProjects,
    nearbyComplaints,
  });

  // Configurable routing rule lookup (block-specific first, then global category rule)
  const blockRule = rules.find(
    (r) => r.categoryKey === params.category && r.blockId && r.blockId === blockId
  );
  const globalRule = rules.find((r) => r.categoryKey === params.category && !r.blockId);
  const matchedRule = blockRule || globalRule || null;

  const aiDept = departments.find((d) => d.code === aiAnalysis.suggestedDepartmentCode) || null;
  const suggestedDeptId = matchedRule?.departmentId || aiDept?.id || null;

  const isUncertain =
    params.category === 'OTHER_INFRASTRUCTURE' && !matchedRule;

  const assignedDeptId = isUncertain ? null : suggestedDeptId;
  const initialStatus: ComplaintStatus = isUncertain
    ? 'MANUAL_TRIAGE'
    : 'UNDER_DESK_SCRUTINY';

  // Pick default reviewing & approving officers for that department or fallback
  const reviewingOfficer =
    officers.find((u) => u.role === 'REVIEWING_OFFICER' && u.departmentId === assignedDeptId) ||
    officers.find((u) => u.role === 'REVIEWING_OFFICER') ||
    null;

  const approvingOfficer =
    officers.find((u) => u.role === 'APPROVING_OFFICER') || null;

  const priority = aiAnalysis.suggestedPriority || matchedRule?.defaultPriority || 'MEDIUM';

  const routingReason = isUncertain
    ? 'Uncertain jurisdiction / general category — placed in Manual Triage queue for officer verification.'
    : matchedRule
    ? `Routed via configured rule "${matchedRule.name}" to ${matchedRule.department.name}. ${aiAnalysis.suggestedDepartmentReason}`
    : `Suggested department based on AI intake analysis: ${aiAnalysis.suggestedDepartmentReason}`;

  return {
    aiAnalysis,
    suggestedDeptId,
    assignedDeptId,
    assignedOfficerId: reviewingOfficer?.id || null,
    reviewingOfficerId: reviewingOfficer?.id || null,
    approvingOfficerId: approvingOfficer?.id || null,
    linkedProjectId: aiAnalysis.possibleLinkedProjectId,
    gramPanchayatId: gpId,
    villageId,
    initialStatus,
    priority,
    inManualTriage: isUncertain,
    routingReason,
  };
}

