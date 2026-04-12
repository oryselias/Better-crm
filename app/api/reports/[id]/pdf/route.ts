import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateLabReportPDF, uploadGeneratedReport } from "@/lib/reports/pdf-generator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse formatting options
    const searchParams = request.nextUrl.searchParams;
    const paperSize = searchParams.get("paperSize") === "A5" ? "A5" : "A4";
    const includeHeader = searchParams.get("includeHeader") !== "false";

    // Verify report ownership via RLS
    // Now that middleware handles the session effectively, we don't need the admin bypass here.
    const { data: ownRow } = await supabase
      .from("lab_reports")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    
    if (!ownRow) {
      console.error('[PDF API] Report not found or access denied:', id);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate PDF using admin client inside the generator.
    const result = await generateLabReportPDF({
      reportId: id,
      paperSize,
      includeHeader,
    });

    if (!result.success || !result.pdfBuffer) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Return PDF as response (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(result.pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="lab-report-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify report ownership - RLS ensures user can only access their clinic's reports
    const { data: report } = await supabase
      .from("lab_reports")
      .select("id")
      .eq("id", id)
      .single();

    if (!report) {
      return NextResponse.json({ error: "Access denied or not found" }, { status: 404 });
    }

    // Parse formatting options from request body
    const body = await request.json().catch(() => ({}));
    const paperSize: "A4" | "A5" = body?.paperSize === "A5" ? "A5" : "A4";

    // Generate and upload PDF to storage with the requested paper size included again
    const result = await uploadGeneratedReport(id, { paperSize });

    if (!result.success) {
      console.error("PDF upload failed:", result.error);
      return NextResponse.json({ error: "Failed to process PDF" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "PDF generated and uploaded" });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
