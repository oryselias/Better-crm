import PDFDocument from "pdfkit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const STATUS_COLORS = {
  normal: "#22c55e",
  high: "#ef4444",
  low: "#f59e0b",
  critical: "#dc2626",
};

interface GenerateReportOptions {
  reportId: string;
}

interface GenerateReportResult {
  success: boolean;
  pdfBuffer?: Buffer;
  error?: string;
}

export async function generateLabReportPDF(options: GenerateReportOptions): Promise<GenerateReportResult> {
  const { reportId } = options;
  const supabase = createSupabaseAdminClient();

  try {
    // Fetch report with patient data
    const { data: report, error: reportError } = await supabase
      .from("lab_reports")
      .select(`
        *,
        patient:patients(full_name, date_of_birth, sex),
        clinic:clinics(name)
      `)
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      return { success: false, error: "Report not found" };
    }

    // Parse the stored test results from parsed_payload
    const parsedPayload = report.parsed_payload || { tests: [], patient_info: {} };
    const tests = parsedPayload.tests || [];
    const patientInfo = parsedPayload.patient_info || {};

    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));

    // Colors
    const primaryColor = "#1e40af";
    const grayColor = "#6b7280";
    const lightGray = "#f3f4f6";
    const tableHeaderBg = "#1e40af";

    // Header
    doc
      .fillColor(primaryColor)
      .fontSize(24)
      .font("Helvetica-Bold")
      .text(report.clinic?.name || "Laboratory", { align: "center" })
      .fillColor(grayColor)
      .fontSize(12)
      .font("Helvetica")
      .text("Laboratory Report", { align: "center" });

    doc.moveDown(0.5);
    doc.strokeColor(primaryColor).lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Patient Info Box
    doc.rect(50, doc.y, 495, 70).fill(lightGray);
    const boxY = doc.y + 10;

    doc
      .fillColor("#000")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Patient Information", 60, boxY);

    const patientName = patientInfo.name || report.patient?.full_name || "Unknown";
    const patientAge = patientInfo.age || formatAge(report.patient?.date_of_birth);
    const patientGender = patientInfo.gender || report.patient?.sex || "N/A";
    const reportDate = new Date(report.ingested_at || Date.now()).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(grayColor)
      .text("Name", 60, boxY + 25)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text(patientName, 60, boxY + 37);

    doc
      .fillColor(grayColor)
      .font("Helvetica")
      .text("Age/Gender", 220, boxY + 25)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text(`${patientAge} / ${patientGender}`, 220, boxY + 37);

    doc
      .fillColor(grayColor)
      .font("Helvetica")
      .text("Report Date", 400, boxY + 25)
      .fillColor("#000")
      .font("Helvetica-Bold")
      .text(reportDate, 400, boxY + 37);

    doc.y = boxY + 75;
    doc.moveDown(1.5);

    // Test Results Section
    doc
      .fillColor("#000")
      .fontSize(14)
      .font("Helvetica-Bold")
      .text("Test Results");

    doc.moveDown(0.5);

    // Table Header
    const tableTop = doc.y;
    const colWidths = { test: 180, result: 80, unit: 70, reference: 100, status: 65 };
    const startX = 50;

    doc.rect(startX, tableTop, 495, 25).fill(tableHeaderBg);
    doc
      .fillColor("#fff")
      .fontSize(10)
      .font("Helvetica-Bold");

    doc.text("TEST", startX + 5, tableTop + 7);
    doc.text("RESULT", startX + colWidths.test + 5, tableTop + 7, { width: colWidths.result, align: "center" });
    doc.text("UNIT", startX + colWidths.test + colWidths.result + 5, tableTop + 7, { width: colWidths.unit, align: "center" });
    doc.text("REFERENCE", startX + colWidths.test + colWidths.result + colWidths.unit + 5, tableTop + 7, { width: colWidths.reference, align: "center" });
    doc.text("STATUS", startX + colWidths.test + colWidths.result + colWidths.unit + colWidths.reference + 5, tableTop + 7, { width: colWidths.status, align: "center" });

    doc.y = tableTop + 25;

    // Table Rows
    tests.forEach((test: { test_name: string; result: string; unit: string; reference_range: string; status: string }, index: number) => {
      const rowHeight = 22;

      // BUG-021: PDFKit does not auto-paginate — content below page height is silently clipped.
      // Add a new page and re-render the table header when a row would overflow.
      if (doc.y + rowHeight > doc.page.height - 60) {
        doc.addPage();
        const newTableTop = doc.y;
        doc.rect(startX, newTableTop, 495, 25).fill(tableHeaderBg);
        doc.fillColor("#fff").fontSize(10).font("Helvetica-Bold");
        doc.text("TEST", startX + 5, newTableTop + 7);
        doc.text("RESULT", startX + colWidths.test + 5, newTableTop + 7, { width: colWidths.result, align: "center" });
        doc.text("UNIT", startX + colWidths.test + colWidths.result + 5, newTableTop + 7, { width: colWidths.unit, align: "center" });
        doc.text("REFERENCE", startX + colWidths.test + colWidths.result + colWidths.unit + 5, newTableTop + 7, { width: colWidths.reference, align: "center" });
        doc.text("STATUS", startX + colWidths.test + colWidths.result + colWidths.unit + colWidths.reference + 5, newTableTop + 7, { width: colWidths.status, align: "center" });
        doc.y = newTableTop + 25;
      }

      const rowY = doc.y;

      // Alternate row background
      if (index % 2 === 1) {
        doc.rect(startX, rowY, 495, rowHeight).fill(lightGray);
      }
      doc.rect(startX, rowY, 495, rowHeight).stroke();

      doc
        .fillColor("#000")
        .fontSize(10)
        .font("Helvetica")
        .text(test.test_name, startX + 5, rowY + 6, { width: colWidths.test - 5 });

      doc
        .font("Helvetica-Bold")
        .text(test.result, startX + colWidths.test + 5, rowY + 6, { width: colWidths.result, align: "center" });

      doc
        .font("Helvetica")
        .fillColor(grayColor)
        .text(test.unit || "-", startX + colWidths.test + colWidths.result + 5, rowY + 6, { width: colWidths.unit, align: "center" });

      doc.text(
        test.reference_range || "-",
        startX + colWidths.test + colWidths.result + colWidths.unit + 5,
        rowY + 6,
        { width: colWidths.reference, align: "center" }
      );

      // Status badge
      const statusColor = STATUS_COLORS[test.status as keyof typeof STATUS_COLORS] || "#6b7280";
      doc
        .fillColor(statusColor)
        .rect(
          startX + colWidths.test + colWidths.result + colWidths.unit + colWidths.reference + 20,
          rowY + 5,
          45,
          14
        )
        .fill();

      doc
        .fillColor("#fff")
        .font("Helvetica-Bold")
        .fontSize(8)
        .text(
          test.status.toUpperCase(),
          startX + colWidths.test + colWidths.result + colWidths.unit + colWidths.reference + 22,
          rowY + 8,
          { width: 41, align: "center" }
        );

      doc.y = rowY + rowHeight;
      doc.fillColor("#000");
    });

    // Footer
    doc
      .fillColor(grayColor)
      .fontSize(9)
      .font("Helvetica")
      .text("Generated by Better CRM • This is a computer-generated report", 50, 780, { align: "center" });

    doc.end();

    return new Promise((resolve) => {
      doc.on("end", () => {
        const pdfBuffer = Buffer.concat(chunks);
        resolve({ success: true, pdfBuffer });
      });
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function uploadGeneratedReport(reportId: string): Promise<GenerateReportResult> {
  const result = await generateLabReportPDF({ reportId });

  if (!result.success || !result.pdfBuffer) {
    return result;
  }

  const supabase = createSupabaseAdminClient();
  const storagePath = `generated/${reportId}.pdf`;

  try {
    const { error: uploadError } = await supabase.storage
      .from("lab-reports")
      .upload(storagePath, result.pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function formatAge(dateOfBirth: string | null): string {
  if (!dateOfBirth) return "N/A";
  const dob = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - dob.getFullYear();
  return `${age} years`;
}
