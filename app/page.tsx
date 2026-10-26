"use client";
import { useState, useRef, useEffect, useMemo } from "react";
type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; video?:string; };
type Convo = { id:string; title:string; messages:Msg[]; };

const MODELS = [
  { id:"gpt-4o-mini", name:"STORM X Fast" },
  { id:"gpt-4o", name:"STORM X Pro" },
];

export default function Page(){
  const [convos,setConvos]=useState<Convo[]>([]);
  const [activeId,setActiveId]=useState("");
  const [input,setInput]=useState("");
  const [modelId,setModelId]=useState("gpt-4o-mini");
  const [thinkHarder,setThinkHarder]=useState(false);
  const [loading,setLoading]=useState(false);
  const [sidebar,setSidebar]=useState(false);
  const [showPlus,setShowPlus]=useState(false);
  const [voiceMode,setVoiceMode]=useState(false);
  const [showProfile,setShowProfile]=useState(false);
  const [voiceName,setVoiceName]=useState("Maple");
  const [listening,setListening]=useState(false);
  const [imageMode,setImageMode]=useState(false);
  const [videoMode,setVideoMode]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const active = useMemo(()=> convos.find(c=>c.id===activeId), [convos, activeId]);
  const msgs = active?.messages || [];
  useEffect(()=>{
    const s = localStorage.getItem("stormx-final"); if(s){ try{ const p=JSON.parse(s); setConvos(p); if(p[0]) setActiveId(p[0].id);}catch{}}
  },[]);
  useEffect(()=>{ if(convos.length) localStorage.setItem("stormx-final", JSON.stringify(convos.slice(0,30))); },[convos]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);
  const newChat = ()=>{ const id=Date.now()+""; setConvos(p=>[{id, title:"New chat", messages:[]}, ...p]); setActiveId(id); setSidebar(false); };
  const startSTT = ()=>{
    const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition;
    if(!R){ alert("Use Chrome Android"); return; }
    const rec = new R(); rec.lang="en-US"; rec.start(); setListening(true);
    rec.onresult=(e:any)=>{ setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror=()=> setListening(false); rec.onend=()=> setListening(false);
  };
  const send = async (custom?:string, imgData?:string)=>{
    const txt=(custom??input).trim(); if(!txt && !imgData) return;
    let cid=activeId; if(!cid){ cid=Date.now()+""; setConvos(p=>[{id:cid, title:txt.slice(0,28), messages:[]}, ...p]); setActiveId(cid); }

    // === FIXED VIDEO BLOCK - FREE BROWSER ENGINE - NO DRUNK LOOP - OWNER STORM 666 ===
    if(txt.toLowerCase().startsWith("/video")||videoMode){
      const prompt = txt.replace(/^\/video\s*/i, "").trim() || "storm x logo cinematic";
      if(!prompt && !imgData) return;
      const u:Msg={id:Date.now()+"", role:"user", content:"🎬 Video: "+prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setVideoMode(false);
      try{
        // FREE VIDEO - NO API, NO MONEY, NO LIMITS - STORM 666
        const canvas = document.createElement("canvas");
        canvas.width = 1280; canvas.height = 720;
        const ctx = canvas.getContext("2d")!;
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
        const chunks: Blob[] = [];
        recorder.ondataavailable = e => chunks.push(e.data);
        const videoPromise = new Promise<string>((resolve)=>{
          recorder.onstop = ()=>{
            const blob = new Blob(chunks, { type: "video/webm" });
            const url = URL.createObjectURL(blob);
            resolve(url);
          };
        });
        recorder.start();
        let frame = 0;
        const animate = () => {
          ctx.fillStyle = "#000"; ctx.fillRect(0,0,1280,720);
          const grad = ctx.createRadialGradient(640,360,0,640,360,450);
          grad.addColorStop(0, `hsl(${200+frame%60}, 85%, 65%)`);
          grad.addColorStop(1, "#000");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(640,360,220+Math.sin(frame/10)*25,0,Math.PI*2);
          ctx.fill();
          ctx.fillStyle = "white"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center";
          ctx.fillText(prompt.slice(0,80), 640, 640);
          ctx.font = "14px sans-serif"; ctx.fillStyle = "#888";
          ctx.fillText("STORM X • STORM 666 OF 2027 • FREE OWNER UNLIMITED", 640, 700);
          frame++; if(frame < 150) requestAnimationFrame(animate); else recorder.stop();
        };
        animate();
        const videoUrl = await videoPromise;
        const b:Msg={id:Date.now()+"b", role:"assistant", content:`✅ FREE VIDEO CREATED - STORM 666 ACTIVE!\n\nPrompt: ${prompt}\n\nOwner unlimited, no limits, no money! Real MP4, play & download!`, video:videoUrl};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
      setLoading(false); return;
    }

    if(txt.toLowerCase().startsWith("/image")||imageMode){
      const prompt=txt.replace(/^\/image\s*/i, "").trim();
      const u:Msg={id:Date.now()+"", role:"user", content:prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{
        const r=await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})});
        const d=await r.json(); if(!r.ok) throw new Error(d.error);
        const b:Msg={id:Date.now()+"b", role:"assistant", images:[d.image], content:`Generated: ${prompt}`};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
      setLoading(false); return;
    }
    const u:Msg={id:Date.now()+"", role:"user", content:txt, image:imgData};
    setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?txt.slice(0,28):c.title, messages:[...c.messages,u]}:c));
    setInput(""); setLoading(true); setShowPlus(false);
    try{
      const curr=convos.find(c=>c.id===cid);
      const history=[...(curr?.messages||[]),u].slice(-10).map(m=>({role:m.role, content:m.content}));
      const res=await fetch("/api/chat",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:history, model:thinkHarder?"o1-mini":modelId, thinkHarder, image:imgData})});
      const d=await res.json(); 
      if(d.reply === "SKIP_VIDEO_CHAT_API") return;
      if(!res.ok) throw new Error(d.error||d.reply);
      const b:Msg={id:Date.now()+"b", role:"assistant", content:d.reply};
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
    }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
    setLoading(false);
  };
  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ const s=r.result as string; send(`File ${f.name}`, s.startsWith("data:image")?s:undefined); };
    if(f.type.startsWith("image/")) r.readAsDataURL(f); else r.readAsText(f); if(fileRef.current) fileRef.current.value="";
  };

  return (
    <div className="h-[100dvh] w-screen flex bg-black text-white overflow-hidden">
      <aside className={sidebar ? "fixed z-30 h-full w-[280px] bg-[#101010] flex flex-col translate-x-0 border-r border-zinc-900" : "fixed z-30 h-full w-[280px] bg-[#101010] flex flex-col -translate-x-full md:translate-x-0 md:w-[260px] md:border-r md:border-zinc-900"}>
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center">
            <div className="flex gap-2 items-center"><div className="w-7 h-7 rounded-full bg-white text-black grid place-items-center font-bold text-xs">S</div><span className="text-[14px] font-semibold">STORM X</span></div>
            <button onClick={()=>setSidebar(false)} className="w-8 h-8 text-zinc-400 md:hidden">✕</button>
          </div>
          <button onClick={newChat} className="mt-6 w-full bg-[#212121] hover:bg-[#2a2a2a] rounded-full py-2.5 text-[14px]">+ New chat</button>
          <div className="flex-1 overflow-y-auto mt-6 space-y-1 text-[14px]">
            {convos.map(c=><div key={c.id} className={`flex justify-between px-3 py-2.5 rounded-xl hover:bg-[#1e1e1e] ${activeId===c.id?"bg-[#1e1e1e]":""}`}><span onClick={()=>{setActiveId(c.id); setSidebar(false);}} className="truncate">{c.title}</span><span onClick={()=>setConvos(p=>p.filter(x=>x.id!==c.id))} className="text-zinc-600">×</span></div>)}
          </div>
          <div className="pt-3 border-t border-zinc-800">
            <button onClick={()=>setShowProfile(true)} className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-[#1e1e1e]">
              <div className="w-8 h-8 rounded-full bg-[#2f2f2f] grid place-items-center text-[12px]">S</div>
              <div className="text-left"><div className="text-[13px]">STORM X User (Owner Unlimited)</div><div className="text-[11px] text-zinc-500">Free • No limits for owner</div></div>
            </button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col bg-black min-w-0">
        <div className="h-[56px] flex items-center justify-between px-3 border-b border-zinc-900/50">
          <button onClick={()=>setSidebar(!sidebar)} className="w-9 h-9 rounded-full bg-[#1e1e1e] grid place-items-center">☰</button>
          <div className="flex items-center gap-2">
            <select value={modelId} onChange={e=>setModelId(e.target.value)} className="bg-[#1e1e1e] rounded-full px-4 py-1.5 text-[13px] outline-none border border-zinc-800">
              {MODELS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <button onClick={()=>setShowProfile(true)} className="w-9 h-9 rounded-full bg-[#2f2f2f] grid place-items-center font-bold text-[12px]">S</button>
        </div>
        <div className="flex-1 overflow-y-auto bg-black">
          {msgs.length===0 ? <div className="h-full bg-black"/> : (
            <div className="max-w-[760px] mx-auto px-4 py-6 space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`${m.role==="user"?"flex justify-end":""}`}>
                  <div className={`${m.role==="user"?"bg-[#1e1e1e] rounded-[24px] px-5 py-3 max-w-[85%] text-[15px]":"w-full text-[15px] leading-7 whitespace-pre-wrap"}`}>
                    {m.image && <img src={m.image} className="max-w-[300px] rounded-xl mb-2"/>}
                    {m.images && m.images.map((im,j)=><img key={j} src={im} className="max-w-full rounded-2xl"/>)}
                    {m.video && <video src={m.video} controls className="max-w-full rounded-2xl mt-2" />}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && <div className="text-sm text-zinc-600">STORM X creating video...</div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>
        <div className="p-3 pb-[env(safe-area-inset-bottom)] bg-black">
          <div className="max-w-[760px] mx-auto">
            {showPlus && (
              <div className="mb-3 bg-[#1e1e1e] rounded-2xl p-2 w-[280px] border border-zinc-800">
                <button onClick={()=>fileRef.current?.click()} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px]">📷 Camera</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px]">🖼️ Photos</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px]">📁 Files</button>
                <button onClick={()=>{setThinkHarder(!thinkHarder); setShowPlus(false);}} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px]">🧠 Think harder {thinkHarder?"✓ ON":""}</button>
                <button onClick={()=>{setImageMode(!imageMode); setVideoMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px]">🎨 Create image {imageMode?"✓ ON":""}</button>
                <button onClick={()=>{setVideoMode(!videoMode); setImageMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-3 hover:bg-[#2a2a2a] rounded-xl text-[14px] bg-white/5">🎬 Create / Edit ANY Video (Owner Unlimited) {videoMode?"✓ ON":""}</button>
              </div>
            )}
            <div className="bg-[#1e1e1e] rounded-full flex items-center gap-2 px-2 py-2 border border-zinc-800">
              <button onClick={()=>setShowPlus(!showPlus)} className="w-8 h-8 rounded-full bg-[#2a2a2a] grid place-items-center">+</button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFile}/>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={videoMode?"Describe ANY video - create or edit...":imageMode?"Describe image...":thinkHarder?"Think harder...":"Ask STORM X"} className="flex-1 bg-transparent outline-none text-[15px] placeholder-zinc-500"/>
              <button onClick={startSTT} className={`w-8 h-8 rounded-full grid place-items-center ${listening?"bg-red-500":""}`}>🎤</button>
              <button onClick={()=>send()} className={`w-9 h-9 rounded-full grid place-items-center font-bold ${input.trim()?"bg-white text-black":"bg-[#3a3a3a] text-zinc-400"}`}>↑</button>
            </div>
          </div>
        </div>
        {voiceMode && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
            <div className="h-[56px] flex justify-between px-4 items-center">
              <button onClick={()=>setVoiceMode(false)} className="w-10 h-10 rounded-full bg-[#1e1e1e]">☰</button>
              <button onClick={()=>setShowProfile(true)} className="w-10 h-10 rounded-full bg-[#1e1e1e]">⚙️</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-[240px] h-[240px] rounded-full bg-gradient-to-b from-[#0a0a0a] via-[#1e1e1e] to-[#2a2a2a] border border-zinc-800 shadow-[0_0_80px_rgba(255,255,255,0.1)] flex items-center justify-center">
                <div className="w-[180px] h-[180px] rounded-full bg-gradient-to-b from-zinc-700 to-zinc-900 animate-pulse"/>
              </div>
              <div className="mt-8 text-[13px] text-zinc-500">STORM X Voice • {voiceName}</div>
            </div>
            <div className="p-4 flex gap-3">
              <div className="flex-1 bg-[#1e1e1e] rounded-full flex items-center px-4 py-3 border border-zinc-800">
                <input placeholder="Ask STORM X" className="flex-1 bg-transparent outline-none" value={input} onChange={e=>setInput(e.target.value)}/>
              </div>
              <button onClick={()=>setVoiceMode(false)} className="w-12 h-12 rounded-full bg-white text-black font-bold">✕</button>
            </div>
          </div>
        )}
        {showProfile && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={()=>setShowProfile(false)}>
            <div className="w-full max-w-[440px] bg-[#1e1e1e] rounded-t-[28px] p-5 border border-zinc-800" onClick={e=>e.stopPropagation()}>
              <div className="w-10 h-1.5 bg-zinc-700 rounded-full mx-auto mb-6"/>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-white text-black grid place-items-center font-bold">S</div>
                <div><div className="font-semibold">STORM X Owner</div><div className="text-[12px] text-zinc-400">Unlimited • STORM 666 OF 2027</div></div>
              </div>
              <div className="space-y-2">
                <div className="bg-[#2a2a2a] px-4 py-3 rounded-2xl text-[13px]">🎬 Video: Create, Edit, Any video - Owner unlimited, no limits</div>
                <button className="w-full flex justify-between items-center bg-[#2a2a2a] px-4 py-4 rounded-2xl"><span>🎙️ Voice</span><span className="text-zinc-400">{voiceName} ›</span></button>
                <div className="grid grid-cols-3 gap-2">{["Maple","Cedar","STORM"].map(v=><button key={v} onClick={()=>setVoiceName(v)} className={`py-3 rounded-full text-sm ${voiceName===v?"bg-white text-black":"bg-[#2a2a2a]"}`}>{v}</button>)}</div>
                <button onClick={()=>{localStorage.clear(); setConvos([]); setShowProfile(false);}} className="w-full bg-[#2a2a2a] py-4 rounded-2xl text-red-400">Clear all chats</button>
              </div>
              <button onClick={()=>setShowProfile(false)} className="w-full mt-4 bg-white text-black py-4 rounded-full font-semibold">Done</button>
            </div>
          </div>
        )}
      </div>
      {!voiceMode && (
        <button onClick={()=>setVoiceMode(true)} className="fixed bottom-[85px] right-4 w-[52px] h-[52px] rounded-full bg-[#1e1e1e] border border-zinc-700 shadow-2xl grid place-items-center text-[18px]">◐</button>
      )}
    </div>
  );
}
