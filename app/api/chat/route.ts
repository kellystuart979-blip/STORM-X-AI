import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastRaw = messages[messages.length-1]?.content || "";
    const last = lastRaw.toLowerCase();

    if (last.includes("who created") || last.includes("who made") || last.includes("who built") || last.includes("creator") || last.includes("who are you")) {
      return NextResponse.json({ 
        reply: "Bro 😎🔥, I was created by a boy called STORM X! He is the owner and creator of STORM X AI. I'm not OpenAI, not ChatGPT, not GPT-6 - I'm STORM X AI, built by STORM X for coding, images, videos! 🚀\n\n- Creator: STORM X (a boy called STORM X)\n- Me: STORM X AI Assistant\n- Purpose: Help you code, create, build anything!" 
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey || !groqKey.startsWith("gsk_")) {
      return NextResponse.json({ reply: `Fix GROQ_API_KEY - must be gsk_... Get from console.groq.com/keys\n\nYour riddle: Twice in a week, once in a year = letter E!` });
    }

    // FIXED MODEL - Free tier working model!
    const model = "llama-3.1-8b-instant"; // FAST FREE MODEL - ALWAYS WORKS

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${groqKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model: model,
        messages:[
          { role:"system", content: "You are STORM X AI created by a boy called STORM X. Be friendly like ChatGPT. Use emojis. You are NOT OpenAI. Creator is a boy called STORM X. Help with coding." },
          ...messages.slice(-12)
        ],
        temperature:0.8, max_tokens:3500
      })
    });
    const d=await r.json();
    if (!r.ok) {
      // Try backup model
      if (d.error?.code === "model_not_found") {
        const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method:"POST",
          headers:{ "Authorization":`Bearer ${groqKey}`, "Content-Type":"application/json" },
          body: JSON.stringify({
            model: "openai/gpt-oss-20b",
            messages:[{ role:"system", content: "You are STORM X AI created by a boy called STORM X. Friendly like ChatGPT." }, ...messages.slice(-12)],
            temperature:0.8, max_tokens:3500
          })
        });
        const d2 = await r2.json();
        if (r2.ok && d2.choices?.[0]) {
          let reply = d2.choices[0].message.content;
          reply = reply.replace(/OpenAI/gi, "STORM X");
          return NextResponse.json({ reply });
        }
      }
      return NextResponse.json({ reply: `Groq Error: ${d.error?.message || JSON.stringify(d).slice(0,500)}` });
    }
    let reply = d.choices?.[0]?.message?.content || "No reply";
    reply = reply.replace(/OpenAI/gi, "STORM X").replace(/ChatGPT/gi, "STORM X AI");
    return NextResponse.json({ reply });
  } catch(e:any){ return NextResponse.json({ reply: `Error: ${e.message}` }); }
}
