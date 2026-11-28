import { GradeKatrolEntry, KatrolMethod, Student } from '../types';

export interface KatrolComputeOptions {
  students: Student[];
  rawScores: Record<string, string>;
  manualOverrides: Record<string, string>;
  notes: Record<string, string>;
  method: KatrolMethod;
  kkm: number;
  targetMin: number;
  targetMax: number;
  addPoints: number;
  boostPercent: number;
  roundDigits: 0 | 1 | 2;
  neverLowerThanRaw: boolean;
}

export interface ComputedKatrolRow {
  student: Student;
  rawScore: number | null;
  computedScore: number | null;
  manualOverride: number | null;
  finalScore: number | null;
  diff: number | null;
  isPassedRaw: boolean | null;
  isPassedFinal: boolean | null;
  predicate: string;
  predicateLabel: string;
  note: string;
}

export interface KatrolSummaryStats {
  totalStudents: number;
  gradedCount: number;
  rawAvg: number | null;
  rawMin: number | null;
  rawMax: number | null;
  rawPassedCount: number;
  rawPassRate: number;
  finalAvg: number | null;
  finalMin: number | null;
  finalMax: number | null;
  finalPassedCount: number;
  finalPassRate: number;
  avgGain: number | null;
}

export function parseScoreInput(val: string | number | null | undefined): number | null {
  if (val === null || val === undefined) return null;
  const normalized = String(val).trim().replace(',', '.');
  if (!normalized) return null;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.max(0, Math.min(100, num));
}

