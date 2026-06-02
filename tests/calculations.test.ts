import { applyCalculations } from '../lib/reports/calculations';
import { TestCatalog, TestResult } from '../lib/reports/services';

const mockCatalog: TestCatalog[] = [
  {
    id: 't-lipid',
    name: 'Lipid Profile',
    code: 'LIPID',
    category: 'Biochemistry',
    is_active: true,
    description: '',
    parameters: [
      { id: 'lip-tc', name: 'Total Cholesterol', unit: 'mg/dL', normal_range: '<200' },
      { id: 'lip-tg', name: 'Triglycerides', unit: 'mg/dL', normal_range: '<150' },
      { id: 'lip-hdl', name: 'HDL Cholesterol', unit: 'mg/dL', normal_range: '>40' },
      { id: 'lip-vldl', name: 'VLDL Cholesterol', unit: 'mg/dL', normal_range: '<30', formula: '{lip-tg} / 5' },
      { id: 'lip-ldl', name: 'LDL Cholesterol', unit: 'mg/dL', normal_range: '<100', formula: '{lip-tc} - {lip-hdl} - {lip-vldl}' },
      { id: 'lip-ratio', name: 'Total Chol/HDL Ratio', unit: 'ratio', normal_range: '<5.0', formula: '{lip-tc} / {lip-hdl}' }
    ]
  }
];

function runTests() {
  console.log('Running Parameter Calculations Unit Tests...\n');

  // Test Case 1: Simple calculations (VLDL = TG / 5)
  const results1: TestResult[] = [
    { parameterId: 'lip-tg', value: '150' }
  ];
  const calculated1 = applyCalculations(results1, mockCatalog);
  const vldl = calculated1.find(r => r.parameterId === 'lip-vldl');
  
  if (vldl && vldl.value === '30') {
    console.log('✅ Test Case 1 Passed: VLDL successfully calculated from Triglycerides (150 / 5 = 30).');
  } else {
    console.error('❌ Test Case 1 Failed: Expected VLDL to be "30", got:', vldl?.value);
    process.exit(1);
  }

  // Test Case 2: Dependency chain calculations (LDL = TC - HDL - VLDL)
  const results2: TestResult[] = [
    { parameterId: 'lip-tc', value: '200' },
    { parameterId: 'lip-hdl', value: '50' },
    { parameterId: 'lip-tg', value: '150' } // Should calculate VLDL = 30
  ];
  const calculated2 = applyCalculations(results2, mockCatalog);
  const ldl = calculated2.find(r => r.parameterId === 'lip-ldl');
  const ratio = calculated2.find(r => r.parameterId === 'lip-ratio');

  if (ldl && ldl.value === '120') {
    console.log('✅ Test Case 2 Passed: LDL successfully calculated through dependency chain (200 - 50 - 30 = 120).');
  } else {
    console.error('❌ Test Case 2 Failed: Expected LDL to be "120", got:', ldl?.value);
    process.exit(1);
  }

  if (ratio && ratio.value === '4') {
    console.log('✅ Test Case 3 Passed: Total Chol/HDL Ratio successfully calculated (200 / 50 = 4).');
  } else {
    console.error('❌ Test Case 3 Failed: Expected Ratio to be "4", got:', ratio?.value);
    process.exit(1);
  }

  // Test Case 3: Missing inputs (should clear calculated values or keep them empty)
  const results3: TestResult[] = [
    { parameterId: 'lip-tc', value: '200' }
    // missing HDL and TG
  ];
  const calculated3 = applyCalculations(results3, mockCatalog);
  const vldl3 = calculated3.find(r => r.parameterId === 'lip-vldl');
  const ldl3 = calculated3.find(r => r.parameterId === 'lip-ldl');

  if ((!vldl3 || vldl3.value === '') && (!ldl3 || ldl3.value === '')) {
    console.log('✅ Test Case 4 Passed: Calculated parameters correctly remain empty/cleared when dependencies are missing.');
  } else {
    console.error('❌ Test Case 4 Failed: Expected calculated parameters to be empty/undefined, got VLDL:', vldl3?.value, 'LDL:', ldl3?.value);
    process.exit(1);
  }

  console.log('\n🎉 All Test Cases Passed Successfully!');
}

runTests();
