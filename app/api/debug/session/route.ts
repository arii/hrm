import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

/**
 * Debug route to return the server side NextAuth session.
 * Useful to confirm tokens/refresh tokens are present in the session.
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions as any);
    return NextResponse.json({ ok: true, session: session ?? null });
  } catch (err) {
    console.error("debug/session error:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
