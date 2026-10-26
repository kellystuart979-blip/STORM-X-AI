import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest){
  try{
    const body = await req.json();
    const { messages, model, thinkHarder, image } = body as {
      messages:{role:"user"|"assistant"|"system", content:string}[],
      model?:string,
      thinkHarder?:boolean,
      image?:string
    };

    // Validation
    if(!messages || !Array.isArray(messages) || messages.length===0){
      return NextResponse.json({error:"No messages"}, {status:400});
    }
    if(JSON.stringify(messages).length > 30000){
      return NextResponse.json({error:"Conversation too large, start new chat"}, {status:413});
    }
    if(!process.env.OPENAI_API_KEY){
      return NextResponse.json({error:"OPENAI_API_KEY not set", reply:"⚠️ OPENAI_API_KEY missing. Add in Render > Environment > OPENAI_API_KEY = sk-proj-... and redeploy."}, {status:500});
    }

    const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});

    // Choose real model - think harder uses reasoning model if available
    let selectedModel = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    if(thinkHarder){
      // Try reasoning model, fallback handled below
      selectedModel = "o1-mini";
    }

    // System prompt
    const system = `You are STORM X AI ASSISTANT, owner STORM X. Tagline CODE THE FUTURE. DEBUG THE IMPOSSIBLE.
Elite coding assistant for JS/TS/Python/Next.js/WhatsApp Baileys/Termux.
Always use code fences \`\`\`lang.
${thinkHarder ? "THINK HARDER MODE: Be thorough, step-by-step reasoning, list approaches, then final answer." : "Be fast, concise."}
Current time: ${new Date().toISOString()}
Model: ${selectedModel}`;

    // Build messages with vision support
    const apiMessages:any[] = [{role:"system", content:system}];
    for(const m of messages.slice(-12)){
      const isLast = m === messages[messages.length-1];
      if(isLast && image && image.startsWith("data:image") && selectedModel.includes("gpt-4o")){
        apiMessages.push({
          role: m.role,
          content: [
            {type:"text", text:m.content},
            {type:"image_url", image_url:{url:image, detail:"auto"}}
          ]
        });
      } else {
        apiMessages.push({role:m.role, content:m.content});
      }
    }

    try{
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: apiMessages,
        temperature: thinkHarder ? 0.6 : 0.7,
        max_tokens: thinkHarder ? 2800 : 1500,
      });
      return NextResponse.json({reply: completion.choices[0].message.content, model:selectedModel});
    }catch(e:any){
      // If o1-mini not available, fallback to gpt-4o
      if(thinkHarder && e.message?.includes("model")){
        const fallback = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000,
        });
        return NextResponse.json({reply: `⚠️ o1-mini not available for your key, used gpt-4o-mini with deep reasoning prompt.\n\n${fallback.choices[0].message.content}`, model:"gpt-4o-mini (fallback)"});
      }
      throw e;
    }
  }catch(e:any){
    return NextResponse.json({error:e.message, reply:`❌ Server error: ${e.message}`}, {status:500});
  }
}
