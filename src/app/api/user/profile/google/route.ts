import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Delete the Google account record for this user
    await prisma.account.deleteMany({
      where: {
        userId: session.user.id,
        provider: 'google'
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[GOOGLE_DISCONNECT] Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
