import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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

    // Tenant ownership check: resolve the caller's clinic and confirm the
    // report belongs to it. Uses admin client to avoid RLS cookie quirks in
    // dev/proxy setups where the RLS-scoped server client sporadically
    // returns empty results for rows the browser client can see.
    const admin = createSupabaseAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .maybeSingle();
    
    const { data: ownRow } = await admin
      .from("lab_reports")
      .select("id, clinic_id")
      .eq("id", id)
      .maybeSingle();
    
    if (!ownRow) {
      console.error('[PDF API] Report not found in database:', id);
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (!profile?.clinic_id) {
      console.error('[PDF API] User has no clinic_id assigned. Profile:', profile);
      return NextResponse.json({ error: "User clinic not configured" }, { status: 403 });
    }
    if (ownRow.clinic_id !== profile.clinic_id) {
      console.error('[PDF API] Clinic mismatch. Report clinic:', ownRow.clinic_id, 'User clinic:', profile.clinic_id);
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
      { error: error instanceof Error ? error.message : "Unknown error" },
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Generate and upload PDF to storage
    const result = await uploadGeneratedReport(id);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "PDF generated and uploaded" });
  } catch (error) {
    console.error("PDF upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
