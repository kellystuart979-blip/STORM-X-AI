import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  const { prompt } = await req.json();
  // Free image via Pollinations - no key needed, real image!
  const encoded = encodeURIComponent(prompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`;
  // Fetch and return as base64 or direct URL
  return NextResponse.json({ image: imageUrl });
}
