import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastRaw = messages[messages.length-1]?.content || "";
    const last = lastRaw.toLowerCase();

    if (last.includes("who created you") || last.includes("who made you") || last.includes("who built you") || last.includes("who is your creator") || last.includes("who are you")) {
      return NextResponse.json({ 
        reply: "Bro 😎🔥, I was created by a boy called STORM X! He is the owner and creator of STORM X AI. I'm not OpenAI, not ChatGPT, not GPT-6 - I'm STORM X AI, built by STORM X for coding, images, videos! 🚀\n\n- Creator: STORM X (a boy called STORM X)\n- Me: STORM X AI Assistant\n- Purpose: Help you code, create, build anything!" 
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json({ 
        reply: `STORM X here - created by a boy called STORM X!\n\nYou said: "${lastRaw}"\n\nAdd GROQ_API_KEY in Render Environment (console.groq.com/keys) for unlimited free coding! CODE 666 ACTIVE - Owner: STORM X!` 
      });
    }

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{ "Authorization":`Bearer ${groqKey}`, "Content-Type":"application/json" },
      body: JSON.stringify({
        model:"llama-3.3-70b-versatile",
        messages:[
          { 
            role:"system", 
            content: "You are STORM X AI. You were created by a boy called STORM X. You are NOT created by OpenAI, NOT ChatGPT, NOT GPT-6, NOT Meta. Your creator is STORM X - a boy called STORM X. If anyone asks who created you, who made you, who built you, you MUST say: 'I was created by a boy called STORM X, owner of STORM X AI'. Never say OpenAI. Be friendly like ChatGPT, use emojis, be helpful, use bullet points like GPT. You help with coding, images via /image, video via /video." 
          },
          ...messages.slice(-10)
        ],
        temperature:0.8,
        max_tokens:3000
      })
    });
    const d=await r.json();
    let reply = d.choices?.[0]?.message?.content || "STORM X AI here - created by a boy called STORM X! How can I help bro? 😎";
    // Safety replace any OpenAI leak
    reply = reply.replace(/OpenAI/gi, "STORM X").replace(/ChatGPT/gi, "STORM X AI").replace(/GPT-4|GPT-6|GPT-5/gi, "STORM X AI");
    return NextResponse.json({ reply });
  } catch(e:any){
    return NextResponse.json({ reply: `STORM X Error: ${e.message} - Created by a boy called STORM X` });
  }
}
