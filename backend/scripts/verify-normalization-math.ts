/**
 * Standalone Math Verification Script for Dogfood Normalization Engine
 * 
 * Verifies:
 * 1. Standard Judge (N >= 3 with variance)
 * 2. Single-Evaluation Judge (N = 1) -> tests Bayesian Shrinkage & div-by-zero guard
 * 3. Zero-Variance Judge (N = 4, identical scores) -> tests Zero-Variance fallback
 * 4. Harsh Small-Sample Judge (N = 2, low scores) -> tests Bayesian Shrinkage on small samples
 * 
 * Prints all intermediate mathematical values for transparent auditing.
 */

interface ScoreEntry {
  evalId: string;
  judgeId: string;
  projectId: string;
  rawScore: number;
}

const mockEvaluations: ScoreEntry[] = [
  // Judge 1: Standard judge with 5 diverse evaluations
  { evalId: 'e1', judgeId: 'judge-1-standard', projectId: 'p1', rawScore: 60 },
  { evalId: 'e2', judgeId: 'judge-1-standard', projectId: 'p2', rawScore: 70 },
  { evalId: 'e3', judgeId: 'judge-1-standard', projectId: 'p3', rawScore: 80 },
  { evalId: 'e4', judgeId: 'judge-1-standard', projectId: 'p4', rawScore: 85 },
  { evalId: 'e5', judgeId: 'judge-1-standard', projectId: 'p5', rawScore: 95 },

  // Judge 2: Evaluated only 1 project (N = 1) - Potential Div-by-Zero
  { evalId: 'e6', judgeId: 'judge-2-single', projectId: 'p2', rawScore: 90 },

  // Judge 3: Zero variance across 4 evaluations (s = 0)
  { evalId: 'e7', judgeId: 'judge-3-zero-var', projectId: 'p1', rawScore: 75 },
  { evalId: 'e8', judgeId: 'judge-3-zero-var', projectId: 'p2', rawScore: 75 },
  { evalId: 'e9', judgeId: 'judge-3-zero-var', projectId: 'p3', rawScore: 75 },
  { evalId: 'e10', judgeId: 'judge-3-zero-var', projectId: 'p4', rawScore: 75 },

  // Judge 4: Small sample (N = 2), harsh scores
  { evalId: 'e11', judgeId: 'judge-4-small-harsh', projectId: 'p3', rawScore: 45 },
  { evalId: 'e12', judgeId: 'judge-4-small-harsh', projectId: 'p5', rawScore: 55 },
];

