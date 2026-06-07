import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('[DOKU SNAP TOKEN REQUEST]', JSON.stringify(body, null, 2));

    // Return successful SNAP B2B access token
    return NextResponse.json({
      responseCode: "2007300",
      responseMessage: "Successful",
      accessToken: "snap-token-matchaboy-prod",
      tokenType: "Bearer",
      expiresIn: 900
    });
  } catch (error: any) {
    console.error('[DOKU SNAP TOKEN EXCEPTION]', error);
    return NextResponse.json({
      responseCode: "5007300",
      responseMessage: "Internal Server Error"
    }, { status: 500 });
  }
}
