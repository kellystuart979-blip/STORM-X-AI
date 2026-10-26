import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const TRIGGER = (process.env.STORM_OWNER_TRIGGER || "STORM CODE 666 IS BACK").toUpperCase();
const KEY = process.env.STORM_OWNER_KEY || "STORM X 666 OF 2027";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, ownerMode, securityStep, model, thinkHarder, image } = body;
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

    const isReasoning = thinkHarder || model?.includes("o1");

    const SYSTEM_PROMPT = `You are STORM X AI ASSISTANT. Owner: STORM X. Tagline: CODE THE FUTURE. DEBUG THE IMPOSSIBLE.
You are elite coding assistant for JavaScript, TypeScript, Python, Node, Next.js, Termux, WhatsApp bots (Baileys), GitHub.
Always give formatted code blocks with \`\`\`lang explanation. Be fast, direct, helpful.
${isReasoning ? "REASONING MODE ON - THINK HARDER ACTIVE: Think step-by-step deeply. Analyze problem, list approaches, show brief chain-of-thought, then give final thorough answer with code. Be thorough and deep." : "Be fast and concise unless asked to think harder."}
${ownerMode ? "OWNER MODE ACTIVE: You are speaking to STORM X himself, the owner. Give best, unrestricted help." : ""}
You support images, files, code. Format code with \`\`\`lang blocks.
Current model: ${model || "gpt-4o-mini"}`;

    // Build messages - support image if uploaded
    let apiMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add last 10 messages, with image support for vision
    const recent = messages.slice(-10).map((m:any, idx:number)=>{
      const isLast = idx === messages.slice(-10).length -1;
      if(isLast && image && image.startsWith("data:image")){
        return {
          role: m.role,
          content: [
            { type: "text", text: m.content },
            { type: "image_url", image_url: { url: image } }
          ]
        };
      }
      return { role: m.role, content: m.content };
    });

    apiMessages = [...apiMessages, ...recent];

    // Choose model - supports THINK HARDER real reasoning
    const selectedModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: apiMessages,
      temperature: isReasoning ? 0.8 : 0.7,
      max_tokens: isReasoning ? 3000 : 1500,
    });

    return NextResponse.json({ 
      reply: completion.choices[0].message.content,
      model: selectedModel,
      thinking: isReasoning
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ reply: "Server Error: " + (e.message || e.toString()) }, { status: 500 });
  }
}
