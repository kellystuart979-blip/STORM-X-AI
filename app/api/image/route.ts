import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest){
  try{
    const { prompt } = await req.json();
    if(!prompt) return NextResponse.json({error:"No prompt"}, {status:400});
    if(!process.env.OPENAI_API_KEY) return NextResponse.json({error:"OPENAI_API_KEY not set on Render > Environment"}, {status:500});

    const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    // Real DALL·E 3 generation
    const res = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt.slice(0,1000),
      size: "1024x1024",
      quality: "standard",
      n:1,
    });
    const image = res.data[0]?.url;
    if(!image) return NextResponse.json({error:"No image returned"}, {status:500});
    return NextResponse.json({image});
  }catch(e:any){
    // Fallback helpful error
    return NextResponse.json({error: e.message || "Image generation failed. Need billing enabled on OpenAI key for DALL·E 3."}, {status:500});
  }
}
