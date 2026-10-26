import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
  try{
    const { prompt } = await req.json();
    if(!prompt) return NextResponse.json({error:"No prompt"}, {status:400});
    
    // FREE IMAGE - Pollinations - no key, no money, unlimited for owner
    const encoded = encodeURIComponent(prompt);
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true`;
    
    // Fetch image and return as base64 for your UI
    const res = await fetch(imageUrl);
    if(!res.ok) throw new Error("Free image fail");
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return NextResponse.json({image: dataUrl, prompt, free: true}, {status:200});
  }catch(e:any){
    return NextResponse.json({error: e.message}, {status:200});
  }
}
