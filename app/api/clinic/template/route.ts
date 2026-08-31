import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { data: clinic, error } = await admin
      .from("clinics")
      .select("id, name, template_url, logo_url")
      .eq("id", profile.clinic_id)
      .single();

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
    }

    return NextResponse.json({
      templateUrl: clinic.template_url ?? null,
      clinicName: clinic.name,
    });
  } catch (error) {
    console.error("[Clinic Template GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    // Process uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate mime type
    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PNG or JPEG image." },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit." },
        { status: 400 }
      );
    }

    const admin = createSupabaseAdminClient();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "png";
    const storagePath = `${profile.clinic_id}/template-${Date.now()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from("clinic-templates")
      .upload(storagePath, fileBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Clinic Template Upload] Storage error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    const { data: publicUrlData } = admin.storage
      .from("clinic-templates")
      .getPublicUrl(storagePath);

    const templateUrl = publicUrlData.publicUrl;

    const { error: dbError } = await admin
      .from("clinics")
      .update({ template_url: templateUrl })
      .eq("id", profile.clinic_id);

    if (dbError) {
      console.error("[Clinic Template Upload] DB update error:", dbError);
      return NextResponse.json(
        { error: `Failed to update clinic record: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      templateUrl,
      message: "Template uploaded successfully",
    });
  } catch (error) {
    console.error("[Clinic Template POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("clinic_id")
      .eq("id", user.id)
      .single();

    if (!profile?.clinic_id) {
      return NextResponse.json({ error: "No clinic assigned" }, { status: 400 });
    }

    const admin = createSupabaseAdminClient();
    const { error: dbError } = await admin
      .from("clinics")
      .update({ template_url: null })
      .eq("id", profile.clinic_id);

    if (dbError) {
      return NextResponse.json(
        { error: `Failed to remove template: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template removed successfully",
    });
  } catch (error) {
    console.error("[Clinic Template DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
