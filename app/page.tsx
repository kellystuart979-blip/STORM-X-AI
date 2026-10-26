"use client";
import { useState, useRef, useEffect, useMemo } from "react";
type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; video?:string; liked?: boolean | null };
type Convo = { id:string; title:string; messages:Msg[]; };
const VOICES = [
  { id:"alloy", name:"Alloy", desc:"Lady robot - smooth echo" },
  { id:"echo", name:"Echo", desc:"Your main - lady robot smooth" },
  { id:"fable", name:"Fable", desc:"Soft lady - calm" },
  { id:"onyx", name:"Onyx", desc:"Deep lady - steady" },
  { id:"nova", name:"Nova", desc:"Warm lady - friendly" },
  { id:"shimmer", name:"Shimmer", desc:"Clear lady - smooth low pitch" },
];
export default function Page(){
  const [convos,setConvos]=useState<Convo[]>([]);
  const [activeId,setActiveId]=useState("");
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [sidebar,setSidebar]=useState(false);
  const [showPlus,setShowPlus]=useState(false);
  const [voiceMode,setVoiceMode]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [voiceId,setVoiceId]=useState("echo");
  const [search,setSearch]=useState("");
  const [listening,setListening]=useState(false);
  const [imageMode,setImageMode]=useState(false);
  const [videoMode,setVideoMode]=useState(false);
  const [editingId,setEditingId]=useState<string | null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const active = useMemo(()=> convos.find(c=>c.id===activeId), [convos, activeId]);
  const msgs = active?.messages || [];
  useEffect(()=>{ const s=localStorage.getItem("stormx-final"); if(s){ try{ const p=JSON.parse(s); setConvos(p); if(p[0]) setActiveId(p[0].id);}catch{} } },[]);
  useEffect(()=>{ if(convos.length) localStorage.setItem("stormx-final", JSON.stringify(convos.slice(0,50))); },[convos]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);
  const getTitle=(txt:string)=>{ const clean=txt.replace(/^\/video|^\/image/i,"").trim(); const words=clean.split(" ").slice(0,5).join(" "); return words.length>3?words:"New chat"; };
  const newChat=()=>{ const id=Date.now()+""; setConvos(p=>[{id, title:"New chat", messages:[]}, ...p]); setActiveId(id); setSidebar(false); };
  const speak=(text:string)=>{ window.speechSynthesis.cancel(); const utter=new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g," code ")); utter.rate=0.92; utter.pitch=0.88; window.speechSynthesis.speak(utter); };
  const startSTT=()=>{ const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition; if(!R){ alert("Use Chrome"); return; } const rec=new R(); rec.lang="en-US"; rec.start(); setListening(true); rec.onresult=(e:any)=>{ const txt=e.results[0][0].transcript; if(voiceMode) send(txt); else setInput(txt); setListening(false); }; rec.onerror=()=>setListening(false); rec.onend=()=>{ setListening(false); if(voiceMode) setTimeout(()=>{ if(voiceMode) startSTT(); },800); }; };
  const copyText=(t:string)=>{ navigator.clipboard.writeText(t); };
  const startEdit=(m:Msg)=>{ setEditingId(m.id); setInput(m.content); };
  const cancelEdit=()=>{ setEditingId(null); setInput(""); };
  const send=async(custom?:string, imgData?:string)=>{
    const txt=(custom??input).trim(); if(!txt && !imgData) return;
    let cid=activeId; if(!cid){ cid=Date.now()+""; const title=getTitle(txt); setConvos(p=>[{id:cid, title, messages:[]}, ...p]); setActiveId(cid); }
    if(editingId){
      setConvos(p=>p.map(c=>c.id===cid?{...c, messages:c.messages.map(m=>m.id===editingId?{...m, content:txt}:m)}:c));
      setEditingId(null); setInput(""); setShowPlus(false);
      const curr=convos.find(c=>c.id===cid); const history=[...(curr?.messages||[]).filter(m=>m.id!==editingId), {id:editingId, content:txt} as any].slice(-12).map(m=>({role:"user" as const, content:(m as any).content||txt}));
      setLoading(true);
      try{ const res=await fetch("/api/chat",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:history})}); const d=await res.json(); const b:Msg={id:Date.now()+"b", role:"assistant", content:d.reply}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages.filter(mm=>mm.id!==editingId), {id:editingId, role:"user", content:txt} as Msg, b]}:c)); }catch{} setLoading(false); return;
    }
    if(txt.toLowerCase().startsWith("/video")||videoMode){
      const prompt=txt.replace(/^\/video\s*/i,"").trim()||"cinematic storm x";
      const u:Msg={id:Date.now()+"", role:"user", content:prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?getTitle(prompt):c.title, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setVideoMode(false);
      try{
        const canvas=document.createElement("canvas"); canvas.width=1280; canvas.height=720;
        const ctx=canvas.getContext("2d")!; const stream=canvas.captureStream(30);
        const rec=new MediaRecorder(stream,{mimeType:"video/webm"}); const chunks:Blob[]=[];
        rec.ondataavailable=e=>chunks.push(e.data);
        const videoPromise=new Promise<string>(res=>{ rec.onstop=()=>{ const b=new Blob(chunks,{type:"video/webm"}); res(URL.createObjectURL(b)); }; });
        rec.start(); let f=0;
        const anim=()=>{
          const grad=ctx.createLinearGradient(0,0,1280,720);
          grad.addColorStop(0,`hsl(${220+f%60},85%,25%)`);
          grad.addColorStop(1,`hsl(${280+f%40},80%,10%)`);
          ctx.fillStyle=grad; ctx.fillRect(0,0,1280,720);
          ctx.fillStyle="white"; ctx.font="bold 52px sans-serif"; ctx.textAlign="center";
          ctx.fillText("STORM X AI",640,320);
          ctx.font="22px sans-serif"; ctx.fillStyle="rgba(255,255,255,0.8)";
          ctx.fillText(prompt.slice(0,90),640,400);
          ctx.fillRect(0,700, (f/180)*1280, 6);
          f++; if(f<180) requestAnimationFrame(anim); else rec.stop();
        }; anim();
        const videoUrl=await videoPromise;
        const b:Msg={id:Date.now()+"b", role:"assistant", content:`Video: ${prompt}`, video:videoUrl};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch{} setLoading(false); return;
    }
    if(txt.toLowerCase().startsWith("/image")||imageMode){
      const prompt=txt.replace(/^\/image\s*/i,"").trim();
      const u:Msg={id:Date.now()+"", role:"user", content:prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?getTitle(prompt):c.title, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{ const r=await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})}); const d=await r.json(); const b:Msg={id:Date.now()+"b", role:"assistant", images:[d.image], content:prompt}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }catch{} setLoading(false); return;
    }
    const u:Msg={id:Date.now()+"", role:"user", content:txt, image:imgData};
    setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?getTitle(txt):c.title, messages:[...c.messages,u]}:c));
    setInput(""); setLoading(true); setShowPlus(false);
    try{ const curr=convos.find(c=>c.id===cid); const history=[...(curr?.messages||[]),u].slice(-12).map(m=>({role:m.role, content:m.content})); const res=await fetch("/api/chat",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:history})}); const d=await res.json(); if(d.reply!=="SKIP_VIDEO_CHAT_API"){ const b:Msg={id:Date.now()+"b", role:"assistant", content:d.reply}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); speak(d.reply); } }catch{} setLoading(false);
  };
  const handleFile=(e:React.ChangeEvent<HTMLInputElement>)=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ const s=r.result as string; send(`File ${f.name}`, s.startsWith("data:image")?s:undefined); }; if(f.type.startsWith("image/")) r.readAsDataURL(f); else r.readAsText(f); if(fileRef.current) fileRef.current.value=""; };
  const filtered=convos.filter(c=> c.title.toLowerCase().includes(search.toLowerCase()) || c.messages.some(m=>m.content.toLowerCase().includes(search.toLowerCase())));
  return (
    <div className="h-[100dvh] w-screen flex bg-black text-white overflow-hidden">
      <aside className={`${sidebar?"translate-x-0":"-translate-x-full md:translate-x-0"} fixed z-30 h-full w-[260px] bg-[#0a0a0a] border-r border-white/10 flex flex-col transition-transform duration-200`}>
        <div className="p-3 flex flex-col h-full">
          <div className="flex items-center justify-between px-1 py-2"><span className="text-[18px] font-semibold">STORM X</span><button onClick={()=>setSearch(s=>s?"":" ")} className="w-8 h-8 rounded-full bg-[#1a1a1a]">S</button></div>
          {search!=="" && <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search" className="mt-2 bg-[#1a1a1a] rounded-full px-4 py-2 text-[14px] outline-none"/>}
          <div className="flex-1 overflow-y-auto mt-4">{filtered.map(c=>(<div key={c.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#1a1a1a] ${activeId===c.id?"bg-[#1a1a1a]":""}`}><span onClick={()=>{setActiveId(c.id); setSidebar(false);}} className="truncate text-[14px] flex-1">{c.title}</span><button onClick={()=>setConvos(p=>p.filter(x=>x.id!==c.id))} className="text-zinc-600">x</button></div>))}</div>
          <div className="pt-2 flex items-center gap-2"><button onClick={newChat} className="flex-1 bg-[#1a1a1a] rounded-full py-2.5 text-[14px]">Chat</button><button onClick={()=>setShowSettings(true)} className="w-10 h-10 rounded-full bg-[#1a1a1a]">S</button><button onClick={()=>{ setVoiceMode(!voiceMode); if(!voiceMode) setTimeout(()=>startSTT(),300); else window.speechSynthesis.cancel(); }} className={`w-10 h-10 rounded-full ${voiceMode?"bg-white text-black":"bg-[#1a1a1a]"}`}>V</button></div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 bg-black md:ml-[260px]">
        <div className="h-[52px] flex items-center px-3 md:hidden"><button onClick={()=>setSidebar(true)}>|||</button></div>
        <div className="flex-1 overflow-y-auto">
          {msgs.length===0 ? <div className="h-full flex flex-col items-center justify-center px-4"><div className="text-[28px] font-semibold">What can I help with?</div></div> : (
            <div className="max-w-[768px] mx-auto px-4 py-6 space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`${m.role==="user"?"flex justify-end":""}`}>
                  <div className="w-full">
                    <div className={`${m.role==="user"?"bg-[#1e6bff] text-white rounded-[24px] px-5 py-3 max-w-[75%] ml-auto text-[15px] shadow-lg":"bg-[#121212] border border-white/10 text-white rounded-[20px] px-5 py-3 w-full text-[15px] leading-7 whitespace-pre-wrap"}`}>
                      {m.image && <img src={m.image} className="max-w-[300px] rounded-xl mb-2" />}
                      {m.images && m.images.map((im,j)=><img key={j} src={im} className="max-w-full rounded-xl" />)}
                      {m.video && <video src={m.video} controls className="max-w-full rounded-xl mt-2" />}
                      {m.content}
                    </div>
                    {m.role==="user" ? (
                      <div className="flex items-center gap-1 mt-2 justify-end px-1">
                        <button onClick={()=>startEdit(m)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400" title="Edit">✏️</button>
                        <button onClick={()=>copyText(m.content)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400" title="Copy">⎙</button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 mt-3">
                        <button onClick={()=>copyText(m.content)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">⎙</button>
                        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">👍</button>
                        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">👎</button>
                        <button onClick={()=>speak(m.content)} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">🔊</button>
                        <button onClick={()=>{ if(navigator.share) navigator.share({text:m.content}); else copyText(m.content); }} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">↗</button>
                        <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-zinc-400">⋮</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && <div className="flex gap-1"><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></span><span className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></span></div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>
        <div className="p-3 bg-black border-t border-white/10">
          <div className="max-w-[768px] mx-auto">
            {editingId && <div className="mb-2 text-[12px] text-blue-400">Editing message - <button onClick={cancelEdit} className="underline">Cancel</button></div>}
            {showPlus&&<div className="mb-3 bg-[#1a1a1a] rounded-2xl p-2 w-[280px] border border-white/10"><button onClick={()=>fileRef.current?.click()} className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-xl text-[14px]">Add photos</button><button onClick={()=>{setImageMode(!imageMode); setVideoMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-xl text-[14px]">Create image {imageMode?"- ON":""}</button><button onClick={()=>{setVideoMode(!videoMode); setImageMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-2.5 hover:bg-white/10 rounded-xl text-[14px]">Create video {videoMode?"- ON":""}</button></div>}
            <div className="bg-[#1a1a1a] border border-white/10 rounded-[26px] flex items-center gap-2 px-3 py-2"><button onClick={()=>setShowPlus(!showPlus)} className="w-8 h-8 rounded-full bg-white/10">+</button><input ref={fileRef} type="file" hidden onChange={handleFile}/><textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} placeholder={editingId?"Edit message...":"Ask anything"} rows={1} className="flex-1 bg-transparent outline-none text-[15px] resize-none max-h-[120px] py-2"/><button onClick={startSTT} className={`w-8 h-8 rounded-full ${listening?"bg-red-500":"bg-white/10"}`}>M</button><button onClick={()=>send()} className={`w-8 h-8 rounded-full ${input.trim()?"bg-white text-black":"bg-white/20"}`}>{editingId?"✓":"↑"}</button></div>
          </div>
        </div>
        {voiceMode&&<div className="absolute inset-0 z-50 bg-black flex flex-col"><div className="h-[52px] flex justify-between px-4 items-center"><button onClick={()=>{ setVoiceMode(false); window.speechSynthesis.cancel(); }}>X Close</button><div className="text-[13px] text-zinc-400">STORM X Voice - {VOICES.find(v=>v.id===voiceId)?.name}</div><div className="w-8"/></div><div className="flex-1 flex flex-col items-center justify-center"><div className={`w-[160px] h-[160px] rounded-full bg-white/10 flex items-center justify-center ${listening?"animate-pulse":""}`}><div className="w-[100px] h-[100px] rounded-full bg-white flex items-center justify-center"><div className="flex gap-1"><span className="w-1 h-6 bg-black rounded-full animate-bounce"></span><span className="w-1 h-8 bg-black rounded-full animate-bounce"></span><span className="w-1 h-5 bg-black rounded-full animate-bounce"></span></div></div></div><div className="mt-6 text-[14px] text-zinc-400">{listening?"Listening...":"Talk to me"}</div></div><div className="p-4 flex justify-center"><button onClick={startSTT} className="bg-white text-black rounded-full px-6 py-3 text-[14px]">{listening?"Stop":"Start talking"}</button></div></div>}
        {showSettings&&<div className="absolute inset-0 z-[60] bg-black/60 flex items-center justify-center p-4" onClick={()=>setShowSettings(false)}><div className="w-full max-w-[400px] bg-[#1a1a1a] border border-white/10 rounded-2xl p-5" onClick={e=>e.stopPropagation()}><div className="flex justify-between items-center mb-5"><div className="font-semibold">Settings - 6 Voices lady robot echo smooth</div><button onClick={()=>setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/10">X</button></div><div className="space-y-2">{VOICES.map(v=><button key={v.id} onClick={()=>setVoiceId(v.id)} className={`w-full text-left px-4 py-3 rounded-xl ${voiceId===v.id?"bg-white text-black":"bg-[#3a3a3a]"}`}><div className="font-medium">{v.name}</div><div className="text-[12px] opacity-70">{v.desc} {voiceId===v.id?"- ON":""}</div></button>)}</div><button onClick={()=>setShowSettings(false)} className="w-full mt-4 bg-white text-black py-3 rounded-full">Done</button></div></div>}
      </div>
    </div>
  );
}
