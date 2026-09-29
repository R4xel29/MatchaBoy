import { prisma } from "./prisma";

/**
 * Extracts the email address from a Google OAuth id_token (JWT payload).
 */
export function extractEmailFromGoogleIdToken(idToken?: string | null): string | null {
  if (!idToken || typeof idToken !== "string") return null;
  try {
    const parts = idToken.split(".");
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);
    if (payload && typeof payload.email === "string" && payload.email.includes("@")) {
      return payload.email.trim().toLowerCase();
    }
  } catch {
    // Ignore malformed JWT payload
  }
  return null;
}

/**
 * Syncs a user's email with their linked Google account email if available and not conflicting with another user.
 */
export async function syncUserGoogleEmail(params: {
  userId: string;
  currentEmail?: string | null;
  googleEmail?: string | null;
  idToken?: string | null;
  forceOverwrite?: boolean;
}): Promise<string | null> {
  const { userId, currentEmail, googleEmail, idToken, forceOverwrite = false } = params;
  const targetEmail = (googleEmail || extractEmailFromGoogleIdToken(idToken))?.trim().toLowerCase() || null;

  if (!targetEmail) {
    return currentEmail || null;
  }

  // If user already has an email and we are not forcing overwrite (e.g., on passive profile load), keep currentEmail
  if (currentEmail && currentEmail.trim() !== "" && !forceOverwrite) {
    return currentEmail;
  }

  if (currentEmail?.trim().toLowerCase() === targetEmail) {
    return currentEmail;
  }

  try {
    const existingOwner = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });

    if (!existingOwner || existingOwner.id === userId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          email: targetEmail,
          emailVerified: new Date(),
        },
      });
      return targetEmail;
    }
  } catch (e) {
    console.error("[GOOGLE_EMAIL_SYNC] Failed to sync Google email for user:", userId, e);
  }

  return currentEmail || null;
}
