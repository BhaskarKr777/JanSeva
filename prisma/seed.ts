import { PrismaClient, Role, ComplaintStatus, Priority, ProjectStatus, DocumentType, DecisionType, RelationshipType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding JanSeva Jharkhand Demo Database...');

  // Clean in reverse dependency order
  await prisma.auditEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.resolutionRecord.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.evidenceFile.deleteMany();
  await prisma.inspectionMeasurement.deleteMany();
  await prisma.inspectionReport.deleteMany();
  await prisma.inspectionAssignment.deleteMany();
  await prisma.departmentAssignment.deleteMany();
  await prisma.complaintRelationship.deleteMany();
  await prisma.complaintAttachment.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.projectMeasurement.deleteMany();
  await prisma.projectEstimate.deleteMany();
  await prisma.projectDocument.deleteMany();
  await prisma.project.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.issueCategoryConfig.deleteMany();
  await prisma.village.deleteMany();
  await prisma.gramPanchayat.deleteMany();
  await prisma.block.deleteMany();
  await prisma.district.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Districts, Blocks, 5 Demo Gram Panchayats, Villages (Simulated Jharkhand)
  const ranchi = await prisma.district.create({
    data: { name: 'Ranchi (Demo)', nameHi: 'रांची (डेमो)', code: 'JH-RNC' },
  });

  const blockOrmanjhi = await prisma.block.create({
    data: { name: 'Ormanjhi Block (Demo)', nameHi: 'ओरमांझी प्रखंड (डेमो)', districtId: ranchi.id },
  });
  const blockBundu = await prisma.block.create({
    data: { name: 'Bundu Block (Demo)', nameHi: 'बुंडू प्रखंड (डेमो)', districtId: ranchi.id },
  });
  const blockKanke = await prisma.block.create({
    data: { name: 'Kanke Block (Demo)', nameHi: 'कांके प्रखंड (डेमो)', districtId: ranchi.id },
  });

  const gpList = await Promise.all([
    prisma.gramPanchayat.create({
      data: { name: 'Chutupalu Demo GP', nameHi: 'चुटूपालू डेमो पंचायत', blockId: blockOrmanjhi.id, lat: 23.485, lng: 85.462, isDemo: true },
    }),
    prisma.gramPanchayat.create({
      data: { name: 'Sonahatu Demo GP', nameHi: 'सोनाहातू डेमो पंचायत', blockId: blockBundu.id, lat: 23.215, lng: 85.685, isDemo: true },
    }),
    prisma.gramPanchayat.create({
      data: { name: 'Tamar Demo GP', nameHi: 'तमाड़ डेमो पंचायत', blockId: blockBundu.id, lat: 23.065, lng: 85.652, isDemo: true },
    }),
    prisma.gramPanchayat.create({
      data: { name: 'Pithoria Demo GP', nameHi: 'पिठोरिया डेमो पंचायत', blockId: blockKanke.id, lat: 23.512, lng: 85.302, isDemo: true },
    }),
    prisma.gramPanchayat.create({
      data: { name: 'Irba Demo GP', nameHi: 'इरबा डेमो पंचायत', blockId: blockOrmanjhi.id, lat: 23.455, lng: 85.415, isDemo: true },
    }),
  ]);

  const villages = await Promise.all([
    prisma.village.create({ data: { name: 'Chutupalu Tola', nameHi: 'चुटूपालू टोला', gramPanchayatId: gpList[0].id, lat: 23.486, lng: 85.463 } }),
    prisma.village.create({ data: { name: 'Gaghari', nameHi: 'गघरी', gramPanchayatId: gpList[0].id, lat: 23.491, lng: 85.458 } }),
    prisma.village.create({ data: { name: 'Sonahatu Khas', nameHi: 'सोनाहातू खास', gramPanchayatId: gpList[1].id, lat: 23.216, lng: 85.686 } }),
    prisma.village.create({ data: { name: 'Baredih', nameHi: 'बरेडीह', gramPanchayatId: gpList[1].id, lat: 23.221, lng: 85.679 } }),
    prisma.village.create({ data: { name: 'Tamar Bazar', nameHi: 'तमाड़ बाजार', gramPanchayatId: gpList[2].id, lat: 23.066, lng: 85.653 } }),
    prisma.village.create({ data: { name: 'Pithoria Basti', nameHi: 'पिठोरिया बस्ती', gramPanchayatId: gpList[3].id, lat: 23.513, lng: 85.303 } }),
    prisma.village.create({ data: { name: 'Irba Chowk', nameHi: 'इरबा चौक', gramPanchayatId: gpList[4].id, lat: 23.456, lng: 85.416 } }),
  ]);

  // 2. Departments
  const deptRWD = await prisma.department.create({
    data: { name: 'Rural Works Department (Demo)', nameHi: 'ग्रामीण कार्य विभाग (डेमो)', code: 'RWD', description: 'Rural roads, culverts and rural connectivity works.' },
  });
  const deptMGNREGA = await prisma.department.create({
    data: { name: 'Block MGNREGA Cell (Demo)', nameHi: 'प्रखंड मनरेगा कोषांग (डेमो)', code: 'MGNREGA', description: 'Ponds, check dams, rural earthworks and wage employment assets.' },
  });
  const deptPRI = await prisma.department.create({
    data: { name: 'Panchayati Raj Authority (Demo)', nameHi: 'पंचायती राज विभाग (डेमो)', code: 'PRI', description: 'Gram Panchayat buildings, local drainage and community assets.' },
  });
  const deptDWSD = await prisma.department.create({
    data: { name: 'Drinking Water & Sanitation Dept (Demo)', nameHi: 'पेयजल एवं स्वच्छता विभाग (डेमो)', code: 'DWSD', description: 'Handpumps, piped water supply and village sanitation.' },
  });
  const deptULB = await prisma.department.create({
    data: { name: 'Local Body & Streetlight Cell (Demo)', nameHi: 'स्थानीय निकाय एवं प्रकाश कोषांग (डेमो)', code: 'ULB', description: 'Solar & grid streetlights in panchayat/semi-urban zones.' },
  });

  // 3. Users (All 5 Roles with Demo@123)
  const pwHash = await bcrypt.hash('Demo@123', 10);

  const citizenUser = await prisma.user.create({
    data: {
      name: 'Ramesh Mahato (Citizen)',
      nameHi: 'रमेश महतो (नागरिक)',
      email: 'citizen@janseva.demo',
      phone: '9876500001',
      passwordHash: pwHash,
      role: Role.CITIZEN,
      designation: 'Village Resident',
      designationHi: 'ग्रामीण नागरिक',
    },
  });

  const fieldOfficer1 = await prisma.user.create({
    data: {
      name: 'Arvind Kumar Oraon (JE)',
      nameHi: 'अरविंद कुमार उरांव (कनीय अभियंता)',
      email: 'field@janseva.demo',
      phone: '9876500002',
      passwordHash: pwHash,
      role: Role.FIELD_OFFICER,
      designation: 'Junior Engineer (Field)',
      designationHi: 'कनीय अभियंता (क्षेत्र)',
      departmentId: deptRWD.id,
      jurisdiction: 'Ormanjhi & Kanke Blocks',
    },
  });

  const fieldOfficer2 = await prisma.user.create({
    data: {
      name: 'Sunita Tirkey (Block Tech Officer)',
      nameHi: 'सुनीता तिर्की (तकनीकी सहायक)',
      email: 'field2@janseva.demo',
      phone: '9876500006',
      passwordHash: pwHash,
      role: Role.FIELD_OFFICER,
      designation: 'Technical Assistant (Field)',
      designationHi: 'तकनीकी सहायक (क्षेत्र)',
      departmentId: deptMGNREGA.id,
      jurisdiction: 'Bundu & Sonahatu Blocks',
    },
  });

  const reviewingOfficer = await prisma.user.create({
    data: {
      name: 'Dr. Rajeshwar Prasad (BDO / AE)',
      nameHi: 'डॉ. राजेश्वर प्रसाद (समीक्षा अधिकारी)',
      email: 'reviewer@janseva.demo',
      phone: '9876500003',
      passwordHash: pwHash,
      role: Role.REVIEWING_OFFICER,
      designation: 'Assistant Engineer / Reviewing Officer',
      designationHi: 'सहायक अभियंता / समीक्षा अधिकारी',
      departmentId: deptRWD.id,
      jurisdiction: 'Ranchi Rural Subdivision',
    },
  });

  const approvingOfficer = await prisma.user.create({
    data: {
      name: 'Meenakshi Sinha, IAS (DDC)',
      nameHi: 'मीनाक्षी सिन्हा (स्वीकृति अधिकारी)',
      email: 'approver@janseva.demo',
      phone: '9876500004',
      passwordHash: pwHash,
      role: Role.APPROVING_OFFICER,
      designation: 'District Approving Authority',
      designationHi: 'जिला स्वीकृति प्राधिकारी',
      jurisdiction: 'Ranchi District (Demo)',
    },
  });

  const adminUser = await prisma.user.create({
    data: {
      name: 'Vikash Verma (System Admin)',
      nameHi: 'विकास वर्मा (प्रशासक)',
      email: 'admin@janseva.demo',
      phone: '9876500005',
      passwordHash: pwHash,
      role: Role.ADMIN,
      designation: 'State Portal Administrator',
      designationHi: 'राज्य पोर्टल प्रशासक',
    },
  });

  // 4. Issue Categories & Configurable Routing Rules
  const categories = [
    { key: 'DAMAGED_ROAD', labelEn: 'Damaged road', labelHi: 'टूटी / क्षतिग्रस्त सड़क', icon: 'Road', sortOrder: 1 },
    { key: 'INCOMPLETE_CONSTRUCTION', labelEn: 'Incomplete construction', labelHi: 'अधूरा निर्माण कार्य', icon: 'HardHat', sortOrder: 2 },
    { key: 'POOR_QUALITY', labelEn: 'Poor construction quality', labelHi: 'घटिया निर्माण गुणवत्ता', icon: 'ShieldAlert', sortOrder: 3 },
    { key: 'DRAINAGE_WATERLOGGING', labelEn: 'Drainage and waterlogging', labelHi: 'नाली जाम और जलभराव', icon: 'Waves', sortOrder: 4 },
    { key: 'BROKEN_CULVERT_BRIDGE', labelEn: 'Broken culvert or bridge', labelHi: 'टूटी पुलिया या पुल', icon: 'Construction', sortOrder: 5 },
    { key: 'DRINKING_WATER', labelEn: 'Drinking-water problem', labelHi: 'पेयजल / हैंडपंप समस्या', icon: 'Droplets', sortOrder: 6 },
    { key: 'STREETLIGHT', labelEn: 'Streetlight problem', labelHi: 'स्ट्रीटलाइट खराब', icon: 'Lightbulb', sortOrder: 7 },
    { key: 'PUBLIC_BUILDING_DAMAGE', labelEn: 'Public building damage', labelHi: 'सार्वजनिक भवन क्षति', icon: 'Building2', sortOrder: 8 },
    { key: 'OTHER_INFRASTRUCTURE', labelEn: 'Other public infrastructure issue', labelHi: 'अन्य बुनियादी ढाँचा समस्या', icon: 'AlertTriangle', sortOrder: 9 },
  ];
  await prisma.issueCategoryConfig.createMany({ data: categories });

  await prisma.routingRule.createMany({
    data: [
      { name: 'Rural Road Damage -> RWD', categoryKey: 'DAMAGED_ROAD', departmentId: deptRWD.id, defaultPriority: Priority.HIGH, slaDays: 5 },
      { name: 'Poor Quality -> RWD', categoryKey: 'POOR_QUALITY', departmentId: deptRWD.id, defaultPriority: Priority.HIGH, slaDays: 5 },
      { name: 'Broken Culvert/Bridge -> RWD', categoryKey: 'BROKEN_CULVERT_BRIDGE', departmentId: deptRWD.id, defaultPriority: Priority.URGENT, slaDays: 3 },
      { name: 'Incomplete Construction -> PRI', categoryKey: 'INCOMPLETE_CONSTRUCTION', departmentId: deptPRI.id, defaultPriority: Priority.HIGH, slaDays: 7 },
      { name: 'Drainage & Waterlogging -> PRI', categoryKey: 'DRAINAGE_WATERLOGGING', departmentId: deptPRI.id, defaultPriority: Priority.MEDIUM, slaDays: 5 },
      { name: 'Drinking Water -> DWSD', categoryKey: 'DRINKING_WATER', departmentId: deptDWSD.id, defaultPriority: Priority.HIGH, slaDays: 3 },
      { name: 'Streetlight -> ULB', categoryKey: 'STREETLIGHT', departmentId: deptULB.id, defaultPriority: Priority.LOW, slaDays: 7 },
      { name: 'Public Building Damage -> PRI', categoryKey: 'PUBLIC_BUILDING_DAMAGE', departmentId: deptPRI.id, defaultPriority: Priority.MEDIUM, slaDays: 7 },
    ],
  });

  // 5. 10 Fictional Development Projects (Simulated)
  const projRoadA = await prisma.project.create({
    data: {
      projectCode: 'PRJ-RWD-101',
      title: 'Chutupalu Tola to NH-33 BT Link Road (1.2 km)',
      titleHi: 'चुटूपालू टोला से एनएच-33 पक्की संपर्क सड़क (1.2 किमी)',
      schemeName: 'Mukhyamantri Gram Sadak Yojana (Demo)',
      schemeNameHi: 'मुख्यमंत्री ग्राम सड़क योजना (डेमो)',
      category: 'DAMAGED_ROAD',
      status: ProjectStatus.COMPLETED,
      sanctionedAmount: 1850000,
      expenditureAmount: 1810000,
      contractorName: 'M/s Chotanagpur Infra Builders (Demo)',
      sanctionDate: new Date('2025-11-15'),
      expectedEndDate: new Date('2026-04-30'),
      actualEndDate: new Date('2026-08-20'),
      lat: 23.4862,
      lng: 85.4631,
      locationDesc: 'Chutupalu Tola Main Link Road, Ormanjhi Demo Block',
      departmentId: deptRWD.id,
      gramPanchayatId: gpList[0].id,
      documents: {
        create: [
          { docType: DocumentType.PROJECT_SANCTION, title: 'Sanction Order #RWD-2025-101', fileUrl: '/demo-evidence/road-before.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.ADMINISTRATIVE_APPROVAL, title: 'Administrative Approval #AA-101', fileUrl: '/demo-evidence/road-before.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.TECHNICAL_SANCTION, title: 'Technical Sanction #TS-101', fileUrl: '/demo-evidence/road-during.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.SANCTIONED_ESTIMATE, title: 'Sanctioned BOQ & Estimate', fileUrl: '/demo-evidence/road-during.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.WORK_ORDER, title: 'Work Order #WO-2025-88', fileUrl: '/demo-evidence/road-during.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.EXPENDITURE_RECORD, title: 'Final Bill & Expenditure Voucher', fileUrl: '/demo-evidence/road-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.MEASUREMENT_BOOK, title: 'MB Book No. 42 (Pages 12-18)', fileUrl: '/demo-evidence/road-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.COMPLETION_CERTIFICATE, title: 'Completion Certificate #CC-101', fileUrl: '/demo-evidence/road-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.BEFORE_PHOTO, title: 'Before Work: Kachcha Track', fileUrl: '/demo-evidence/road-before.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.DURING_PHOTO, title: 'During Work: WBM Compacting', fileUrl: '/demo-evidence/road-during.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.AFTER_PHOTO, title: 'Completion: Bituminous Surface', fileUrl: '/demo-evidence/road-after.svg', mimeType: 'image/svg+xml' },
        ],
      },
      estimates: {
        create: [
          { itemName: 'Road Length (BT Surface)', itemNameHi: 'पक्की सड़क लंबाई', unit: 'meters', sanctionedQty: 1200, sanctionedRate: 1100, sanctionedAmount: 1320000 },
          { itemName: 'Bitumen Wearing Coat Thickness', itemNameHi: 'बिटुमिन परत मोटाई', unit: 'mm', sanctionedQty: 25, sanctionedRate: 12000, sanctionedAmount: 300000 },
          { itemName: 'Side Shoulder & Drain', itemNameHi: 'साइड शोल्डर एवं नाली', unit: 'meters', sanctionedQty: 800, sanctionedRate: 287.5, sanctionedAmount: 230000 },
        ],
      },
      measurements: {
        create: [
          { itemName: 'Road Length (BT Surface)', unit: 'meters', recordedQty: 1200, mbReference: 'MB-42/P-14', recordedBy: 'Arvind Kumar Oraon (JE)' },
          { itemName: 'Bitumen Wearing Coat Thickness', unit: 'mm', recordedQty: 25, mbReference: 'MB-42/P-15', recordedBy: 'Arvind Kumar Oraon (JE)' },
          { itemName: 'Side Shoulder & Drain', unit: 'meters', recordedQty: 750, mbReference: 'MB-42/P-16', recordedBy: 'Arvind Kumar Oraon (JE)' },
        ],
      },
    },
    include: { estimates: true },
  });

  const projPondB = await prisma.project.create({
    data: {
      projectCode: 'PRJ-MGN-202',
      title: 'Sonahatu Community Pond Excavation & Bund Strengthening',
      titleHi: 'सोनाहातू सामुदायिक तालाब गहरीकरण एवं मेड़ सुदृढ़ीकरण',
      schemeName: 'MGNREGA Water Conservation (Demo)',
      schemeNameHi: 'मनरेगा जल संरक्षण (डेमो)',
      category: 'INCOMPLETE_CONSTRUCTION',
      status: ProjectStatus.COMPLETED,
      sanctionedAmount: 940000,
      expenditureAmount: 915000,
      contractorName: 'Gram Sabha Implementing Agency (Demo)',
      sanctionDate: new Date('2026-01-10'),
      expectedEndDate: new Date('2026-06-15'),
      actualEndDate: new Date('2026-07-05'),
      lat: 23.2165,
      lng: 85.6865,
      locationDesc: 'Sonahatu Khas East Pond, Bundu Demo Block',
      departmentId: deptMGNREGA.id,
      gramPanchayatId: gpList[1].id,
      documents: {
        create: [
          { docType: DocumentType.PROJECT_SANCTION, title: 'MGNREGA Sanction #MGN-202', fileUrl: '/demo-evidence/pond-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.SANCTIONED_ESTIMATE, title: 'Sanctioned Pond Estimate', fileUrl: '/demo-evidence/pond-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.MEASUREMENT_BOOK, title: 'MB Book #19 (Pond Earthwork)', fileUrl: '/demo-evidence/pond-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.COMPLETION_CERTIFICATE, title: 'Reported Completion Certificate', fileUrl: '/demo-evidence/pond-after.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.AFTER_PHOTO, title: 'Submitted Completion Photo', fileUrl: '/demo-evidence/pond-after.svg', mimeType: 'image/svg+xml' },
        ],
      },
      estimates: {
        create: [
          { itemName: 'Pond Excavation Depth', itemNameHi: 'तालाब की गहराई', unit: 'metres', sanctionedQty: 2.0, sanctionedRate: 300000, sanctionedAmount: 600000 },
          { itemName: 'Bund Embankment Length', itemNameHi: 'मेड़ की लंबाई', unit: 'metres', sanctionedQty: 180, sanctionedRate: 1888, sanctionedAmount: 340000 },
        ],
      },
      measurements: {
        create: [
          { itemName: 'Pond Excavation Depth', unit: 'metres', recordedQty: 1.8, mbReference: 'MB-19/P-08', recordedBy: 'Sunita Tirkey' },
          { itemName: 'Bund Embankment Length', unit: 'metres', recordedQty: 175, mbReference: 'MB-19/P-09', recordedBy: 'Sunita Tirkey' },
        ],
      },
    },
    include: { estimates: true },
  });

  const projBuildingE = await prisma.project.create({
    data: {
      projectCode: 'PRJ-PRI-301',
      title: 'Pithoria Panchayat Bhawan Additional Hall & Roof Repair',
      titleHi: 'पिठोरिया पंचायत भवन अतिरिक्त हॉल एवं छत मरम्मत',
      schemeName: '15th Finance Commission Grant (Demo)',
      schemeNameHi: '15वां वित्त आयोग अनुदान (डेमो)',
      category: 'INCOMPLETE_CONSTRUCTION',
      status: ProjectStatus.IN_PROGRESS,
      sanctionedAmount: 1250000,
      expenditureAmount: 1200000,
      contractorName: 'M/s Jharkhand Civil Works (Demo)',
      sanctionDate: new Date('2025-12-01'),
      expectedEndDate: new Date('2026-05-30'),
      lat: 23.5132,
      lng: 85.3035,
      locationDesc: 'Pithoria Basti Panchayat Campus, Kanke Demo Block',
      departmentId: deptPRI.id,
      gramPanchayatId: gpList[3].id,
      documents: {
        create: [
          { docType: DocumentType.PROJECT_SANCTION, title: '15th FC Sanction Order', fileUrl: '/demo-evidence/building-incomplete.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.WORK_ORDER, title: 'Work Order #PRI-301', fileUrl: '/demo-evidence/building-incomplete.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.EXPENDITURE_RECORD, title: '96% Expenditure Voucher (₹12.0L)', fileUrl: '/demo-evidence/building-incomplete.svg', mimeType: 'image/svg+xml' },
          { docType: DocumentType.DURING_PHOTO, title: 'Lintle Level Photo', fileUrl: '/demo-evidence/building-incomplete.svg', mimeType: 'image/svg+xml' },
        ],
      },
      estimates: {
        create: [
          { itemName: 'RCC Roof Slab Area', itemNameHi: 'आरसीसी छत क्षेत्रफल', unit: 'sqm', sanctionedQty: 120, sanctionedRate: 6500, sanctionedAmount: 780000 },
          { itemName: 'Plastering & Flooring', itemNameHi: 'प्लास्टर एवं फर्श', unit: 'sqm', sanctionedQty: 240, sanctionedRate: 1958, sanctionedAmount: 470000 },
        ],
      },
      measurements: {
        create: [
          { itemName: 'RCC Roof Slab Area', unit: 'sqm', recordedQty: 120, mbReference: 'MB-07/P-03', recordedBy: 'Junior Engineer' },
          { itemName: 'Plastering & Flooring', unit: 'sqm', recordedQty: 90, mbReference: 'MB-07/P-04', recordedBy: 'Junior Engineer' },
        ],
      },
    },
    include: { estimates: true },
  });

  // 7 more realistic projects
  const extraProjectsData = [
    { code: 'PRJ-DWSD-401', title: 'Tamar Bazar Solar Dual-Pump Water Tank', titleHi: 'तमाड़ बाजार सोलर जल मीनार', scheme: 'Jal Jeevan Demo', cat: 'DRINKING_WATER', amt: 680000, exp: 650000, lat: 23.0662, lng: 85.6532, dept: deptDWSD.id, gp: gpList[2].id, status: ProjectStatus.COMPLETED },
    { code: 'PRJ-RWD-104', title: 'Irba Chowk RCC Box Culvert', titleHi: 'इरबा चौक आरसीसी बॉक्स पुलिया', scheme: 'Rural Bridge Demo', cat: 'BROKEN_CULVERT_BRIDGE', amt: 1420000, exp: 980000, lat: 23.4561, lng: 85.4162, dept: deptRWD.id, gp: gpList[4].id, status: ProjectStatus.IN_PROGRESS },
    { code: 'PRJ-PRI-305', title: 'Gaghari Village PCC Road & Drain', titleHi: 'गघरी गांव पीसीसी सड़क एवं नाली', scheme: '15th FC Demo', cat: 'DAMAGED_ROAD', amt: 750000, exp: 740000, lat: 23.4912, lng: 85.4584, dept: deptPRI.id, gp: gpList[0].id, status: ProjectStatus.COMPLETED },
    { code: 'PRJ-ULB-501', title: 'Irba Main Road 25 Solar Streetlights', titleHi: 'इरबा मुख्य मार्ग 25 सोलर स्ट्रीटलाइट', scheme: 'Panchayat Solar Demo', cat: 'STREETLIGHT', amt: 450000, exp: 450000, lat: 23.4545, lng: 85.4148, dept: deptULB.id, gp: gpList[4].id, status: ProjectStatus.COMPLETED },
    { code: 'PRJ-MGN-208', title: 'Baredih Check Dam Construction', titleHi: 'बरेडीह चेक डैम निर्माण', scheme: 'MGNREGA Demo', cat: 'INCOMPLETE_CONSTRUCTION', amt: 1120000, exp: 640000, lat: 23.2215, lng: 85.6791, dept: deptMGNREGA.id, gp: gpList[1].id, status: ProjectStatus.IN_PROGRESS },
    { code: 'PRJ-DWSD-405', title: 'Pithoria School Handpump & Soakpit', titleHi: 'पिठोरिया विद्यालय हैंडपंप एवं सोख्ता', scheme: 'Swachh Bharat Demo', cat: 'DRINKING_WATER', amt: 185000, exp: 180000, lat: 23.5142, lng: 85.3018, dept: deptDWSD.id, gp: gpList[3].id, status: ProjectStatus.COMPLETED },
    { code: 'PRJ-PRI-310', title: 'Tamar Anganwadi Kendra Repair', titleHi: 'तमाड़ आंगनवाड़ी केंद्र मरम्मत', scheme: 'District Plan Demo', cat: 'PUBLIC_BUILDING_DAMAGE', amt: 390000, exp: 310000, lat: 23.0648, lng: 85.6512, dept: deptPRI.id, gp: gpList[2].id, status: ProjectStatus.IN_PROGRESS },
  ];

  for (const p of extraProjectsData) {
    await prisma.project.create({
      data: {
        projectCode: p.code,
        title: p.title,
        titleHi: p.titleHi,
        schemeName: p.scheme,
        category: p.cat,
        status: p.status,
        sanctionedAmount: p.amt,
        expenditureAmount: p.exp,
        sanctionDate: new Date('2026-01-15'),
        lat: p.lat,
        lng: p.lng,
        locationDesc: `${p.title} Site (Simulated)`,
        departmentId: p.dept,
        gramPanchayatId: p.gp,
      },
    });
  }

  // 6. Seed 20 Complaints (including Scenarios A, B, C, D, E)
  const daysAgo = (d: number) => new Date(Date.now() - d * 86400000);

  // SCENARIO A: Complete end-to-end demonstration case (JSV-2026-0001)
  const compA = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0001',
      category: 'DAMAGED_ROAD',
      status: ComplaintStatus.RESOLVED,
      priority: Priority.HIGH,
      description: 'हमारे गांव चुटूपालू की नई बनी सड़क दो महीने में टूट गई है और बारिश में पानी भर जाता है।',
      descriptionEn: 'The newly constructed link road in Chutupalu village broke within two months and gets waterlogged during rain.',
      language: 'hi',
      lat: 23.4864,
      lng: 85.4633,
      locationDescription: 'Chutupalu Tola Link Road near Middle School',
      gramPanchayatId: gpList[0].id,
      villageId: villages[0].id,
      citizenName: 'Ramesh Mahato',
      citizenPhone: '9876500001',
      linkedProjectId: projRoadA.id,
      suggestedDeptId: deptRWD.id,
      assignedDeptId: deptRWD.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      approvingOfficerId: approvingOfficer.id,
      aiSummary: 'Newly completed BT link road showing premature surface failure and drainage waterlogging within 2 months of completion.',
      aiExplanation: 'Matched to Rural Works Department via road damage rule and linked to PRJ-RWD-101 (25m away).',
      aiConfidence: 0.94,
      createdAt: daysAgo(14),
      attachments: {
        create: [
          { fileType: 'PHOTO', fileName: 'road-damaged.svg', fileUrl: '/demo-evidence/road-damaged.svg', mimeType: 'image/svg+xml', caption: 'Waterlogged damaged stretch' },
        ],
      },
    },
  });

  const inspAssignA = await prisma.inspectionAssignment.create({
    data: {
      complaintId: compA.id,
      fieldOfficerId: fieldOfficer1.id,
      assignedById: reviewingOfficer.id,
      scheduledDate: daysAgo(10),
      instructions: 'Measure actual BT road thickness, check side drain length vs MB-42, and capture GPS photos.',
      status: 'COMPLETED',
    },
  });

  const inspReportA = await prisma.inspectionReport.create({
    data: {
      complaintId: compA.id,
      assignmentId: inspAssignA.id,
      fieldOfficerId: fieldOfficer1.id,
      gpsLat: 23.4864,
      gpsLng: 85.4633,
      gpsAccuracy: 5.2,
      capturedAt: daysAgo(9),
      observations: 'चुटूपालू सड़क के 180 मीटर हिस्से में बिटुमिन परत उखड़ गई है और साइड नाली अधूरी होने से जलभराव है।',
      observationsEn: 'Bitumen wearing coat peeled off along 180m stretch; incomplete side drain caused waterlogging.',
      checklistJson: [
        { item: 'Verify GPS coordinates match sanctioned work site', checked: true },
        { item: 'Measure physical dimensions against sanctioned estimate', checked: true },
        { item: 'Capture site photographs with timestamp', checked: true },
        { item: 'Record local witness / citizen statement', checked: true },
      ],
      aiSummary: 'Field measurements confirm 18mm bitumen thickness vs 25mm sanctioned and 580m side drain vs 800m sanctioned.',
      aiInconsistencies: 'Side drain length 220m short of sanctioned estimate; contractor defect liability rectification ordered.',
      isDraft: false,
      submittedAt: daysAgo(9),
      measurements: {
        create: [
          { estimateItemId: projRoadA.estimates[0].id, itemName: 'Road Length (BT Surface)', unit: 'meters', measuredQty: 1200, notes: 'Full length laid' },
          { estimateItemId: projRoadA.estimates[1].id, itemName: 'Bitumen Wearing Coat Thickness', unit: 'mm', measuredQty: 18, notes: 'Below 25mm norm in damaged stretch' },
          { estimateItemId: projRoadA.estimates[2].id, itemName: 'Side Shoulder & Drain', unit: 'meters', measuredQty: 580, notes: '220m drain incomplete near school' },
        ],
      },
      evidenceFiles: {
        create: [
          { fileName: 'road-damaged.svg', fileUrl: '/demo-evidence/road-damaged.svg', mimeType: 'image/svg+xml', caption: 'Field inspection photo of damaged BT stretch', gpsLat: 23.4864, gpsLng: 85.4633 },
        ],
      },
    },
  });

  await prisma.decision.createMany({
    data: [
      { complaintId: compA.id, decidedById: reviewingOfficer.id, decisionType: DecisionType.APPROVE_ACTION, reason: 'Field evidence confirms premature wearing coat failure and incomplete 220m drain under defect liability period. Recommend contractor rectification notice.' },
      { complaintId: compA.id, decidedById: approvingOfficer.id, decisionType: DecisionType.RECORD_RESOLUTION, reason: 'Rectification completed by contractor under defect liability; side drain cleared and patched. Verified by JE.' },
    ],
  });

  await prisma.resolutionRecord.create({
    data: {
      complaintId: compA.id,
      resolvedById: approvingOfficer.id,
      actionTaken: 'Issued defect liability rectification order to M/s Chotanagpur Infra Builders; 180m BT patch and 220m drain completed.',
      publicSafeSummary: 'Field inspection confirmed road surface damage and drainage blockage. Repair work and drain clearance have been completed by the department.',
      publicSafeSummaryHi: 'स्थल निरीक्षण में सड़क क्षति और नाली अवरोध की पुष्टि हुई। विभाग द्वारा मरम्मत कार्य एवं नाली सफाई पूर्ण कर दी गई है।',
      resolvedAt: daysAgo(2),
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      { complaintId: compA.id, userId: citizenUser.id, actorName: 'Ramesh Mahato', action: 'COMPLAINT_SUBMITTED', newStatus: ComplaintStatus.SUBMITTED, createdAt: daysAgo(14) },
      { complaintId: compA.id, actorName: 'JanSeva Routing Engine', action: 'DEPARTMENT_SUGGESTED_AND_ASSIGNED', previousStatus: ComplaintStatus.SUBMITTED, newStatus: ComplaintStatus.UNDER_DESK_SCRUTINY, reason: 'Linked to PRJ-RWD-101 and routed to RWD', createdAt: daysAgo(14) },
      { complaintId: compA.id, userId: reviewingOfficer.id, actorName: reviewingOfficer.name, action: 'INSPECTION_SCHEDULED', previousStatus: ComplaintStatus.UNDER_DESK_SCRUTINY, newStatus: ComplaintStatus.INSPECTION_SCHEDULED, reason: 'Assigned to Arvind Kumar Oraon (JE)', createdAt: daysAgo(11) },
      { complaintId: compA.id, userId: fieldOfficer1.id, actorName: fieldOfficer1.name, action: 'FIELD_INSPECTION_SUBMITTED', previousStatus: ComplaintStatus.INSPECTION_SCHEDULED, newStatus: ComplaintStatus.INSPECTION_SUBMITTED, reason: 'Uploaded measurements & GPS site photos', createdAt: daysAgo(9) },
      { complaintId: compA.id, userId: reviewingOfficer.id, actorName: reviewingOfficer.name, action: 'FORWARDED_FOR_APPROVAL', previousStatus: ComplaintStatus.INSPECTION_SUBMITTED, newStatus: ComplaintStatus.ACTION_APPROVED, reason: 'Defect liability rectification recommended', createdAt: daysAgo(6) },
      { complaintId: compA.id, userId: approvingOfficer.id, actorName: approvingOfficer.name, action: 'RESOLUTION_RECORDED', previousStatus: ComplaintStatus.ACTION_APPROVED, newStatus: ComplaintStatus.RESOLVED, reason: 'Rectification verified and citizen notified', createdAt: daysAgo(2) },
    ],
  });

  // SCENARIO B: Pond construction reported complete with inconsistent measurements (JSV-2026-0002)
  const compB = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0002',
      category: 'INCOMPLETE_CONSTRUCTION',
      status: ComplaintStatus.TECHNICAL_REVIEW,
      priority: Priority.HIGH,
      description: 'सोनाहातू तालाब निर्माण कागज पर पूरा दिखाया गया है लेकिन गहराई बहुत कम है और मेड़ भी अधूरा है।',
      descriptionEn: 'Sonahatu pond construction is shown as complete on paper, but actual depth is much less and bund is incomplete.',
      language: 'hi',
      lat: 23.2166,
      lng: 85.6867,
      locationDescription: 'Sonahatu Khas East Pond',
      gramPanchayatId: gpList[1].id,
      villageId: villages[2].id,
      citizenName: 'Budhram Munda',
      citizenPhone: '9876500012',
      linkedProjectId: projPondB.id,
      suggestedDeptId: deptMGNREGA.id,
      assignedDeptId: deptMGNREGA.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      approvingOfficerId: approvingOfficer.id,
      aiSummary: 'Reported discrepancy between paper completion of MGNREGA pond (PRJ-MGN-202) and physical depth on ground.',
      aiExplanation: 'Matched to Block MGNREGA Cell and linked to PRJ-MGN-202 (22m away).',
      aiConfidence: 0.92,
      createdAt: daysAgo(8),
    },
  });

  const inspAssignB = await prisma.inspectionAssignment.create({
    data: {
      complaintId: compB.id,
      fieldOfficerId: fieldOfficer2.id,
      assignedById: reviewingOfficer.id,
      scheduledDate: daysAgo(5),
      instructions: 'Measure actual pond excavation depth at 4 corners and bund embankment length.',
      status: 'COMPLETED',
    },
  });

  await prisma.inspectionReport.create({
    data: {
      complaintId: compB.id,
      assignmentId: inspAssignB.id,
      fieldOfficerId: fieldOfficer2.id,
      gpsLat: 23.2165,
      gpsLng: 85.6866,
      gpsAccuracy: 4.5,
      capturedAt: daysAgo(4),
      observations: 'तालाब की औसत गहराई केवल 1.5 मीटर पाई गई जबकि प्राक्कलन में 2.0 मीटर और MB में 1.8 मीटर दर्ज है।',
      observationsEn: 'Average pond depth measured at 1.5 metres vs 2.0m sanctioned and 1.8m recorded in MB.',
      checklistJson: [
        { item: 'Verify GPS coordinates match sanctioned work site', checked: true },
        { item: 'Measure physical dimensions against sanctioned estimate', checked: true },
        { item: 'Capture site photographs with timestamp', checked: true },
        { item: 'Record local witness / citizen statement', checked: true },
      ],
      aiSummary: 'Critical measurement variance: Sanctioned 2.0m, MB Recorded 1.8m, Field Measured 1.5m (-0.5m shortfall).',
      aiInconsistencies: 'Pond Excavation Depth shows -0.5m variance from sanction and -0.3m variance from MB.',
      isDraft: false,
      submittedAt: daysAgo(4),
      measurements: {
        create: [
          { estimateItemId: projPondB.estimates[0].id, itemName: 'Pond Excavation Depth', unit: 'metres', measuredQty: 1.5, notes: 'Average of 4 sounding points' },
          { estimateItemId: projPondB.estimates[1].id, itemName: 'Bund Embankment Length', unit: 'metres', measuredQty: 145, notes: '35m shorter than sanctioned 180m' },
        ],
      },
      evidenceFiles: {
        create: [
          { fileName: 'pond-field.svg', fileUrl: '/demo-evidence/pond-field.svg', mimeType: 'image/svg+xml', caption: 'Field depth gauge check (1.5m)', gpsLat: 23.2165, gpsLng: 85.6866 },
        ],
      },
    },
  });

  await prisma.auditEvent.createMany({
    data: [
      { complaintId: compB.id, actorName: 'Budhram Munda', action: 'COMPLAINT_SUBMITTED', newStatus: ComplaintStatus.SUBMITTED, createdAt: daysAgo(8) },
      { complaintId: compB.id, actorName: 'JanSeva Routing Engine', action: 'LINKED_TO_PROJECT', previousStatus: ComplaintStatus.SUBMITTED, newStatus: ComplaintStatus.UNDER_DESK_SCRUTINY, reason: 'Linked to PRJ-MGN-202', createdAt: daysAgo(8) },
      { complaintId: compB.id, userId: reviewingOfficer.id, actorName: reviewingOfficer.name, action: 'INSPECTION_SCHEDULED', previousStatus: ComplaintStatus.UNDER_DESK_SCRUTINY, newStatus: ComplaintStatus.INSPECTION_SCHEDULED, createdAt: daysAgo(5) },
      { complaintId: compB.id, userId: fieldOfficer2.id, actorName: fieldOfficer2.name, action: 'FIELD_INSPECTION_SUBMITTED', previousStatus: ComplaintStatus.INSPECTION_SCHEDULED, newStatus: ComplaintStatus.TECHNICAL_REVIEW, reason: 'Depth variance (-0.5m) flagged for technical review', createdAt: daysAgo(4) },
    ],
  });

  // SCENARIO C: Blocked village drainage with NO linked sanctioned project (JSV-2026-0003)
  const compC = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0003',
      category: 'DRAINAGE_WATERLOGGING',
      status: ComplaintStatus.INSPECTION_SCHEDULED,
      priority: Priority.MEDIUM,
      description: 'चुटूपालू बाजार के पास मुख्य नाली पूरी तरह जाम है, गंदा पानी घरों में घुस रहा है।',
      descriptionEn: 'Main drain near Chutupalu market is completely blocked; dirty water is entering houses.',
      language: 'hi',
      lat: 23.4842,
      lng: 85.4601,
      locationDescription: 'Chutupalu Market Lane (Non-project civic issue)',
      gramPanchayatId: gpList[0].id,
      villageId: villages[0].id,
      citizenName: 'Sita Devi',
      citizenPhone: '9876500023',
      linkedProjectId: null,
      suggestedDeptId: deptPRI.id,
      assignedDeptId: deptPRI.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      aiSummary: 'Blocked village drain causing household waterlogging; no linked sanctioned capital project.',
      aiExplanation: 'Routed to Panchayati Raj Authority as a local maintenance/drainage grievance.',
      aiConfidence: 0.85,
      createdAt: daysAgo(5),
    },
  });

  await prisma.inspectionAssignment.create({
    data: {
      complaintId: compC.id,
      fieldOfficerId: fieldOfficer1.id,
      assignedById: reviewingOfficer.id,
      scheduledDate: new Date(Date.now() + 86400000),
      instructions: 'Inspect blocked drain length and assess desilting requirement.',
      status: 'PENDING',
    },
  });

  // SCENARIO D: Broken handpump with multiple citizen reports (JSV-2026-0004, 0005, 0006)
  const compD1 = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0004',
      category: 'DRINKING_WATER',
      status: ComplaintStatus.UNDER_DESK_SCRUTINY,
      priority: Priority.HIGH,
      description: 'तमाड़ बाजार चौक का सरकारी हैंडपंप 15 दिन से खराब है, पीने के पानी की गंभीर समस्या है।',
      descriptionEn: 'Government handpump at Tamar Bazar Chowk has been broken for 15 days; severe drinking water shortage.',
      language: 'hi',
      lat: 23.0665,
      lng: 85.6538,
      locationDescription: 'Tamar Bazar Chowk Handpump #4',
      gramPanchayatId: gpList[2].id,
      villageId: villages[4].id,
      citizenName: 'Mangal Singh',
      citizenPhone: '9876500031',
      suggestedDeptId: deptDWSD.id,
      assignedDeptId: deptDWSD.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      aiSummary: 'Broken public handpump at Tamar Bazar Chowk; multiple nearby reports detected.',
      aiExplanation: 'Routed to DWSD with HIGH priority due to drinking water disruption.',
      aiConfidence: 0.91,
      createdAt: daysAgo(6),
      attachments: {
        create: [{ fileType: 'PHOTO', fileName: 'handpump-broken.svg', fileUrl: '/demo-evidence/handpump-broken.svg', mimeType: 'image/svg+xml', caption: 'Broken handpump cylinder' }],
      },
    },
  });

  const compD2 = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0005',
      category: 'DRINKING_WATER',
      status: ComplaintStatus.UNDER_DESK_SCRUTINY,
      priority: Priority.HIGH,
      description: 'तमाड़ चौक पर चापाकल टूट गया है, महिलाओं को दूर से पानी लाना पड़ रहा है।',
      descriptionEn: 'Handpump at Tamar Chowk is broken; women have to fetch water from far away.',
      language: 'hi',
      lat: 23.0666,
      lng: 85.6539,
      locationDescription: 'Near Tamar Bazar Chowk',
      gramPanchayatId: gpList[2].id,
      villageId: villages[4].id,
      citizenName: 'Phulo Devi',
      citizenPhone: '9876500032',
      suggestedDeptId: deptDWSD.id,
      assignedDeptId: deptDWSD.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      aiSummary: 'Related report for broken handpump at Tamar Chowk (cluster with JSV-2026-0004).',
      aiConfidence: 0.9,
      createdAt: daysAgo(5),
    },
  });

  const compD3 = await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0006',
      category: 'DRINKING_WATER',
      status: ComplaintStatus.UNDER_DESK_SCRUTINY,
      priority: Priority.HIGH,
      description: 'Tamar Bazar main chowk handpump not working for 2 weeks.',
      descriptionEn: 'Tamar Bazar main chowk handpump not working for 2 weeks.',
      language: 'en',
      lat: 23.0664,
      lng: 85.6537,
      locationDescription: 'Tamar Bazar Main Chowk',
      gramPanchayatId: gpList[2].id,
      villageId: villages[4].id,
      citizenName: 'Anil Mahto',
      citizenPhone: '9876500033',
      suggestedDeptId: deptDWSD.id,
      assignedDeptId: deptDWSD.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      aiSummary: 'Third citizen report for the same broken handpump at Tamar Bazar Chowk.',
      aiConfidence: 0.89,
      createdAt: daysAgo(4),
    },
  });

  await prisma.complaintRelationship.createMany({
    data: [
      { sourceComplaintId: compD1.id, targetComplaintId: compD2.id, relationshipType: RelationshipType.DUPLICATE, similarityScore: 0.94, linkedBy: 'AI Intake Cluster' },
      { sourceComplaintId: compD1.id, targetComplaintId: compD3.id, relationshipType: RelationshipType.DUPLICATE, similarityScore: 0.91, linkedBy: 'AI Intake Cluster' },
    ],
  });

  // SCENARIO E: Incomplete public building construction with missing completion docs (JSV-2026-0007)
  await prisma.complaint.create({
    data: {
      referenceNumber: 'JSV-2026-0007',
      category: 'INCOMPLETE_CONSTRUCTION',
      status: ComplaintStatus.RETURNED_FOR_EVIDENCE,
      priority: Priority.HIGH,
      description: 'पिठोरिया पंचायत भवन का हॉल और फर्श अधूरा पड़ा है जबकि अधिकांश राशि निकल चुकी है।',
      descriptionEn: 'Pithoria Panchayat Bhawan hall and flooring remain incomplete even though most funds are drawn.',
      language: 'hi',
      lat: 23.5133,
      lng: 85.3036,
      locationDescription: 'Pithoria Panchayat Campus',
      gramPanchayatId: gpList[3].id,
      villageId: villages[5].id,
      citizenName: 'Kishore Sahu',
      citizenPhone: '9876500041',
      linkedProjectId: projBuildingE.id,
      suggestedDeptId: deptPRI.id,
      assignedDeptId: deptPRI.id,
      assignedOfficerId: reviewingOfficer.id,
      reviewingOfficerId: reviewingOfficer.id,
      approvingOfficerId: approvingOfficer.id,
      aiSummary: 'Incomplete public building linked to PRJ-PRI-301 (96% expenditure utilized, Completion Certificate & MB final pages missing).',
      aiExplanation: 'Flagged missing Completion Certificate and partial MB entry (90 sqm vs 240 sqm plastering).',
      aiConfidence: 0.93,
      createdAt: daysAgo(12),
    },
  });

  // 13 Additional Realistic Complaints (Total = 20)
  const additionalComplaints = [
    { ref: 'JSV-2026-0008', cat: 'BROKEN_CULVERT_BRIDGE', status: ComplaintStatus.INSPECTION_SUBMITTED, prio: Priority.URGENT, desc: 'इरबा चौक पुलिया का एक किनारा धंस गया है, स्कूल बस निकलने में खतरा है।', descEn: 'One edge of Irba Chowk culvert has caved in, posing danger to school buses.', lat: 23.4563, lng: 85.4165, gp: gpList[4].id, vil: villages[6].id, dept: deptRWD.id, name: 'Firoz Ansari', days: 3 },
    { ref: 'JSV-2026-0009', cat: 'STREETLIGHT', status: ComplaintStatus.UNDER_DESK_SCRUTINY, prio: Priority.LOW, desc: 'इरबा मुख्य मार्ग की 6 सोलर स्ट्रीटलाइट 1 महीने से बंद हैं।', descEn: '6 solar streetlights on Irba main road have been non-functional for 1 month.', lat: 23.4547, lng: 85.4149, gp: gpList[4].id, vil: villages[6].id, dept: deptULB.id, name: 'Neha Kumari', days: 7 },
    { ref: 'JSV-2026-0010', cat: 'OTHER_INFRASTRUCTURE', status: ComplaintStatus.MANUAL_TRIAGE, prio: Priority.MEDIUM, desc: 'गघरी हाट बाजार शेड की टीन की छत आंधी में उड़ गई है।', descEn: 'Tin roof of Gaghari Haat Bazar shed blew away in storm.', lat: 23.4918, lng: 85.4589, gp: gpList[0].id, vil: villages[1].id, dept: null, name: 'Birsa Pahan', days: 2 },
    { ref: 'JSV-2026-0011', cat: 'POOR_QUALITY', status: ComplaintStatus.UNDER_DESK_SCRUTINY, prio: Priority.HIGH, desc: 'गघरी पीसीसी सड़क में सीमेंट उखड़ रहा है और गिट्टी बाहर आ गई है।', descEn: 'Cement mortar peeling off on Gaghari PCC road, aggregates exposed.', lat: 23.4911, lng: 85.4582, gp: gpList[0].id, vil: villages[1].id, dept: deptPRI.id, name: 'Suresh Tiwari', days: 9 },
    { ref: 'JSV-2026-0012', cat: 'PUBLIC_BUILDING_DAMAGE', status: ComplaintStatus.INSPECTION_SCHEDULED, prio: Priority.MEDIUM, desc: 'तमाड़ आंगनवाड़ी केंद्र की दीवार में दरारें और छत से पानी टपकता है।', descEn: 'Cracks in Tamar Anganwadi wall and roof leakage.', lat: 23.0649, lng: 85.6514, gp: gpList[2].id, vil: villages[4].id, dept: deptPRI.id, name: 'Kavita Devi', days: 11 },
    { ref: 'JSV-2026-0013', cat: 'DRAINAGE_WATERLOGGING', status: ComplaintStatus.SUBMITTED, prio: Priority.MEDIUM, desc: 'बरेडीह प्राथमिक विद्यालय के सामने नाली ओवरफ्लो हो रही है।', descEn: 'Drain overflowing in front of Baredih Primary School.', lat: 23.2218, lng: 85.6795, gp: gpList[1].id, vil: villages[3].id, dept: deptPRI.id, name: 'Dinesh Lohra', days: 1 },
    { ref: 'JSV-2026-0014', cat: 'DRINKING_WATER', status: ComplaintStatus.RESOLVED, prio: Priority.HIGH, desc: 'पिठोरिया स्कूल हैंडपंप का पाइप टूट गया था।', descEn: 'Pithoria school handpump riser pipe was broken.', lat: 23.5143, lng: 85.3019, gp: gpList[3].id, vil: villages[5].id, dept: deptDWSD.id, name: 'Rekha Devi', days: 16 },
    { ref: 'JSV-2026-0015', cat: 'DAMAGED_ROAD', status: ComplaintStatus.ACTION_APPROVED, prio: Priority.HIGH, desc: 'बरेडीह से सोनाहातू मोड़ तक सड़क पर बड़े गड्ढे हो गए हैं।', descEn: 'Large potholes on road from Baredih to Sonahatu turn.', lat: 23.2195, lng: 85.6812, gp: gpList[1].id, vil: villages[3].id, dept: deptRWD.id, name: 'Gopal Mahto', days: 10 },
    { ref: 'JSV-2026-0016', cat: 'INCOMPLETE_CONSTRUCTION', status: ComplaintStatus.REFERRED_FOR_INQUIRY, prio: Priority.HIGH, desc: 'बरेडीह चेक डैम निर्माण कार्य 6 महीने से रुका हुआ है।', descEn: 'Baredih check dam construction halted for 6 months.', lat: 23.2214, lng: 85.6792, gp: gpList[1].id, vil: villages[3].id, dept: deptMGNREGA.id, name: 'Harish Munda', days: 18 },
    { ref: 'JSV-2026-0017', cat: 'STREETLIGHT', status: ComplaintStatus.RESOLVED, prio: Priority.LOW, desc: 'चुटूपालू चौक स्ट्रीटलाइट बंद थी।', descEn: 'Chutupalu Chowk streetlight was off.', lat: 23.4855, lng: 85.4622, gp: gpList[0].id, vil: villages[0].id, dept: deptULB.id, name: 'Santosh Yadav', days: 15 },
    { ref: 'JSV-2026-0018', cat: 'BROKEN_CULVERT_BRIDGE', status: ComplaintStatus.REINSPECTION_REQUESTED, prio: Priority.URGENT, desc: 'सोनाहातू नाला पुलिया की रेलिंग टूट गई है।', descEn: 'Railing of Sonahatu Nala culvert is broken.', lat: 23.2145, lng: 85.6842, gp: gpList[1].id, vil: villages[2].id, dept: deptRWD.id, name: 'Lakshmi Devi', days: 13 },
    { ref: 'JSV-2026-0019', cat: 'OTHER_INFRASTRUCTURE', status: ComplaintStatus.MANUAL_TRIAGE, prio: Priority.LOW, desc: 'पिठोरिया यात्री शेड की बेंच टूटी हुई है।', descEn: 'Passenger shed bench broken in Pithoria.', lat: 23.5125, lng: 85.3025, gp: gpList[3].id, vil: villages[5].id, dept: null, name: 'Manoj Toppo', days: 4 },
    { ref: 'JSV-2026-0020', cat: 'DRINKING_WATER', status: ComplaintStatus.INSPECTION_SCHEDULED, prio: Priority.HIGH, desc: 'तमाड़ सोलर जल मीनार की मोटर पिछले सप्ताह से खराब है।', descEn: 'Motor of Tamar solar water tank is faulty since last week.', lat: 23.0663, lng: 85.6533, gp: gpList[2].id, vil: villages[4].id, dept: deptDWSD.id, name: 'Raju Swansi', days: 6 },
  ];

  for (const c of additionalComplaints) {
    await prisma.complaint.create({
      data: {
        referenceNumber: c.ref,
        category: c.cat,
        status: c.status,
        priority: c.prio,
        description: c.desc,
        descriptionEn: c.descEn,
        language: 'hi',
        lat: c.lat,
        lng: c.lng,
        gramPanchayatId: c.gp,
        villageId: c.vil,
        citizenName: c.name,
        citizenPhone: '9876599999',
        suggestedDeptId: c.dept,
        assignedDeptId: c.dept,
        assignedOfficerId: c.dept ? reviewingOfficer.id : null,
        reviewingOfficerId: c.dept ? reviewingOfficer.id : null,
        approvingOfficerId: approvingOfficer.id,
        inManualTriage: c.status === ComplaintStatus.MANUAL_TRIAGE,
        aiSummary: c.descEn,
        createdAt: daysAgo(c.days),
      },
    });
  }

  console.log('Seed completed: 5 Gram Panchayats, 5 Departments, 6 Users (5 roles), 10 Projects, 20 Complaints.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

