import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest){
  try{
    const { prompt } = await req.json();
    // For now, tell frontend to do browser video - FREE, no money
    // Owner unrestricted - STORM 666 OF 2027
    return NextResponse.json({
      message: `Use browser free video engine - no money needed! Prompt: ${prompt}`,
      free: true,
      owner: "STORM 666 OF 2027 - Unlimited"
    }, {status:200});
  }catch(e:any){
    return NextResponse.json({error: e.message}, {status:200});
  }
}
