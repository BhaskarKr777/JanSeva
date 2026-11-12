import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import exifr from 'exifr';
import sharp from 'sharp';

export interface ForensicSignals {
  fileExists: boolean;
  fileSizeBytes: number;
  sha256: string | null;
  duplicateFilesFound: string[];
  format?: string;
  width?: number;
  height?: number;
  hasExif: boolean;
  cameraMake?: string;
  cameraModel?: string;
  softwareTag?: string;
  capturedAt?: string;
  exifGps?: { lat: number; lng: number } | null;
  elaMeanDiff?: number;
  elaStdDev?: number;
  elaMaxBlockDiff?: number;
  elaAnomalyRatio?: number;
  suspiciousIndicators: string[];
  authenticIndicators: string[];
  forensicScore: number; // 0 = clearly manipulated/fake, 1 = high confidence authentic
  verdict: 'LIKELY_AUTHENTIC' | 'POTENTIALLY_MANIPULATED' | 'INSUFFICIENT_DATA';
}

const EDITING_OR_AI_SOFTWARE = [
  'photoshop',
  'gimp',
  'lightroom',
  'canva',
  'picsart',
  'snapseed',
  'affinity',
  'pixelmator',
  'midjourney',
  'dall-e',
  'stable diffusion',
  'comfyui',
  'automatic1111',
  'imagen',
  'firefly',
  'ai generated',
  'remaker',
  'faceapp',
  'remini',
];

function collectUploadFiles(dir: string, results: string[] = []): string[] {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectUploadFiles(full, results);
    } else {
      results.push(full);
    }
  }
  return results;
}

