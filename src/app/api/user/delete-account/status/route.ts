import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 0; // always check fresh database status

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      // No active session means user is either logged out or deleted
      return NextResponse.json({ deleted: true });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    });

    if (!user) {
      // Session exists but user record is gone -> deleted!
      return NextResponse.json({ deleted: true });
    }

    return NextResponse.json({ deleted: false });
  } catch (error: any) {
    console.error("[DELETE_ACCOUNT_STATUS] Error:", error);
    // If there's an error verifying, we assume not deleted to prevent premature redirects
    return NextResponse.json({ deleted: false, error: error.message });
  }
}
