export type Lang = 'hi' | 'en';

export const ISSUE_CATEGORIES = [
  { key: 'DAMAGED_ROAD', en: 'Damaged road', hi: 'टूटी / क्षतिग्रस्त सड़क' },
  { key: 'INCOMPLETE_CONSTRUCTION', en: 'Incomplete construction', hi: 'अधूरा निर्माण कार्य' },
  { key: 'POOR_QUALITY', en: 'Poor construction quality', hi: 'घटिया निर्माण गुणवत्ता' },
  { key: 'DRAINAGE_WATERLOGGING', en: 'Drainage and waterlogging', hi: 'नाली जाम और जलभराव' },
  { key: 'BROKEN_CULVERT_BRIDGE', en: 'Broken culvert or bridge', hi: 'टूटी पुलिया या पुल' },
  { key: 'DRINKING_WATER', en: 'Drinking-water problem', hi: 'पेयजल / हैंडपंप समस्या' },
  { key: 'STREETLIGHT', en: 'Streetlight problem', hi: 'स्ट्रीटलाइट खराब' },
  { key: 'PUBLIC_BUILDING_DAMAGE', en: 'Public building damage', hi: 'सार्वजनिक भवन क्षति' },
  { key: 'OTHER_INFRASTRUCTURE', en: 'Other public infrastructure issue', hi: 'अन्य बुनियादी ढाँचा समस्या' },
] as const;

