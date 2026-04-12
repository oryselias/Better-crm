const TEN_DIGIT_PHONE_REGEX = /^\d{10}$/;

export function normalizePatientPhone(rawPhone: string | null | undefined): string | null {
  const value = (rawPhone || "").trim();
  if (!value) {
    return null;
  }

  const digits = value.replace(/\D/g, "");
  if (!TEN_DIGIT_PHONE_REGEX.test(digits)) {
    throw new Error("Phone number must be exactly 10 digits.");
  }

  return digits;
}

export function isValidPatientPhone(rawPhone: string | null | undefined): boolean {
  try {
    return normalizePatientPhone(rawPhone) !== null;
  } catch {
    return false;
  }
}