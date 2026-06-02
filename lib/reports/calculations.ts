import { TestResult, TestCatalog } from '@/lib/reports/services';

/**
 * Automatically evaluates formulas defined on test parameters and updates results.
 * Supports formulas like "{lip-tc} / {lip-hdl}" where placeholders match parameter IDs or Names.
 */
export function applyCalculations(
  results: TestResult[],
  selectedTests: TestCatalog[]
): TestResult[] {
  const updated = [...results];
  let changed = false;

  // 1. Gather all parameters from selected tests
  const allParams = selectedTests.flatMap(t => t.parameters || []);
  const paramsWithFormula = allParams.filter(p => p.formula);

  if (paramsWithFormula.length === 0) return results;

  // 2. Resolve calculations iteratively to support dependency chains
  // e.g. VLDL = Triglycerides / 5, and LDL = Total Cholesterol - HDL - VLDL
  const maxIterations = 5;
  for (let iter = 0; iter < maxIterations; iter++) {
    let iterChanged = false;

    for (const param of paramsWithFormula) {
      const formula = param.formula!;
      const placeholderRegex = /\{([^}]+)\}/g;
      let evaluatedFormula = formula;
      let missingValue = false;

      const placeholders = Array.from(formula.matchAll(placeholderRegex));
      for (const match of placeholders) {
        const placeholder = match[1].trim();
        
        // Find the parameter by ID or case-insensitive Name matching
        const targetParam = allParams.find(p => 
          p.id === placeholder || 
          p.name.trim().toLowerCase() === placeholder.toLowerCase()
        );

        if (!targetParam) {
          missingValue = true;
          break;
        }

        const targetResult = updated.find(r => r.parameterId === targetParam.id);
        const numVal = targetResult ? parseFloat(String(targetResult.value)) : NaN;

        if (isNaN(numVal)) {
          missingValue = true;
          break;
        }

        // Replace all occurrences of this placeholder
        evaluatedFormula = evaluatedFormula.replaceAll(match[0], numVal.toString());
      }

      if (missingValue) {
        // If dependent values are missing or invalid, clear the calculated value
        const existingIdx = updated.findIndex(r => r.parameterId === param.id);
        if (existingIdx !== -1 && updated[existingIdx].value !== '') {
          updated[existingIdx] = { ...updated[existingIdx], value: '', isAbnormal: false };
          iterChanged = true;
          changed = true;
        }
        continue;
      }

      // Safe arithmetic calculation
      try {
        // Strict whitelist: only allow digits, decimals, basic operators, brackets, and spaces
        const sanitized = evaluatedFormula.replace(/[^0-9.+\-*/()\s]/g, '');
        
        // Evaluate the sanitized expression safely
        const calculatedVal = new Function(`return (${sanitized})`)();

        if (typeof calculatedVal === 'number' && isFinite(calculatedVal)) {
          // Round to 2 decimal places
          const formattedVal = Math.round(calculatedVal * 100) / 100;
          const valStr = formattedVal.toString();

          const existingIdx = updated.findIndex(r => r.parameterId === param.id);
          if (existingIdx === -1) {
            updated.push({ parameterId: param.id, value: valStr, isAbnormal: false });
            iterChanged = true;
            changed = true;
          } else if (updated[existingIdx].value !== valStr) {
            updated[existingIdx] = { ...updated[existingIdx], value: valStr };
            iterChanged = true;
            changed = true;
          }
        }
      } catch (err) {
        console.error(`[applyCalculations] Error evaluating formula for ${param.name}:`, err);
      }
    }

    if (!iterChanged) break;
  }

  return changed ? updated : results;
}
