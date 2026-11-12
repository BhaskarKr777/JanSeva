// Real Local ML Utilities: TF-IDF Cosine Similarity + Bilingual Log-Odds Classifier
// Used alongside LLM (Gemini/OpenAI) or as an offline ML engine when no external API key is set.

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 2);
}

/**
 * Compute TF-IDF cosine similarity between two texts against a corpus of documents.
 * Returns a real similarity score in [0, 1].
 */
export function computeTfIdfSimilarity(
  queryText: string,
  candidateText: string,
  corpus: string[]
): number {
  const qTokens = tokenize(queryText);
  const cTokens = tokenize(candidateText);
  if (qTokens.length === 0 || cTokens.length === 0) return 0;

  const allDocs = [queryText, candidateText, ...corpus].map(tokenize);
  const N = allDocs.length;

  const vocab = new Set([...qTokens, ...cTokens]);
  const df = new Map<string, number>();
  for (const term of vocab) {
    let count = 0;
    for (const doc of allDocs) {
      if (doc.includes(term)) count++;
    }
    df.set(term, count);
  }

  const buildVec = (tokens: string[]) => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    const vec = new Map<string, number>();
    for (const term of vocab) {
      const freq = tf.get(term) || 0;
      if (freq > 0) {
        const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1)) + 1;
        vec.set(term, (freq / tokens.length) * idf);
      }
    }
    return vec;
  };

  const v1 = buildVec(qTokens);
  const v2 = buildVec(cTokens);

  let dot = 0;
  let norm1 = 0;
  let norm2 = 0;
  for (const term of vocab) {
    const a = v1.get(term) || 0;
    const b = v2.get(term) || 0;
    dot += a * b;
    norm1 += a * a;
    norm2 += b * b;
  }

  if (norm1 === 0 || norm2 === 0) return 0;
  return Number((dot / (Math.sqrt(norm1) * Math.sqrt(norm2))).toFixed(3));
}

const DEPT_TRAINING_WEIGHTS: Record<string, Record<string, number>> = {
  RWD: {
    सड़क: 3.2, रोड: 3.0, पुलिया: 3.1, पुल: 2.8, गड्ढा: 2.5, गड्ढे: 2.5, डामर: 2.9,
    टूटी: 2.0, टूट: 2.0, पीसीसी: 2.8, road: 3.2, pcc: 2.9, bitumen: 3.0, culvert: 3.1,
    bridge: 2.8, pothole: 2.6, cracked: 2.1, asphalt: 2.8,
  },
  DWSD: {
    पानी: 2.5, पेयजल: 3.4, हैंडपंप: 3.5, चापाकल: 3.5, नल: 2.9, टंकी: 2.8, बोरिंग: 2.7,
    जल: 2.3, सूखा: 2.2, handpump: 3.5, drinking: 3.2, water: 2.5, borewell: 3.0,
    pipeline: 2.6, contaminated: 2.7, tap: 2.5,
  },
  MGNREGA: {
    मनरेगा: 3.8, तालाब: 3.2, डोभा: 3.3, नहर: 2.8, कुआं: 2.9, मेड़: 2.7, मिट्टी: 2.2,
    mgnrega: 3.8, pond: 3.2, check: 2.2, dam: 2.5, earthwork: 3.0, excavation: 2.8,
    well: 2.4, depth: 2.3,
  },
  PRI: {
    नाली: 3.2, जलभराव: 3.0, पंचायत: 3.1, स्ट्रीट: 2.9, लाइट: 2.8, खंभा: 2.6, भवन: 2.5,
    आंगनबाड़ी: 2.8, स्कूल: 2.4, drainage: 3.2, drain: 3.1, waterlogging: 3.0,
    streetlight: 3.2, lamp: 2.6, panchayat: 3.0, building: 2.5,
  },
  ULB: {
    नगर: 3.2, कचरा: 3.1, वार्ड: 2.8, सीवर: 3.0, municipal: 3.2, garbage: 3.0,
    sewer: 3.0, urban: 2.8,
  },
};

export function classifyDepartmentML(description: string, category: string): {
  deptCode: string;
  confidence: number;
  scores: Record<string, number>;
} {
  const tokens = tokenize(description);
  const scores: Record<string, number> = {
    RWD: 0.2,
    DWSD: 0.2,
    MGNREGA: 0.15,
    PRI: 0.25,
    ULB: 0.1,
  };

  // Category prior
  if (['DAMAGED_ROAD', 'POOR_QUALITY', 'BROKEN_CULVERT_BRIDGE'].includes(category)) scores.RWD += 2.2;
  if (category === 'DRINKING_WATER') scores.DWSD += 2.8;
  if (['DRAINAGE_WATERLOGGING', 'STREETLIGHT', 'PUBLIC_BUILDING'].includes(category)) scores.PRI += 2.0;

  // Token log-odds accumulation
  for (const [dept, weights] of Object.entries(DEPT_TRAINING_WEIGHTS)) {
    for (const token of tokens) {
      for (const [kw, w] of Object.entries(weights)) {
        if (token.includes(kw) || kw.includes(token)) {
          scores[dept] += w;
        }
      }
    }
  }

  // Softmax probability
  const maxS = Math.max(...Object.values(scores));
  const expScores: Record<string, number> = {};
  let sumExp = 0;
  for (const [k, v] of Object.entries(scores)) {
    const e = Math.exp(v - maxS);
    expScores[k] = e;
    sumExp += e;
  }

  let bestDept = 'PRI';
  let bestProb = 0;
  const probs: Record<string, number> = {};
  for (const [k, e] of Object.entries(expScores)) {
    const p = Number((e / sumExp).toFixed(3));
    probs[k] = p;
    if (p > bestProb) {
      bestProb = p;
      bestDept = k;
    }
  }

  return {
    deptCode: bestDept,
    confidence: bestProb,
    scores: probs,
  };
}

