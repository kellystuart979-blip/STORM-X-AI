import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req:NextRequest){
  try{
    const { prompt } = await req.json();
    if(!prompt || typeof prompt!=="string" || prompt.trim().length<3){
      return NextResponse.json({error:"Prompt too short, need 3+ chars"}, {status:400});
    }
    if(prompt.length>1000){
      return NextResponse.json({error:"Prompt too long, max 1000 chars"}, {status:413});
    }
    if(!process.env.OPENAI_API_KEY){
      return NextResponse.json({error:"Missing env OPENAI_API_KEY. Add in Render > Environment > OPENAI_API_KEY"}, {status:500});
    }
    const openai = new OpenAI({apiKey:process.env.OPENAI_API_KEY});
    const res = await openai.images.generate({
      model:"dall-e-3",
      prompt: prompt.trim().slice(0,1000),
      size:"1024x1024",
      quality:"standard",
      n:1,
    });
    const image = res.data?.[0]?.url;
    if(!image) return NextResponse.json({error:"No image from provider, check billing"}, {status:500});
    return NextResponse.json({image});
  }catch(e:any){
    return NextResponse.json({error:e.message || "Image generation failed - needs OpenAI billing for DALL·E 3"}, {status:500});
  }
}
