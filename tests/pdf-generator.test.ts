import { generateLabReportPDF } from "../lib/reports/pdf-generator";

async function runPdfTests() {
  console.log("Running PDF Generator Unit Tests...");

  const mockReportData = {
    id: "test-report-1",
    created_at: new Date().toISOString(),
    report_no: 101,
    patient: {
      full_name: "John Doe",
      age: 35,
      sex: "male",
      phone: "9876543210",
    },
    clinic: {
      name: "Medico Path Lab",
      template_url: null,
    },
    tests: [
      {
        testId: "test-1",
        test: {
          name: "Complete Blood Count (CBC)",
          parameters: [
            {
              id: "p-1",
              name: "Hemoglobin",
              unit: "g/dL",
              normal_range: "12-16",
              min_value: 12,
              max_value: 16,
            },
          ],
        },
        results: [
          {
            parameterId: "p-1",
            value: "14.2",
            isAbnormal: false,
          },
        ],
      },
    ],
  };

  // Test 1: Standard plain generation (no template)
  const result1 = await generateLabReportPDF({
    paperSize: "A4",
    includeTemplate: false,
    reportData: mockReportData,
  });

  if (!result1.success || !result1.pdfBuffer || result1.pdfBuffer.length === 0) {
    throw new Error(`Test 1 Failed: ${result1.error}`);
  }
  console.log(`✅ Test 1 Passed: Standard PDF generated successfully (${result1.pdfBuffer.length} bytes).`);

  // Test 2: Generation with includeTemplate flag (null template_url gracefully handles as plain)
  const result2 = await generateLabReportPDF({
    paperSize: "A4",
    includeTemplate: true,
    reportData: mockReportData,
  });

  if (!result2.success || !result2.pdfBuffer || result2.pdfBuffer.length === 0) {
    throw new Error(`Test 2 Failed: ${result2.error}`);
  }
  console.log(`✅ Test 2 Passed: Graceful generation with includeTemplate=true and no uploaded template.`);

  // Test 3: A5 paper size generation
  const result3 = await generateLabReportPDF({
    paperSize: "A5",
    includeTemplate: false,
    reportData: mockReportData,
  });

  if (!result3.success || !result3.pdfBuffer || result3.pdfBuffer.length === 0) {
    throw new Error(`Test 3 Failed: ${result3.error}`);
  }
  console.log(`✅ Test 3 Passed: A5 paper size PDF generated successfully (${result3.pdfBuffer.length} bytes).`);

  console.log("\n🎉 All PDF Generator Test Cases Passed Successfully!");
}

runPdfTests().catch((err) => {
  console.error("❌ PDF Generator test failed:", err);
  process.exit(1);
});