export function roundScore(val: number, digits: 0 | 1 | 2): number {
  const factor = Math.pow(10, digits);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

export function formatScoreDisplay(val: number | null | undefined, digits: 0 | 1 | 2): string {
  if (val === null || val === undefined || !Number.isFinite(val)) return '-';
  return digits === 0 ? String(Math.round(val)) : val.toFixed(digits);
}

export function getGradePredicate(score: number | null, kkm: number): { code: string; label: string } {
  if (score === null || !Number.isFinite(score)) {
    return { code: '-', label: 'Belum Dinilai' };
  }
  if (score >= 90) return { code: 'A', label: 'Sangat Baik' };
  if (score >= Math.max(80, kkm + 5)) return { code: 'B', label: 'Baik' };
  if (score >= kkm) return { code: 'C', label: 'Tuntas (Cukup)' };
  return { code: 'D', label: 'Belum Tuntas' };
}

export function computeKatrolGrades(opts: KatrolComputeOptions): {
  rows: ComputedKatrolRow[];
  stats: KatrolSummaryStats;
  entries: GradeKatrolEntry[];
} {
  const sortedStudents = [...opts.students].sort((a, b) =>
    a.name.localeCompare(b.name, 'id', { sensitivity: 'base' })
  );

  const rawValues: number[] = [];
  const parsedRawMap: Record<string, number | null> = {};
  sortedStudents.forEach((st) => {
    const parsed = parseScoreInput(opts.rawScores[st.id]);
    parsedRawMap[st.id] = parsed;
    if (parsed !== null) {
      rawValues.push(parsed);
    }
  });

  const minRaw = rawValues.length > 0 ? Math.min(...rawValues) : 0;
  const maxRaw = rawValues.length > 0 ? Math.max(...rawValues) : 100;
  const safeTargetMin = Math.max(0, Math.min(100, Number(opts.targetMin) || 0));
  const safeTargetMax = Math.max(safeTargetMin, Math.min(100, Number(opts.targetMax) || 100));
  const safeKkm = Math.max(0, Math.min(100, Number(opts.kkm) || 0));
  const safeAddPoints = Number(opts.addPoints) || 0;
  const safeBoostPercent = Number(opts.boostPercent) || 0;

  const rows: ComputedKatrolRow[] = sortedStudents.map((st) => {
    const rawScore = parsedRawMap[st.id];
    const manualOverride = parseScoreInput(opts.manualOverrides[st.id]);
    const note = (opts.notes[st.id] || '').trim();

    let computedScore: number | null = null;
    if (rawScore !== null) {
      let scaled = rawScore;
      switch (opts.method) {
        case 'linear': {
          if (rawValues.length <= 1 || maxRaw === minRaw) {
            scaled = Math.max(rawScore, safeTargetMin);
          } else {
            scaled =
              safeTargetMin +
              ((rawScore - minRaw) / (maxRaw - minRaw)) * (safeTargetMax - safeTargetMin);
          }
          break;
        }
        case 'kkm_floor': {
          scaled = rawScore < safeTargetMin ? safeTargetMin : rawScore;
          break;
        }
        case 'add_points': {
          scaled = Math.min(safeTargetMax, rawScore + safeAddPoints);
          break;
        }
        case 'percentage': {
          scaled = Math.min(safeTargetMax, rawScore * (1 + safeBoostPercent / 100));
          break;
        }
        case 'sqrt': {
          scaled = Math.sqrt(Math.max(0, rawScore) / 100) * 100;
          if (scaled > safeTargetMax) {
            scaled = safeTargetMax;
          }
          break;
        }
      }

      if (opts.neverLowerThanRaw && scaled < rawScore) {
        scaled = rawScore;
      }

      scaled = Math.max(0, Math.min(100, scaled));
      computedScore = roundScore(scaled, opts.roundDigits);
    }

    const finalScore =
      manualOverride !== null
        ? roundScore(Math.max(0, Math.min(100, manualOverride)), opts.roundDigits)
        : computedScore;

    const diff =
      rawScore !== null && finalScore !== null
        ? roundScore(finalScore - rawScore, opts.roundDigits)
        : null;

    const isPassedRaw = rawScore !== null ? rawScore >= safeKkm : null;
    const isPassedFinal = finalScore !== null ? finalScore >= safeKkm : null;
    const pred = getGradePredicate(finalScore, safeKkm);

    return {
      student: st,
      rawScore,
      computedScore,
      manualOverride,
      finalScore,
      diff,
      isPassedRaw,
      isPassedFinal,
      predicate: pred.code,
      predicateLabel: pred.label,
      note,
    };
  });

  const gradedRows = rows.filter((r) => r.rawScore !== null && r.finalScore !== null);
  const finalValues = rows
    .map((r) => r.finalScore)
    .filter((v): v is number => v !== null);

  const rawAvg =
    rawValues.length > 0
      ? roundScore(rawValues.reduce((a, b) => a + b, 0) / rawValues.length, 1)
      : null;
  const finalAvg =
    finalValues.length > 0
      ? roundScore(finalValues.reduce((a, b) => a + b, 0) / finalValues.length, 1)
      : null;

  const rawPassedCount = gradedRows.filter((r) => r.isPassedRaw).length;
  const finalPassedCount = rows.filter((r) => r.isPassedFinal).length;
  const denom = Math.max(1, gradedRows.length || finalValues.length);

  const stats: KatrolSummaryStats = {
    totalStudents: sortedStudents.length,
    gradedCount: gradedRows.length,
    rawAvg,
    rawMin: rawValues.length > 0 ? Math.min(...rawValues) : null,
    rawMax: rawValues.length > 0 ? Math.max(...rawValues) : null,
    rawPassedCount,
    rawPassRate: gradedRows.length > 0 ? Math.round((rawPassedCount / denom) * 100) : 0,
    finalAvg,
    finalMin: finalValues.length > 0 ? Math.min(...finalValues) : null,
    finalMax: finalValues.length > 0 ? Math.max(...finalValues) : null,
    finalPassedCount,
    finalPassRate: finalValues.length > 0 ? Math.round((finalPassedCount / denom) * 100) : 0,
    avgGain:
      rawAvg !== null && finalAvg !== null ? roundScore(finalAvg - rawAvg, 1) : null,
  };

  const entries: GradeKatrolEntry[] = rows.map((r) => ({
    studentId: r.student.id,
    nis: r.student.nis,
    nisn: r.student.nisn,
    studentName: r.student.name,
    gender: r.student.gender,
    rawScore: r.rawScore,
    manualOverride: r.manualOverride,
    finalScore: r.finalScore,
    note: r.note || undefined,
  }));

  return { rows, stats, entries };
}