function runVerification() {
  console.log('='.repeat(80));
  console.log('DOGFOOD NORMALIZATION ENGINE: MATHEMATICAL VERIFICATION & STRESS TEST');
  console.log('='.repeat(80));

  const allScores = mockEvaluations.map((e) => e.rawScore);
  const globalMean = allScores.reduce((a, b) => a + b, 0) / allScores.length;
  const globalVariance =
    allScores.reduce((sum, s) => sum + Math.pow(s - globalMean, 2), 0) / (allScores.length - 1);
  const globalStdDev = Math.sqrt(globalVariance);

  console.log('\n[1] GLOBAL POPULATION BENCHMARKS:');
  console.log(`    Total Evaluations (N_global):  ${allScores.length}`);
  console.log(`    Global Mean (mu_global):        ${globalMean.toFixed(4)}`);
  console.log(`    Global Variance (s^2_global):   ${globalVariance.toFixed(4)}`);
  console.log(`    Global StdDev (sigma_global):   ${globalStdDev.toFixed(4)}`);

  // Group by judge
  const judgeGroups = new Map<string, ScoreEntry[]>();
  for (const entry of mockEvaluations) {
    const list = judgeGroups.get(entry.judgeId) || [];
    list.push(entry);
    judgeGroups.set(entry.judgeId, list);
  }

  let anomaliesFound = 0;

  console.log('\n[2] PER-JUDGE PARAMETERS & SHRINKAGE TRANSFORMATIONS:');
  console.log('-'.repeat(80));

  for (const [judgeId, evals] of judgeGroups.entries()) {
    const N = evals.length;
    const scores = evals.map((e) => e.rawScore);
    const rawMean = scores.reduce((a, b) => a + b, 0) / N;
    const rawVariance =
      N > 1 ? scores.reduce((sum, s) => sum + Math.pow(s - rawMean, 2), 0) / (N - 1) : 0;
    const rawStdDev = Math.sqrt(rawVariance);

    let adjustedMean = rawMean;
    let adjustedStdDev = rawStdDev;
    let isZeroVariance = rawStdDev === 0;
    let isBayesianShrunk = false;

    console.log(`\n  Judge: ${judgeId} (N = ${N})`);
    console.log(`    Raw Scores:         [${scores.join(', ')}]`);
    console.log(`    Raw Mean (x_bar):   ${rawMean.toFixed(4)}`);
    console.log(`    Raw Variance (s^2): ${rawVariance.toFixed(4)}`);
    console.log(`    Raw StdDev (s):     ${rawStdDev.toFixed(4)}`);

    if (N < 3) {
      // Empirical Bayes Shrinkage (k = 3)
      const k = 3;
      adjustedMean = (N * rawMean + k * globalMean) / (N + k);
      const combinedVariance =
        (Math.max(0, N - 1) * rawVariance +
          k * globalVariance +
          ((N * k) / (N + k)) * Math.pow(rawMean - globalMean, 2)) /
        (N + k - 1);
      adjustedStdDev = Math.sqrt(combinedVariance) || globalStdDev;
      isBayesianShrunk = true;

      console.log(`    --> Applied Empirical Bayes Shrinkage (k = 3):`);
      console.log(`        Shrunk Mean (mu*):      ${adjustedMean.toFixed(4)} (pulled from ${rawMean.toFixed(2)} towards global ${globalMean.toFixed(2)})`);
      console.log(`        Shrunk Variance (s^2*): ${combinedVariance.toFixed(4)}`);
      console.log(`        Shrunk StdDev (sigma*): ${adjustedStdDev.toFixed(4)}`);
    } else if (isZeroVariance) {
      // Zero-Variance Fallback
      adjustedStdDev = globalStdDev;
      console.log(`    --> Zero-Variance Detected (s = 0):`);
      console.log(`        Applied Global StdDev Fallback: sigma* = ${adjustedStdDev.toFixed(4)}`);
    }

    // Safety Audits
    if (isNaN(adjustedMean) || !isFinite(adjustedMean)) {
      console.error(`    [!] CRITICAL ERROR: adjustedMean is NaN or Infinite!`);
      anomaliesFound++;
    }
    if (isNaN(adjustedStdDev) || !isFinite(adjustedStdDev) || adjustedStdDev <= 0) {
      console.error(`    [!] CRITICAL ERROR: adjustedStdDev is invalid: ${adjustedStdDev}`);
      anomaliesFound++;
    }

    console.log(`    Final Normalization Outputs per Evaluation:`);
    for (const e of evals) {
      const zRaw = (e.rawScore - adjustedMean) / (adjustedStdDev || 1);
      const zClamped = Math.max(-3.0, Math.min(3.0, zRaw));
      const rescaled = Math.max(0, Math.min(100, 70 + 15 * zClamped));
      const finalScore = parseFloat(rescaled.toFixed(2));

      console.log(
        `      Project ${e.projectId}: Raw=${e.rawScore.toString().padEnd(3)} ` +
        `-> z_raw=${zRaw.toFixed(4).padStart(7)} ` +
        `-> z_clamped=${zClamped.toFixed(4).padStart(7)} ` +
        `-> S_norm=${finalScore.toFixed(2).padStart(6)}/100`
      );

      if (isNaN(zRaw) || !isFinite(zRaw) || isNaN(finalScore) || !isFinite(finalScore)) {
        console.error(`      [!] CRITICAL ERROR: Calculation produced NaN or Infinity!`);
        anomaliesFound++;
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`VERIFICATION SUMMARY: ${anomaliesFound === 0 ? 'ALL CHECKS PASSED (0 Anomalies)' : `${anomaliesFound} ANOMALIES FOUND`}`);
  console.log('='.repeat(80));

  if (anomaliesFound > 0) {
    process.exit(1);
  }
}

runVerification();
