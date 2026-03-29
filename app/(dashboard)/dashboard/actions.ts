"use server";

import { getDashboardSnapshot } from "@/lib/dashboard";

export async function refreshDashboardAction() {
    return await getDashboardSnapshot();
}
