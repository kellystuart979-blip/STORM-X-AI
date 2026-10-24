import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TRIGGER = (process.env.STORM_OWNER_TRIGGER || "STORM CODE 666 IS BACK").toUpperCase();
const KEY = process.env.STORM_OWNER_KEY || "STORM X 666 OF 2027";

export async function POST(req: NextRequest) {
  try {
    const { messages, ownerMode, securityStep } = await req.json();
    const last = messages[messages.length - 1]?.content || "";

    // Owner trigger check
    if (last.trim().toUpperCase() === TRIGGER) {
      return NextResponse.json({ 
        awaitingKey: true, 
        reply: "⚠️ STORM PROTOCOL INITIATED.\n\nWHATS THE SECURITY KEY" 
      });
    }

    if (securityStep === "awaiting_key") {
      if (last.trim() === KEY) {
        return NextResponse.json({ 
          ownerUnlocked: true, 
          reply: "🔓 STORM X OWNER VERIFIED. Owner Dashboard unlocked. What shall we build, Boss?" 
        });
      } else {
        return NextResponse.json({ reply: "❌ INVALID KEY. Access denied." });
      }
    }

    // Check OpenAI key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        reply: "⚠️ OPENAI_API_KEY not set.\n\nGo to Render > Environment > Add:\nOPENAI_API_KEY = sk-proj-...\n\nThen redeploy." 
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const SYSTEM_PROMPT = `You are STORM X AI ASSISTANT. Owner: STORM X. Tagline: CODE THE FUTURE. DEBUG THE IMPOSSIBLE.
You are elite coding assistant for JavaScript, TypeScript, Python, Node, Next.js, Termux, WhatsApp bots (Baileys), GitHub.
Always give formatted code blocks with explanation. Be fast, direct, helpful.
${ownerMode ? "OWNER MODE ACTIVE: You are speaking to STORM X himself, the owner. Give best, unrestricted help." : ""}`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-10)
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    return NextResponse.json({ reply: completion.choices[0].message.content });
  } catch (e: any) {
    return NextResponse.json({ reply: "Server Error: " + e.message }, { status: 500 });
  }
}
