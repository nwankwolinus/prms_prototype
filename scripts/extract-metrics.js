/**
 * scripts/extract-metrics.js
 *
 * Strips TypeScript/JSX via Babel, then runs typhonjs-escomplex
 * against every source file to produce real McCabe CC and
 * Halstead metrics for the Sprint 1 baseline.
 *
 * Usage: node scripts/extract-metrics.js
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");
const babel = require("@babel/core");
const escomplex = require("typhonjs-escomplex");

// Directories to scan — adjust if your structure differs.
const SOURCE_PATTERNS = [
  "app/**/*.ts",
  "app/**/*.tsx",
  "components/**/*.ts",
  "components/**/*.tsx",
  "lib/**/*.ts",
  "models/**/*.ts",
  "services/**/*.ts",
  "utils/**/*.ts",
  "types/**/*.ts",
  "middleware.ts",
];

const results = [];
let grandTotalCC = 0;
let grandTotalFunctions = 0;
let highRiskFunctions = [];

for (const pattern of SOURCE_PATTERNS) {
  const files = glob.sync(pattern, { cwd: process.cwd() });

  for (const relativePath of files) {
    const fullPath = path.join(process.cwd(), relativePath);
    const source = fs.readFileSync(fullPath, "utf8");

    let transpiled;
    try {
      const output = babel.transformSync(source, {
        configFile: path.join(process.cwd(), "babel.metrics.config.js"),
        filename: fullPath, // lets Babel infer .tsx vs .ts handling
      });
      transpiled = output.code;
    } catch (err) {
      console.error(`SKIPPED (Babel parse error): ${relativePath}`);
      console.error(`  ${err.message.split("\n")[0]}`);
      continue;
    }

    let analysis;
    try {
      analysis = escomplex.analyzeModule(transpiled);
    } catch (err) {
      console.error(`SKIPPED (escomplex parse error): ${relativePath}`);
      console.error(`  ${err.message.split("\n")[0]}`);
      continue;
    }

    for (const method of analysis.methods) {
      const name = method.name === "<anonymous>" ? "(anonymous)" : method.name;
      grandTotalCC += method.cyclomatic;
      grandTotalFunctions += 1;

      results.push({
        file:       relativePath,
        function:   name,
        cyclomatic: method.cyclomatic,
        halsteadVolume:     Number(method.halstead.volume.toFixed(2)),
        halsteadDifficulty: Number(method.halstead.difficulty.toFixed(2)),
        halsteadEffort:     Number(method.halstead.effort.toFixed(2)),
      });

      if (method.cyclomatic > 10) {
        highRiskFunctions.push(`${relativePath} :: ${name} (CC=${method.cyclomatic})`);
      }
    }
  }
}

// ── Output ──────────────────────────────────────────────────────────────────

console.log("\n=== SPRINT 1 METRIC EXTRACTION RESULTS ===\n");

const byFile = {};
for (const r of results) {
  byFile[r.file] = byFile[r.file] || [];
  byFile[r.file].push(r);
}

for (const [file, fns] of Object.entries(byFile)) {
  console.log(`\n${file}`);
  for (const fn of fns) {
    console.log(
      `  ${fn.function}()  CC=${fn.cyclomatic}  Vol=${fn.halsteadVolume}  Diff=${fn.halsteadDifficulty}  Effort=${fn.halsteadEffort}`
    );
  }
}

console.log("\n=== SUMMARY ===");
console.log(`Total functions analysed: ${grandTotalFunctions}`);
console.log(`Sum of all method-level CC: ${grandTotalCC}`);
console.log(`Average CC per function: ${(grandTotalCC / grandTotalFunctions).toFixed(2)}`);
console.log(`Functions exceeding CC threshold of 10: ${highRiskFunctions.length}`);

if (highRiskFunctions.length > 0) {
  console.log("\nHIGH-RISK FUNCTIONS (CC > 10):");
  highRiskFunctions.forEach((f) => console.log(`  ⚠ ${f}`));
}

// Save full results as JSON for your dissertation appendix / Chapter 5
// tables. Filename includes a timestamp so each extraction run produces
// a uniquely-named, non-overwriting archive — this was previously
// hardcoded as "sprint1-metrics.json" on every run, which silently
// overwrote prior checkpoints' raw data (Sprint 1's raw JSON was lost
// this way before this fix was applied).
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputFilename = `metrics-extraction-${timestamp}.json`;

// Ensure metrics/raw exists
const outputDir = path.join("metrics", "raw");
fs.mkdirSync(outputDir, { recursive: true });

const outputPath = path.join(outputDir, outputFilename);

fs.writeFileSync(
  outputPath,
  JSON.stringify(
    {
      results,
      summary: {
        totalFunctions: grandTotalFunctions,
        sumCyclomatic: grandTotalCC,
        averageCyclomatic: grandTotalCC / grandTotalFunctions,
        highRiskCount: highRiskFunctions.length,
      },
    },
    null,
    2
  )
);

console.log(`\nFull results saved to ${outputPath}`);