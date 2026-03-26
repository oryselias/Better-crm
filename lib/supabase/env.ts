const publicEnvKeys = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

const serverEnvKeys = ["SUPABASE_SERVICE_ROLE_KEY"] as const;

export function hasSupabasePublicEnv() {
  return publicEnvKeys.every((key) => Boolean(process.env[key]?.trim()));
}

export function hasSupabaseServerEnv() {
  return serverEnvKeys.every((key) => Boolean(process.env[key]?.trim()));
}

export function getSupabaseEnv() {
  const missingKeys = publicEnvKeys.filter((key) => !process.env[key]?.trim());

  if (missingKeys.length) {
    throw new Error(
      `Missing Supabase environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    jwtSecret: process.env.SUPABASE_JWT_SECRET,
  };
}

export function getSupabaseProjectRef() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl).hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}
