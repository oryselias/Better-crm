import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const tableName = searchParams.get("table") || undefined;
  const action = searchParams.get("action") || undefined;
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  let query = supabase
    .from("audit_events")
    .select(`
      *,
      actor:profiles(full_name)
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (tableName) {
    query = query.eq("table_name", tableName);
  }

  if (action) {
    query = query.eq("action", action);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get unique tables and actions for filters
  const { data: filters } = await supabase
    .from("audit_events")
    .select("table_name, action")
    .limit(1000);

  const uniqueTables = [...new Set(filters?.map(f => f.table_name) || [])];
  const uniqueActions = [...new Set(filters?.map(f => f.action) || [])];

  return NextResponse.json({
    events: data,
    total: count,
    filters: {
      tables: uniqueTables,
      actions: uniqueActions,
    },
  });
}