export const STATUS_LABELS: Record<string, { en: string; hi: string; color: string }> = {
  SUBMITTED: { en: 'Submitted', hi: 'शिकायत दर्ज', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  MANUAL_TRIAGE: { en: 'Manual Triage', hi: 'मैन्युअल वर्गीकरण', color: 'bg-amber-50 text-amber-800 border-amber-300' },
  UNDER_DESK_SCRUTINY: { en: 'Desk Scrutiny', hi: 'दस्तावेज़ जाँच', color: 'bg-blue-50 text-blue-800 border-blue-300' },
  INSPECTION_SCHEDULED: { en: 'Inspection Scheduled', hi: 'स्थल निरीक्षण निर्धारित', color: 'bg-indigo-50 text-indigo-800 border-indigo-300' },
  INSPECTION_SUBMITTED: { en: 'Inspection Submitted', hi: 'निरीक्षण रिपोर्ट प्रस्तुत', color: 'bg-cyan-50 text-cyan-800 border-cyan-300' },
  RETURNED_FOR_EVIDENCE: { en: 'Returned for Evidence', hi: 'अतिरिक्त साक्ष्य हेतु वापस', color: 'bg-orange-50 text-orange-800 border-orange-300' },
  REINSPECTION_REQUESTED: { en: 'Reinspection Requested', hi: 'पुनः निरीक्षण आदेशित', color: 'bg-amber-100 text-amber-900 border-amber-400' },
  TECHNICAL_REVIEW: { en: 'Technical Review', hi: 'अधिकारी तकनीकी समीक्षा', color: 'bg-purple-50 text-purple-800 border-purple-300' },
  REFERRED_FOR_INQUIRY: { en: 'Referred for Inquiry', hi: 'विस्तृत जाँच हेतु संदर्भित', color: 'bg-rose-50 text-rose-800 border-rose-300' },
  ACTION_APPROVED: { en: 'Action Approved', hi: 'कार्रवाई स्वीकृत', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
  RESOLVED: { en: 'Resolved', hi: 'निस्तारित / पूर्ण', color: 'bg-emerald-100 text-emerald-900 border-emerald-400' },
  REJECTED: { en: 'Rejected', hi: 'अस्वीकृत', color: 'bg-red-50 text-red-800 border-red-300' },
};

export const PRIORITY_LABELS: Record<string, { en: string; hi: string; color: string }> = {
  LOW: { en: 'Low', hi: 'सामान्य', color: 'bg-slate-100 text-slate-700' },
  MEDIUM: { en: 'Medium', hi: 'मध्यम', color: 'bg-amber-50 text-amber-800' },
  HIGH: { en: 'High', hi: 'उच्च', color: 'bg-orange-100 text-orange-900' },
  URGENT: { en: 'Urgent', hi: 'अति आवश्यक', color: 'bg-red-100 text-red-900' },
};

export const ROLE_LABELS: Record<string, { en: string; hi: string }> = {
  CITIZEN: { en: 'Citizen', hi: 'नागरिक' },
  FIELD_OFFICER: { en: 'Field Officer', hi: 'क्षेत्रीय निरीक्षण अधिकारी' },
  REVIEWING_OFFICER: { en: 'Reviewing Officer', hi: 'समीक्षा अधिकारी' },
  APPROVING_OFFICER: { en: 'Approving Officer', hi: 'स्वीकृति अधिकारी' },
  ADMIN: { en: 'System Administrator', hi: 'प्रशासक' },
};

export const DOC_TYPE_LABELS: Record<string, { en: string; hi: string }> = {
  PROJECT_SANCTION: { en: 'Project Sanction', hi: 'परियोजना स्वीकृति' },
  ADMINISTRATIVE_APPROVAL: { en: 'Administrative Approval', hi: 'प्रशासनिक स्वीकृति' },
  TECHNICAL_SANCTION: { en: 'Technical Sanction', hi: 'तकनीकी स्वीकृति' },
  SANCTIONED_ESTIMATE: { en: 'Sanctioned Estimate', hi: 'स्वीकृत प्राक्कलन' },
  WORK_ORDER: { en: 'Work Order', hi: 'कार्यादेश' },
  EXPENDITURE_RECORD: { en: 'Expenditure Record', hi: 'व्यय विवरण' },
  MEASUREMENT_BOOK: { en: 'Measurement Book (MB)', hi: 'माप पुस्तिका (MB)' },
  COMPLETION_CERTIFICATE: { en: 'Completion Certificate', hi: 'कार्य पूर्णता प्रमाणपत्र' },
  BEFORE_PHOTO: { en: 'Before Work Photo', hi: 'कार्य पूर्व फोटो' },
  DURING_PHOTO: { en: 'During Work Photo', hi: 'कार्य के दौरान फोटो' },
  AFTER_PHOTO: { en: 'Completion Photo', hi: 'कार्य पूर्णता फोटो' },
};

export const PUBLIC_TIMELINE_STEPS = [
  { key: 'RECEIVED', en: 'Complaint Received', hi: 'शिकायत प्राप्त' },
  { key: 'UNDER_REVIEW', en: 'Under Review', hi: 'समीक्षाधीन' },
  { key: 'INSPECTION_SCHEDULED', en: 'Field Inspection Scheduled', hi: 'स्थल निरीक्षण निर्धारित' },
  { key: 'INSPECTION_COMPLETED', en: 'Inspection Completed', hi: 'स्थल निरीक्षण पूर्ण' },
  { key: 'ACTION_INITIATED', en: 'Action Initiated', hi: 'कार्रवाई प्रारंभ' },
  { key: 'RESOLVED', en: 'Resolved', hi: 'निस्तारित' },
];

export function mapStatusToPublicStep(status: string): number {
  switch (status) {
    case 'SUBMITTED':
    case 'MANUAL_TRIAGE':
      return 0;
    case 'UNDER_DESK_SCRUTINY':
    case 'RETURNED_FOR_EVIDENCE':
      return 1;
    case 'INSPECTION_SCHEDULED':
    case 'REINSPECTION_REQUESTED':
      return 2;
    case 'INSPECTION_SUBMITTED':
    case 'TECHNICAL_REVIEW':
    case 'REFERRED_FOR_INQUIRY':
      return 3;
    case 'ACTION_APPROVED':
      return 4;
    case 'RESOLVED':
    case 'REJECTED':
      return 5;
    default:
      return 0;
  }
}

export const UI_COPY = {
  hi: {
    brand: 'जनसेवा',
    tagline: 'झारखंड नागरिक शिकायत, स्थल सत्यापन एवं सरकारी कार्रवाई मंच',
    simBanner: 'प्रदर्शन मोड (Simulated Demo Data) — यह एक प्रोटोटाइप है; इसमें प्रदर्शित पंचायतें, परियोजनाएँ और शिकायतें काल्पनिक हैं।',
    navReport: 'शिकायत दर्ज करें',
    navTrack: 'स्थिति जानें',
    navMap: 'सार्वजनिक मानचित्र',
    navOfficer: 'अधिकारी पोर्टल',
    navField: 'फील्ड ऐप',
    navAdmin: 'प्रशासन',
    navLogin: 'लॉगिन',
    navLogout: 'लॉगआउट',
    submitTitle: 'नई जन-शिकायत दर्ज करें',
    submitSubtitle: 'बिना जटिल पंजीकरण के मानचित्र पर स्थान चुनें और फोटो/आवाज़ के साथ समस्या भेजें।',
    selectCategory: 'समस्या की श्रेणी चुनें',
    selectLocation: 'मानचित्र पर समस्या का स्थान चुनें',
    useCurrentLoc: 'मेरा वर्तमान स्थान उपयोग करें',
    descriptionLabel: 'समस्या का विवरण (हिंदी या अंग्रेज़ी में)',
    descriptionPlaceholder: 'उदाहरण: हमारे गांव की नई बनी सड़क दो महीने में टूट गई है और बारिश में पानी भर जाता है।',
    citizenNameLabel: 'आपका नाम',
    citizenPhoneLabel: 'मोबाइल नंबर (अपडेट हेतु)',
    photosLabel: 'स्थल की फोटो अपलोड करें (वैकल्पिक)',
    voiceLabel: 'वॉइस संदेश रिकॉर्ड करें (वैकल्पिक)',
    submitBtn: 'शिकायत सबमिट करें',
    trackTitle: 'शिकायत की स्थिति ट्रैक करें',
    trackPlaceholder: 'संदर्भ संख्या दर्ज करें (जैसे: JSV-2026-0001)',
    trackBtn: 'स्थिति देखें',
  },
  en: {
    brand: 'JanSeva',
    tagline: 'Jharkhand Citizen Reporting, Ground Verification & Government Action Platform',
    simBanner: 'Demonstration Mode (Simulated Data) — Fictional Gram Panchayats, projects, and records for demonstration only. Not an official government portal.',
    navReport: 'Report Issue',
    navTrack: 'Track Status',
    navMap: 'Public Map',
    navOfficer: 'Officer Portal',
    navField: 'Field App',
    navAdmin: 'Admin',
    navLogin: 'Login',
    navLogout: 'Logout',
    submitTitle: 'Submit a Citizen Report',
    submitSubtitle: 'Select the problem location on the map and attach photos or a voice note without complex registration.',
    selectCategory: 'Select Issue Category',
    selectLocation: 'Pin Problem Location on Map',
    useCurrentLoc: 'Use My Current Location',
    descriptionLabel: 'Problem Description (Hindi or English)',
    descriptionPlaceholder: 'Example: The newly built road in our village broke within two months and waterlogs during rain.',
    citizenNameLabel: 'Your Name',
    citizenPhoneLabel: 'Mobile Number (for updates)',
    photosLabel: 'Upload Site Photographs (Optional)',
    voiceLabel: 'Record Voice Note (Optional)',
    submitBtn: 'Submit Complaint',
    trackTitle: 'Track Complaint Status',
    trackPlaceholder: 'Enter Reference Number (e.g., JSV-2026-0001)',
    trackBtn: 'Check Status',
  },
} as const;

