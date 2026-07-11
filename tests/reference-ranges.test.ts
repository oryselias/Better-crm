import { evaluateReferenceRange } from '../lib/reports/reference-ranges';

function runTests() {
  console.log('Running Reference Ranges Unit Tests...\n');

  // Test Case 1: Less than or equal to (<=) ASCII
  const res1 = evaluateReferenceRange({ name: 'Test', normal_range: '<=150' }, 150);
  if (res1.isAbnormal || res1.status !== 'normal' || res1.referenceRange !== '<= 150') {
    console.error('❌ Test Case 1 Failed: Expected <=150 with value 150 to be normal and format to "<= 150", got:', res1);
    process.exit(1);
  }
  console.log('✅ Test Case 1 Passed: <=150 with 150 is normal and normalized to "<= 150".');

  // Test Case 2: Less than or equal to (<=) ASCII - abnormal
  const res2 = evaluateReferenceRange({ name: 'Test', normal_range: '<=150' }, 151);
  if (!res2.isAbnormal || res2.status !== 'high' || res2.referenceRange !== '<= 150') {
    console.error('❌ Test Case 2 Failed: Expected <=150 with value 151 to be abnormal high and format to "<= 150", got:', res2);
    process.exit(1);
  }
  console.log('✅ Test Case 2 Passed: <=150 with 151 is high and normalized to "<= 150".');

  // Test Case 3: Greater than or equal to (>=) ASCII
  const res3 = evaluateReferenceRange({ name: 'Test', normal_range: '>=40' }, 40);
  if (res3.isAbnormal || res3.status !== 'normal' || res3.referenceRange !== '>= 40') {
    console.error('❌ Test Case 3 Failed: Expected >=40 with value 40 to be normal and format to ">= 40", got:', res3);
    process.exit(1);
  }
  console.log('✅ Test Case 3 Passed: >=40 with 40 is normal and normalized to ">= 40".');

  // Test Case 4: Greater than or equal to (>=) ASCII - abnormal
  const res4 = evaluateReferenceRange({ name: 'Test', normal_range: '>=40' }, 39);
  if (!res4.isAbnormal || res4.status !== 'low' || res4.referenceRange !== '>= 40') {
    console.error('❌ Test Case 4 Failed: Expected >=40 with value 39 to be abnormal low and format to ">= 40", got:', res4);
    process.exit(1);
  }
  console.log('✅ Test Case 4 Passed: >=40 with 39 is low and normalized to ">= 40".');

  // Test Case 5: Less than or equal to (≤) Unicode
  const res5 = evaluateReferenceRange({ name: 'Test', normal_range: '≤ 150' }, 150);
  if (res5.isAbnormal || res5.status !== 'normal' || res5.referenceRange !== '<= 150') {
    console.error('❌ Test Case 5 Failed: Expected ≤ 150 with value 150 to be normal and normalized to "<= 150", got:', res5);
    process.exit(1);
  }
  console.log('✅ Test Case 5 Passed: ≤ 150 with 150 is normal and normalized to "<= 150".');

  // Test Case 6: Less than or equal to (≤) Unicode - abnormal
  const res6 = evaluateReferenceRange({ name: 'Test', normal_range: '≤ 150' }, 151);
  if (!res6.isAbnormal || res6.status !== 'high' || res6.referenceRange !== '<= 150') {
    console.error('❌ Test Case 6 Failed: Expected ≤ 150 with value 151 to be abnormal high and normalized to "<= 150", got:', res6);
    process.exit(1);
  }
  console.log('✅ Test Case 6 Passed: ≤ 150 with 151 is high and normalized to "<= 150".');

  // Test Case 7: Greater than or equal to (≥) Unicode
  const res7 = evaluateReferenceRange({ name: 'Test', normal_range: '≥ 40' }, 40);
  if (res7.isAbnormal || res7.status !== 'normal' || res7.referenceRange !== '>= 40') {
    console.error('❌ Test Case 7 Failed: Expected ≥ 40 with value 40 to be normal and normalized to ">= 40", got:', res7);
    process.exit(1);
  }
  console.log('✅ Test Case 7 Passed: ≥ 40 with 40 is normal and normalized to ">= 40".');

  // Test Case 8: Greater than or equal to (≥) Unicode - abnormal
  const res8 = evaluateReferenceRange({ name: 'Test', normal_range: '≥ 40' }, 39);
  if (!res8.isAbnormal || res8.status !== 'low' || res8.referenceRange !== '>= 40') {
    console.error('❌ Test Case 8 Failed: Expected ≥ 40 with value 39 to be abnormal low and normalized to ">= 40", got:', res8);
    process.exit(1);
  }
  console.log('✅ Test Case 8 Passed: ≥ 40 with 39 is low and normalized to ">= 40".');

  console.log('\n🎉 All Reference Ranges Test Cases Passed Successfully!');
}

runTests();
