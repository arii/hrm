import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    return NextResponse.json({
      ok: true,
      isAuthenticated: !!session,
      session: session
        ? {
            user: session.user,
            expires: session.expires,
            // Omit tokens from response
          }
        : null,
    });
  } catch (err) {
    console.error("Auth check failed:", err);
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
