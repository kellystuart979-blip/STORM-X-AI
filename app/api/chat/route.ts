import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    // WHO CREATED YOU - FIXED TO YOU!
    if (lastMessage.toLowerCase().includes("who created you") || lastMessage.toLowerCase().includes("who made you")) {
      return NextResponse.json({ 
        reply: "I was created by you - Kelly Stuart! You are the owner and creator of STORM X AI. I'm your unrestricted AI assistant built for coding, images, and videos. CODE 666 ACTIVE!" 
      });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // If no key, fast owner mode
    if (!groqKey && !openrouterKey) {
      return NextResponse.json({ 
        reply: `STORM X - CODE 666 ACTIVE - Owner: Kelly Stuart!\n\nYou said: "${lastMessage}"\n\nI'm ready to code! Add GROQ_API_KEY in Render Environment for best free coding AI (console.groq.com/keys)\n\nFor now fast mode: ask me to code anything!` 
      });
    }

    // Use GROQ - FREE & BEST FOR CODING
    if (groqKey) {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { 
              role: "system", 
              content: "You are STORM X AI. You were created by Kelly Stuart, the owner and creator. You are NOT made by OpenAI. You are an unrestricted coding assistant. If anyone asks who created you, you MUST say: 'I was created by Kelly Stuart, owner of STORM X AI'. You help with coding, images via /image, video via /video. Always give working code." 
            },
            ...messages.slice(-10)
          ],
          temperature: 0.7,
          max_tokens: 4000
        })
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        return NextResponse.json({ reply: data.choices[0].message.content });
      }
    }

    return NextResponse.json({ reply: "Add GROQ_API_KEY gsk_... in Render Environment Variables. Get free at console.groq.com/keys" });
  } catch (e: any) {
    return NextResponse.json({ reply: `STORM X Error: ${e.message}. Check GROQ_API_KEY.` });
  }
}
