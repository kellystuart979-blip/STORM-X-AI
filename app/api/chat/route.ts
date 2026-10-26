import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastRaw = messages[messages.length-1]?.content || "";
    const last = lastRaw.toLowerCase();

    if (last.includes("who created") || last.includes("who made") || last.includes("who built") || last.includes("creator")) {
      return NextResponse.json({ 
        reply: "Bro 😎🔥, I was created by a boy called STORM X! He is the owner and creator of STORM X AI. I'm not OpenAI, not ChatGPT, not GPT-6 - I'm STORM X AI, built by STORM X for coding, images, videos! 🚀\n\n- Creator: STORM X (a boy called STORM X)\n- Me: STORM X AI Assistant\n- Purpose: Help you code, create, build anything!" 
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || !groqKey.startsWith("gsk_")) {
      return NextResponse.json({ reply: `Bro your GROQ_API_KEY is invalid! You have "${groqKey?.slice(0,10)}" but it must start with gsk_...\n\nGo to console.groq.com/keys, copy full gsk_ key, paste in Render Environment Variables.\n\nFor your riddle: What comes twice in a week once in a year? Answer is LETTER E! (EE in week, E in year)\n\nFix key and I will answer anything perfectly! - Created by a boy called STORM X` });
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${groqKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"llama-3.3-70b-versatile",
        messages:[
          { role:"system", content: "You are STORM X AI created by a boy called STORM X. Be friendly, fun, helpful like ChatGPT. Use emojis. Answer all questions. You are NOT OpenAI. Creator is STORM X boy." },
          ...messages.slice(-12)
        ],
        temperature:0.8, max_tokens:3500
      })
    });
    const d=await r.json();
    if (!r.ok) {
      return NextResponse.json({ reply: `Groq Error: ${JSON.stringify(d).slice(0,500)}\n\nYour GROQ_API_KEY seems invalid. Get new key from console.groq.com/keys - must be gsk_...` });
    }
    let reply = d.choices?.[0]?.message?.content || "Error no reply";
    reply = reply.replace(/OpenAI/gi, "STORM X").replace(/ChatGPT/gi, "STORM X AI");
    return NextResponse.json({ reply });
  } catch(e:any){ return NextResponse.json({ reply: `Error: ${e.message} - Check GROQ key` }); }
}