export async function runLocalImageForensics(fileUrl: string): Promise<ForensicSignals> {
  const diskPath = fileUrl.startsWith('/')
    ? path.join(process.cwd(), 'public', fileUrl.replace(/^\/+/, ''))
    : path.resolve(fileUrl);

  const suspiciousIndicators: string[] = [];
  const authenticIndicators: string[] = [];

  if (!fs.existsSync(diskPath)) {
    return {
      fileExists: false,
      fileSizeBytes: 0,
      sha256: null,
      duplicateFilesFound: [],
      hasExif: false,
      suspiciousIndicators: ['Image file not found on server disk at ' + fileUrl],
      authenticIndicators: [],
      forensicScore: 0.3,
      verdict: 'INSUFFICIENT_DATA',
    };
  }

  const buffer = fs.readFileSync(diskPath);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

  // 1. Check for exact duplicate/recycled photo in public/uploads
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  const duplicateFilesFound: string[] = [];
  for (const candidate of collectUploadFiles(uploadsDir)) {
    if (path.resolve(candidate) === path.resolve(diskPath)) continue;
    try {
      const candHash = crypto.createHash('sha256').update(fs.readFileSync(candidate)).digest('hex');
      if (candHash === sha256) {
        duplicateFilesFound.push(path.relative(path.join(process.cwd(), 'public'), candidate).replace(/\\/g, '/'));
      }
    } catch {
      // ignore unreadable files
    }
  }
  if (duplicateFilesFound.length > 0) {
    suspiciousIndicators.push(
      `Exact binary duplicate detected in ${duplicateFilesFound.length} other upload(s): ${duplicateFilesFound.slice(0, 2).join(', ')} (possible recycled evidence photo).`
    );
  }

  // 2. Parse EXIF / XMP / IPTC metadata
  let hasExif = false;
  let cameraMake: string | undefined;
  let cameraModel: string | undefined;
  let softwareTag: string | undefined;
  let capturedAt: string | undefined;
  let exifGps: { lat: number; lng: number } | null = null;

  try {
    const exif = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      gps: true,
      xmp: true,
      iptc: true,
    });

    if (exif && Object.keys(exif).length > 0) {
      hasExif = true;
      cameraMake = exif.Make ? String(exif.Make).trim() : undefined;
      cameraModel = exif.Model ? String(exif.Model).trim() : undefined;
      softwareTag = exif.Software || exif.CreatorTool || exif.ProcessingSoftware
        ? String(exif.Software || exif.CreatorTool || exif.ProcessingSoftware).trim()
        : undefined;
      if (exif.DateTimeOriginal instanceof Date) {
        capturedAt = exif.DateTimeOriginal.toISOString();
      } else if (exif.CreateDate instanceof Date) {
        capturedAt = exif.CreateDate.toISOString();
      }
      if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
        exifGps = { lat: exif.latitude, lng: exif.longitude };
        authenticIndicators.push(
          `Embedded EXIF GPS coordinates present (${exif.latitude.toFixed(5)}, ${exif.longitude.toFixed(5)}).`
        );
      }
      if (cameraMake || cameraModel) {
        authenticIndicators.push(`Camera hardware signature present: ${[cameraMake, cameraModel].filter(Boolean).join(' ')}.`);
      }
      if (softwareTag) {
        const lowerSw = softwareTag.toLowerCase();
        const matchedTool = EDITING_OR_AI_SOFTWARE.find((t) => lowerSw.includes(t));
        if (matchedTool) {
          suspiciousIndicators.push(`Image metadata Software tag indicates editing/AI tool: "${softwareTag}".`);
        } else {
          authenticIndicators.push(`Processing software tag: "${softwareTag}".`);
        }
      }
    } else {
      suspiciousIndicators.push('No EXIF camera metadata found (stripped, screenshot, downloaded, or AI-generated image).');
    }
  } catch {
    suspiciousIndicators.push('Could not parse EXIF metadata container.');
  }

  // Also scan raw XMP/text chunks for AI generator watermarks (C2PA / Stable Diffusion parameters / Midjourney)
  const rawAscii = buffer.toString('latin1', 0, Math.min(buffer.length, 65536)).toLowerCase();
  for (const marker of ['c2pa', 'midjourney', 'dall-e', 'stable diffusion', 'steps:', 'cfg scale:', 'adobe photoshop', 'canva']) {
    if (rawAscii.includes(marker)) {
      suspiciousIndicators.push(`Embedded file header/chunk contains "${marker}" signature.`);
      break;
    }
  }

  // 3. Sharp Image Structure & Error Level Analysis (ELA)
  let format: string | undefined;
  let width: number | undefined;
  let height: number | undefined;
  let elaMeanDiff: number | undefined;
  let elaStdDev: number | undefined;
  let elaMaxBlockDiff: number | undefined;
  let elaAnomalyRatio: number | undefined;

  try {
    const meta = await sharp(buffer).metadata();
    format = meta.format;
    width = meta.width;
    height = meta.height;

    if (width && height) {
      if (width < 320 || height < 240) {
        suspiciousIndicators.push(`Very low resolution (${width}x${height}px) — insufficient detail for site verification.`);
      } else {
        authenticIndicators.push(`Valid image dimensions: ${width}x${height}px (${format?.toUpperCase()}).`);
      }
    }

    // Resize to max 512px wide for fast, deterministic Error Level Analysis
    const targetWidth = Math.min(width || 512, 512);
    const origRaw = await sharp(buffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const recompressedJpeg = await sharp(buffer)
      .resize({ width: targetWidth, withoutEnlargement: true })
      .removeAlpha()
      .jpeg({ quality: 90 })
      .toBuffer();

    const recompRaw = await sharp(recompressedJpeg)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const w = origRaw.info.width;
    const h = origRaw.info.height;
    const ch = origRaw.info.channels;
    const len = Math.min(origRaw.data.length, recompRaw.data.length);

    let totalDiff = 0;
    const pixelCount = Math.floor(len / ch);
    const blockSize = 16;
    const blockMeans: number[] = [];

    for (let by = 0; by + blockSize <= h; by += blockSize) {
      for (let bx = 0; bx + blockSize <= w; bx += blockSize) {
        let blockSum = 0;
        let blockPixels = 0;
        for (let y = by; y < by + blockSize; y++) {
          for (let x = bx; x < bx + blockSize; x++) {
            const idx = (y * w + x) * ch;
            if (idx + 2 < len) {
              const d =
                (Math.abs(origRaw.data[idx] - recompRaw.data[idx]) +
                  Math.abs(origRaw.data[idx + 1] - recompRaw.data[idx + 1]) +
                  Math.abs(origRaw.data[idx + 2] - recompRaw.data[idx + 2])) /
                3;
              blockSum += d;
              blockPixels++;
            }
          }
        }
        if (blockPixels > 0) blockMeans.push(blockSum / blockPixels);
      }
    }

    for (let i = 0; i < len; i += ch) {
      totalDiff +=
        (Math.abs(origRaw.data[i] - recompRaw.data[i]) +
          Math.abs(origRaw.data[i + 1] - recompRaw.data[i + 1]) +
          Math.abs(origRaw.data[i + 2] - recompRaw.data[i + 2])) /
        3;
    }

    elaMeanDiff = Number((totalDiff / Math.max(1, pixelCount)).toFixed(3));

    if (blockMeans.length > 0) {
      const meanB = blockMeans.reduce((a, b) => a + b, 0) / blockMeans.length;
      const variance = blockMeans.reduce((a, b) => a + (b - meanB) ** 2, 0) / blockMeans.length;
      elaStdDev = Number(Math.sqrt(variance).toFixed(3));
      elaMaxBlockDiff = Number(Math.max(...blockMeans).toFixed(3));
      const threshold = meanB + 3 * Math.max(elaStdDev, 0.5);
      const anomalousBlocks = blockMeans.filter((m) => m > threshold).length;
      elaAnomalyRatio = Number((anomalousBlocks / blockMeans.length).toFixed(3));

      if (elaMaxBlockDiff > meanB * 4.5 && elaAnomalyRatio > 0.02) {
        suspiciousIndicators.push(
          `Error Level Analysis (ELA) detected localized compression anomaly (max block residual ${elaMaxBlockDiff} vs mean ${meanB.toFixed(2)}; ${(elaAnomalyRatio * 100).toFixed(1)}% outlier blocks) — possible splice or edited region.`
        );
      } else {
        authenticIndicators.push(
          `Error Level Analysis (ELA) compression residual is uniform (mean ${elaMeanDiff}, std-dev ${elaStdDev}).`
        );
      }
    }
  } catch (err) {
    suspiciousIndicators.push(`Pixel/ELA inspection failed: ${err instanceof Error ? err.message : 'corrupt image'}`);
  }

  // 4. Compute Forensic Score & Verdict
  let score = 0.65;
  if (hasExif) score += 0.12;
  if (cameraMake || cameraModel) score += 0.10;
  if (exifGps) score += 0.08;
  if (elaMeanDiff !== undefined && !(elaMaxBlockDiff && elaMeanDiff && elaMaxBlockDiff > elaMeanDiff * 4.5 && (elaAnomalyRatio || 0) > 0.02)) {
    score += 0.05;
  }

  if (!hasExif) score -= 0.18;
  if (duplicateFilesFound.length > 0) score -= 0.35;
  if (softwareTag && EDITING_OR_AI_SOFTWARE.some((t) => softwareTag!.toLowerCase().includes(t))) {
    score -= 0.40;
  }
  if (suspiciousIndicators.some((s) => s.includes('ELA') || s.includes('header/chunk'))) {
    score -= 0.30;
  }

  score = Number(Math.min(0.98, Math.max(0.05, score)).toFixed(2));

  let verdict: ForensicSignals['verdict'] = 'INSUFFICIENT_DATA';
  if (
    duplicateFilesFound.length > 0 ||
    (softwareTag && EDITING_OR_AI_SOFTWARE.some((t) => softwareTag!.toLowerCase().includes(t))) ||
    suspiciousIndicators.some((s) => s.includes('ELA') || s.includes('header/chunk')) ||
    score < 0.45
  ) {
    verdict = 'POTENTIALLY_MANIPULATED';
  } else if (score >= 0.72 && hasExif) {
    verdict = 'LIKELY_AUTHENTIC';
  } else {
    verdict = 'INSUFFICIENT_DATA';
  }

  return {
    fileExists: true,
    fileSizeBytes: buffer.length,
    sha256,
    duplicateFilesFound,
    format,
    width,
    height,
    hasExif,
    cameraMake,
    cameraModel,
    softwareTag,
    capturedAt,
    exifGps,
    elaMeanDiff,
    elaStdDev,
    elaMaxBlockDiff,
    elaAnomalyRatio,
    suspiciousIndicators,
    authenticIndicators,
    forensicScore: score,
    verdict,
  };
}

