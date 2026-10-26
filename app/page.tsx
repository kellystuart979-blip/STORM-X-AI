"use client";
import { useState, useRef, useEffect, useMemo } from "react";

type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; };
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
  const [voiceSettings,setVoiceSettings]=useState(false);
  const [voiceName,setVoiceName]=useState("Maple");
  const [lang,setLang]=useState("Auto-detect");
  const [audioOut,setAudioOut]=useState("Speaker");
  const [listening,setListening]=useState(false);
  const [imageMode,setImageMode]=useState(false);
  const [gallery,setGallery]=useState<string[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const abortRef=useRef<AbortController|null>(null);
  const active = useMemo(()=> convos.find(c=>c.id===activeId), [convos, activeId]);
  const msgs = active?.messages || [];

  useEffect(()=>{
    const s = localStorage.getItem("stormx-v4"); if(s){ try{ const p=JSON.parse(s); setConvos(p); if(p[0]) setActiveId(p[0].id);}catch{}}
    const g = localStorage.getItem("stormx-gal-v4"); if(g){ try{ setGallery(JSON.parse(g)); }catch{}}
  },[]);
  useEffect(()=>{ if(convos.length) localStorage.setItem("stormx-v4", JSON.stringify(convos.slice(0,30))); },[convos]);
  useEffect(()=>{ localStorage.setItem("stormx-gal-v4", JSON.stringify(gallery.slice(0,30))); },[gallery]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);

  const newChat = ()=>{ const id=Date.now()+""; setConvos(p=>[{id, title:"New chat", messages:[]}, ...p]); setActiveId(id); setSidebar(false); };

  const startSTT = ()=>{
    const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition;
    if(!R){ alert("Voice not supported"); return; }
    const rec = new R(); rec.lang="en-US"; rec.interimResults=false; rec.start(); setListening(true);
    rec.onresult=(e:any)=>{ setInput(e.results[0][0].transcript); setListening(false); };
    rec.onerror=()=> setListening(false);
    rec.onend=()=> setListening(false);
  };

  const speakLast = ()=>{
    if(!("speechSynthesis" in window)) return;
    const last = [...msgs].reverse().find(m=>m.role==="assistant");
    if(!last) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(last.content.slice(0,800));
    u.rate=1; speechSynthesis.speak(u);
  };

  const send = async (custom?:string, imgData?:string)=>{
    const txt=(custom??input).trim(); if(!txt && !imgData) return;
    let cid=activeId; if(!cid){ cid=Date.now()+""; setConvos(p=>[{id:cid, title:txt.slice(0,28), messages:[]}, ...p]); setActiveId(cid); }
    if(txt.startsWith("/image")||imageMode){
      const prompt=txt.replace("/image","").trim(); if(!prompt) return;
      const u:Msg={id:Date.now()+"", role:"user", content:prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{
        const r=await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})});
        const d=await r.json(); if(!r.ok) throw new Error(d.error);
        setGallery(g=>[d.image,...g]);
        const b:Msg={id:Date.now()+"b", role:"assistant", images:[d.image], content:`Generated: ${prompt}`};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
      setLoading(false); return;
    }
    const u:Msg={id:Date.now()+"", role:"user", content:txt, image:imgData};
    setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?txt.slice(0,28):c.title, messages:[...c.messages,u]}:c));
    setInput(""); setLoading(true); setShowPlus(false);
    const ac=new AbortController(); abortRef.current=ac;
    try{
      const curr=convos.find(c=>c.id===cid);
      const history=[...(curr?.messages||[]),u].slice(-10).map(m=>({role:m.role, content:m.content}));
      const res=await fetch("/api/chat",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:history, model:thinkHarder?"o1-mini":modelId, thinkHarder, image:imgData}), signal:ac.signal});
      const d=await res.json(); if(!res.ok) throw new Error(d.error||d.reply);
      const b:Msg={id:Date.now()+"b", role:"assistant", content:d.reply};
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
    }catch(e:any){ if(e.name!=="AbortError"){ const b:Msg={id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); } }
    setLoading(false);
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return; if(f.size>5*1024*1024){ alert("Max 5MB"); return; }
    const r=new FileReader(); r.onload=()=>{ const s=r.result as string; send(`File ${f.name}`, s.startsWith("data:image")?s:undefined); };
    if(f.type.startsWith("image/")) r.readAsDataURL(f); else r.readAsText(f); if(fileRef.current) fileRef.current.value="";
  };

  return (
    <div className="h-[100dvh] w-screen flex bg-black text-white overflow-hidden">
      <aside className={sidebar ? "fixed z-30 h-full w-[270px] bg-[#171717] flex flex-col translate-x-0" : "fixed z-30 h-full w-[270px] bg-[#171717] flex flex-col -translate-x-full md:translate-x-0"}>
        <div className="p-3 flex flex-col h-full">
          <div className="flex justify-between items-center"><div className="flex gap-2 items-center"><div className="w-7 h-7 rounded-full bg-white text-black grid place-items-center font-bold text-xs">S</div><span className="text-sm font-semibold">STORM X</span></div><button onClick={()=>setSidebar(false)} className="w-8 h-8 text-zinc-400">✕</button></div>
          <button onClick={newChat} className="mt-4 w-full bg-[#212121] rounded-full py-2.5 text-sm">+ New chat</button>
          <div className="flex-1 overflow-y-auto mt-4 space-y-1 text-sm">{convos.map(c=><div key={c.id} className={`flex justify-between px-3 py-2 rounded-lg hover:bg-[#212121] ${activeId===c.id?"bg-[#212121]":""}`}><span onClick={()=>{setActiveId(c.id); setSidebar(false);}} className="truncate">{c.title}</span><span onClick={()=>setConvos(p=>p.filter(x=>x.id!==c.id))} className="text-zinc-500">×</span></div>)}</div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col bg-black min-w-0 relative">
        <div className="h-[56px] flex items-center justify-between px-3">
          <div className="flex gap-2 items-center">
            <button onClick={()=>setSidebar(!sidebar)} className="w-9 h-9 rounded-full bg-[#2f2f2f] grid place-items-center">☰</button>
            <button className="px-3 py-1.5 rounded-full bg-[#2f2f2f] text-[13px] text-blue-400 flex items-center gap-1">✦ Get Plus</button>
          </div>
          <div className="flex gap-2 items-center">
            <select value={modelId} onChange={e=>setModelId(e.target.value)} className="bg-[#2f2f2f] rounded-full px-3 py-1.5 text-[12px] outline-none">
              {MODELS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={()=>setThinkHarder(!thinkHarder)} className={`w-9 h-9 rounded-full grid place-items-center ${thinkHarder?"bg-white text-black":"bg-[#2f2f2f]"}`}>🧠</button>
            <button onClick={speakLast} className="w-9 h-9 rounded-full bg-[#2f2f2f]">◐</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {msgs.length===0 ? <div className="h-full"/> : (
            <div className="max-w-[760px] mx-auto px-4 py-6 space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`${m.role==="user"?"flex justify-end":""}`}>
                  <div className={`${m.role==="user"?"bg-[#2f2f2f] rounded-[24px] px-4 py-3 max-w-[85%] text-[15px]":"w-full text-[15px] leading-7 whitespace-pre-wrap"}`}>
                    {m.image && <img src={m.image} className="max-w-[300px] rounded-xl mb-2"/>}
                    {m.images && m.images.map((im,j)=><img key={j} src={im} className="max-w-full rounded-2xl mb-2"/>)}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && <div className="text-sm text-zinc-500">Thinking...</div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>
        <div className="p-3 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-[760px] mx-auto">
            {showPlus && (
              <div className="mb-3 bg-[#2f2f2f] rounded-2xl p-2 w-[250px] border border-zinc-800">
                <button onClick={()=>fileRef.current?.click()} className="w-full flex gap-3 px-3 py-3 hover:bg-[#3a3a3a] rounded-xl text-sm">📷 Camera</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full flex gap-3 px-3 py-3 hover:bg-[#3a3a3a] rounded-xl text-sm">🖼️ Photos</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full flex gap-3 px-3 py-3 hover:bg-[#3a3a3a] rounded-xl text-sm">📁 Files</button>
                <button onClick={()=>{setImageMode(!imageMode); setShowPlus(false);}} className="w-full flex gap-3 px-3 py-3 hover:bg-[#3a3a3a] rounded-xl text-sm">🎨 Create image {imageMode?"• ON":""}</button>
              </div>
            )}
            <div className="bg-[#2f2f2f] rounded-full flex items-center gap-2 px-2 py-2">
              <button onClick={()=>setShowPlus(!showPlus)} className="w-8 h-8 rounded-full bg-[#3a3a3a] grid place-items-center">+</button>
              <input ref={fileRef} type="file" accept="image/*,text/*,.json,.js,.ts" hidden onChange={handleFile}/>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){ e.preventDefault(); send(); }}} placeholder={imageMode?"Describe image...":"Ask anything"} className="flex-1 bg-transparent outline-none text-[15px] placeholder-zinc-400"/>
              <button onClick={startSTT} className={`w-8 h-8 rounded-full grid place-items-center ${listening?"bg-red-500":"bg-transparent"}`}>🎤</button>
              <button onClick={()=>send()} className={`w-8 h-8 rounded-full grid place-items-center font-bold ${input.trim() ? "bg-[#5aa8ff] text-black" : "bg-[#5a5a5a] text-zinc-300"}`}>↑</button>
            </div>
          </div>
        </div>
        {voiceMode && (
          <div className="absolute inset-0 z-50 bg-black flex flex-col">
            <div className="h-[56px] flex justify-between items-center px-4">
              <button onClick={()=>setVoiceMode(false)} className="w-10 h-10 rounded-full bg-[#2f2f2f] grid place-items-center">☰</button>
              <button onClick={()=>setVoiceSettings(!voiceSettings)} className="w-10 h-10 rounded-full bg-[#2f2f2f] grid place-items-center">⚙️</button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="relative w-[260px] h-[260px] rounded-full overflow-hidden bg-gradient-to-b from-[#1a3a7a] via-[#5a7fd0] to-[#a0b8e8] animate-pulse shadow-[0_0_80px_rgba(90,168,255,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-t from-white/60 to-transparent rounded-full blur-[1px]"/>
                <div className="absolute top-[40%] left-[10%] right-[10%] h-[40%] bg-white/70 rounded-full blur-[20px]"/>
              </div>
              {loading && <div className="mt-10 text-[14px] text-zinc-400">Poor connection</div>}
              {!loading && <div className="mt-10 text-[14px] text-zinc-500">Listening • {voiceName}</div>}
            </div>
            <div className="p-4 pb-[calc(16px+env(safe-area-inset-bottom))] flex items-center gap-3 justify-center">
              <div className="flex-1 max-w-[520px] bg-[#2f2f2f] rounded-full flex items-center gap-2 px-3 py-3">
                <span className="w-8 h-8 rounded-full bg-[#3a3a3a] grid place-items-center">+</span>
                <input placeholder="Ask ChatGPT" className="flex-1 bg-transparent outline-none text-[15px]" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter"){ send(); setVoiceMode(false); }}}/>
              </div>
              <button onClick={startSTT} className="w-12 h-12 rounded-full bg-[#2f2f2f] grid place-items-center">🎤</button>
              <button onClick={()=>{ setVoiceMode(false); }} className="w-12 h-12 rounded-full bg-white text-black grid place-items-center text-xl font-bold">✕</button>
            </div>
            {voiceSettings && (
              <div className="absolute bottom-0 left-0 right-0 bg-[#2f2f2f] rounded-t-[24px] p-4">
                <div className="w-10 h-1 bg-zinc-600 rounded-full mx-auto mb-4"/>
                <h3 className="text-center font-semibold mb-4">Settings</h3>
                <div className="bg-[#1e1e1e] rounded-[20px] overflow-hidden border border-zinc-700">
                  <button className="w-full flex justify-between items-center px-4 py-4 border-b border-zinc-700"><span className="flex gap-3 items-center">🎙️ Voice</span><span className="flex gap-2 items-center text-zinc-400">{voiceName} <span>›</span></span></button>
                  <button onClick={()=> setLang(lang==="Auto-detect"?"English":"Auto-detect")} className="w-full flex justify-between items-center px-4 py-4 border-b border-zinc-700"><span className="flex gap-3 items-center">🌐 Language</span><span className="flex gap-2 items-center text-zinc-400">{lang} <span>▼</span></span></button>
                  <button onClick={()=> setAudioOut(audioOut==="Speaker"?"Phone":"Speaker")} className="w-full flex justify-between items-center px-4 py-4"><span className="flex gap-3 items-center">🔊 Change audio output</span><span className="flex gap-2 items-center text-zinc-400">{audioOut} <span>▼</span></span></button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {["Maple","Cedar","Orbit"].map(v=><button key={v} onClick={()=>setVoiceName(v)} className={`py-3 rounded-full text-sm ${voiceName===v?"bg-white text-black":"bg-[#3a3a3a]"}`}>{v}</button>)}
                </div>
                <button onClick={()=>setVoiceSettings(false)} className="w-full mt-4 py-3 rounded-full bg-white text-black">Done</button>
              </div>
            )}
          </div>
        )}
      </div>
      {!voiceMode && (
        <button onClick={()=>setVoiceMode(true)} className="fixed bottom-[80px] right-4 w-14 h-14 rounded-full bg-white text-black shadow-2xl grid place-items-center text-xl md:hidden">◐</button>
      )}
    </div>
  );
}
