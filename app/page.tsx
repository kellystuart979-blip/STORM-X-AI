"use client";
import { useState, useRef, useEffect, useMemo } from "react";

type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; video?:string; };
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
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const synthRef=useRef<SpeechSynthesisUtterance | null>(null);

  const active = useMemo(()=> convos.find(c=>c.id===activeId), [convos, activeId]);
  const msgs = active?.messages || [];

  useEffect(()=>{
    const s = localStorage.getItem("stormx-final");
    if(s){ try{ const p=JSON.parse(s); setConvos(p); if(p[0]) setActiveId(p[0].id);}catch{} }
  },[]);
  useEffect(()=>{ if(convos.length) localStorage.setItem("stormx-final", JSON.stringify(convos.slice(0,50))); },[convos]);
  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);

  const getTitle = (txt:string)=>{
    const clean = txt.replace(/^\/video|^\/image/i,"").trim();
    const words = clean.split(" ").slice(0,5).join(" ");
    return words.length>3 ? words : "New chat";
  };

  const newChat = ()=>{ const id=Date.now()+""; setConvos(p=>[{id, title:"New chat", messages:[]}, ...p]); setActiveId(id); setSidebar(false); };

  const speak = (text:string)=>{
    if(!voiceMode) return;
    if(synthRef.current) window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.replace(/```[\s\S]*?```/g," code "));
    const voices = window.speechSynthesis.getVoices();
    let selected = voices.find(v=> v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("samantha"));
    if(selected) utter.voice = selected;
    utter.rate = 0.92;
    utter.pitch = 0.88;
    utter.volume = 1;
    synthRef.current = utter;
    window.speechSynthesis.speak(utter);
  };

  const startSTT = ()=>{
    const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition;
    if(!R){ alert("Use Chrome"); return; }
    const rec = new R(); rec.lang="en-US"; rec.continuous = voiceMode; rec.interimResults=false;
    rec.start(); setListening(true);
    rec.onresult=(e:any)=>{
      const txt = e.results[0][0].transcript;
      if(voiceMode){
        send(txt);
      }else{
        setInput(txt);
      }
      setListening(false);
    };
    rec.onerror=()=> setListening(false);
    rec.onend=()=>{
      setListening(false);
      if(voiceMode) setTimeout(()=>{ if(voiceMode) startSTT(); }, 800);
    };
  };

  const send = async (custom?:string, imgData?:string)=>{
    const txt=(custom??input).trim(); if(!txt && !imgData) return;
    let cid=activeId; if(!cid){ cid=Date.now()+""; const title=getTitle(txt); setConvos(p=>[{id:cid, title, messages:[]}, ...p]); setActiveId(cid); }

    if(txt.toLowerCase().startsWith("/video")||videoMode){
      const prompt = txt.replace(/^\/video\s*/i, "").trim() || "cinematic";
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
        const anim=()=>{ ctx.fillStyle="#000"; ctx.fillRect(0,0,1280,720); const g=ctx.createRadialGradient(640,360,0,640,360,500); g.addColorStop(0,`hsl(${220+f%60},85%,60%)`); g.addColorStop(1,"#000"); ctx.fillStyle=g; ctx.beginPath(); ctx.arc(640,360,200+Math.sin(f/12)*20,0,Math.PI*2); ctx.fill(); ctx.fillStyle="#fff"; ctx.font="bold 24px sans-serif"; ctx.textAlign="center"; ctx.fillText(prompt.slice(0,70),640,680); f++; if(f<150) requestAnimationFrame(anim); else rec.stop(); }; anim();
        const videoUrl=await videoPromise;
        const b:Msg={id:Date.now()+"b", role:"assistant", content:`Video created: ${prompt}`, video:videoUrl};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:e.message}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
      setLoading(false); return;
    }

    if(txt.toLowerCase().startsWith("/image")||imageMode){
      const prompt=txt.replace(/^\/image\s*/i, "").trim();
      const u:Msg={id:Date.now()+"", role:"user", content:prompt, image:imgData};
      setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?getTitle(prompt):c.title, messages:[...c.messages,u]}:c));
      setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{
        const r=await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})});
        const d=await r.json(); const b:Msg={id:Date.now()+"b", role:"assistant", images:[d.image], content:prompt};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
      }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:e.message}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
      setLoading(false); return;
    }

    const u:Msg={id:Date.now()+"", role:"user", content:txt, image:imgData};
    setConvos(p=>p.map(c=>c.id===cid?{...c, title:c.title==="New chat"?getTitle(txt):c.title, messages:[...c.messages,u]}:c));
    setInput("");
    setLoading(true);
    setShowPlus(false);

    try{
      const curr=convos.find(c=>c.id===cid);
      const history=[...(curr?.messages||[]),u].slice(-12).map(m=>({role:m.role, content:m.content}));
      const res=await fetch("/api/chat",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({messages:history, model:"groq-free"})});
      const d=await res.json();
      if(d.reply!=="SKIP_VIDEO_CHAT_API"){
        const b:Msg={id:Date.now()+"b", role:"assistant", content:d.reply};
        setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c));
        speak(d.reply);
      }
    }catch(e:any){ const b:Msg={id:Date.now()+"b", role:"assistant", content:e.message}; setConvos(p=>p.map(c=>c.id===cid?{...c, messages:[...c.messages,b]}:c)); }
    setLoading(false);
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0]; if(!f) return;
    const r=new FileReader(); r.onload=()=>{ const s=r.result as string; send(`File ${f.name}`, s.startsWith("data:image")?s:undefined); };
    if(f.type.startsWith("image/")) r.readAsDataURL(f); else r.readAsText(f); if(fileRef.current) fileRef.current.value="";
  };

  const filtered = convos.filter(c=> c.title.toLowerCase().includes(search.toLowerCase()) || c.messages.some(m=>m.content.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="h-[100dvh] w-screen flex bg-[#212121] text-white overflow-hidden">
      {/* Sidebar ChatGPT style */}
      <aside className={`${sidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"} fixed z-30 h-full w-[260px] bg-[#171717] flex flex-col transition-transform duration-200 border-r border-white/[0.05]`}>
        <div className="p-3 flex flex-col h-full">
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-[18px] font-semibold tracking-tight">STORM X</span>
            <div className="flex gap-1">
              <button onClick={()=>setSearch(s=>s? "": " ")} className="w-8 h-8 rounded-full hover:bg-white/[0.08] grid place-items-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              </button>
              <button onClick={()=>setSidebar(false)} className="w-8 h-8 rounded-full hover:bg-white/[0.08] grid place-items-center md:hidden">X</button>
            </div>
          </div>

          {search!==null && search!=="" && (
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search chats" className="mt-2 bg-[#2f2f2f] rounded-full px-4 py-2 text-[14px] outline-none placeholder-zinc-500"/>
          )}

          <div className="flex-1 overflow-y-auto mt-4 space-y-6">
            <div className="space-y-1">
              <div className="text-[12px] text-zinc-500 font-semibold px-3 py-1">Recents</div>
              {filtered.map(c=>(
                <div key={c.id} className={`group flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#212121] cursor-pointer ${activeId===c.id?"bg-[#212121]":""}`}>
                  <span className="text-zinc-500"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg></span>
                  <span onClick={()=>{setActiveId(c.id); setSidebar(false);}} className="truncate text-[14px] flex-1">{c.title}</span>
                  <button onClick={()=>setConvos(p=>p.filter(x=>x.id!==c.id))} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-white px-1">x</button>
                </div>
              ))}
              {filtered.length===0 && <div className="px-3 text-[13px] text-zinc-600">No chats</div>}
            </div>
          </div>

          {/* Bottom ChatGPT style: Chat button + Settings + Voice */}
          <div className="pt-2 flex items-center gap-2">
            <button onClick={newChat} className="flex-1 bg-[#2f2f2f] hover:bg-[#3a3a3a] text-white rounded-full py-2.5 px-4 flex items-center justify-center gap-2 text-[14px] font-medium transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              Chat
            </button>
            <button onClick={()=>setShowSettings(true)} className="w-10 h-10 rounded-full bg-[#2f2f2f] hover:bg-[#3a3a3a] grid place-items-center transition">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 9 15a1.65 1.65 0 0 0-1-1.51V13a2 2 0 0 1 4 0v.49c.35.25.68.57 1 1.01Z"/></svg>
            </button>
            <button onClick={()=>{ setVoiceMode(!voiceMode); if(!voiceMode) setTimeout(()=>startSTT(),300); else window.speechSynthesis.cancel(); }} className={`w-10 h-10 rounded-full grid place-items-center transition ${voiceMode?"bg-white text-black":"bg-[#2f2f2f] hover:bg-[#3a3a3a]"}`}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main ChatGPT dark */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#212121] md:ml-[260px]">
        <div className="h-[52px] flex items-center px-3 md:hidden">
          <button onClick={()=>setSidebar(true)} className="w-9 h-9 grid place-items-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {msgs.length===0 ? (
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="text-[28px] font-semibold">What can I help with?</div>
            </div>
          ) : (
            <div className="max-w-[768px] mx-auto px-4 md:px-6 py-6 space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`${m.role==="user"?"flex justify-end":"flex justify-start"}`}>
                  <div className={`${m.role==="user"?"bg-[#303030] rounded-[24px] px-5 py-3 max-w-[75%] text-[15px]":"w-full text-[15px] leading-7 whitespace-pre-wrap text-[#ececec]"}`}>
                    {m.image && <img src={m.image} className="max-w-[300px] rounded-xl mb-2"/>}
                    {m.images && m.images.map((im,j)=><img key={j} src={im} className="max-w-full rounded-xl"/>)}
                    {m.video && <video src={m.video} controls className="max-w-full rounded-xl mt-2"/>}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-1 items-center">
                  <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-white/70 rounded-full animate-bounce"></span>
                </div>
              )}
              <div ref={endRef}/>
            </div>
          )}
        </div>

        <div className="p-3 md:p-4 bg-[#212121]">
          <div className="max-w-[768px] mx-auto">
            {showPlus && (
              <div className="mb-3 bg-[#2f2f2f] rounded-2xl p-2 w-[280px] border border-white/[0.06]">
                <button onClick={()=>fileRef.current?.click()} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] rounded-xl text-[14px]">Add photos and files</button>
                <button onClick={()=>{setImageMode(!imageMode); setVideoMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] rounded-xl text-[14px]">Create image {imageMode?"- On":""}</button>
                <button onClick={()=>{setVideoMode(!videoMode); setImageMode(false); setShowPlus(false);}} className="w-full text-left px-3 py-2.5 hover:bg-white/[0.06] rounded-xl text-[14px]">Create video {videoMode?"- On":""}</button>
              </div>
            )}
            <div className="bg-[#303030] rounded-[26px] flex items-end gap-2 px-3 py-2 border border-white/[0.04]">
              <button onClick={()=>setShowPlus(!showPlus)} className="w-8 h-8 rounded-full hover:bg-white/[0.08] grid place-items-center shrink-0 mb-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={handleFile}/>
              <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey){ e.preventDefault(); send(); } }} placeholder={voiceMode?"Listening...":imageMode?"Describe image":videoMode?"Describe video":"Ask anything"} rows={1} className="flex-1 bg-transparent outline-none text-[15px] placeholder-zinc-500 resize-none max-h-[120px] py-2"/>
              <button onClick={startSTT} className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mb-0.5 ${listening?"bg-red-500":"hover:bg-white/[0.08]"}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
              </button>
              <button onClick={()=>send()} className={`w-8 h-8 rounded-full grid place-items-center shrink-0 mb-0.5 transition ${input.trim()||imageMode||videoMode?"bg-white text-black":"bg-white/[0.15] text-zinc-400"}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Voice Mode - Human talk */}
        {voiceMode && (
          <div className="absolute inset-0 z-50 bg-[#212121] flex flex-col">
            <div className="h-[52px] flex justify-between px-4 items-center">
              <button onClick={()=>{ setVoiceMode(false); window.speechSynthesis.cancel(); }} className="text-[14px]">X Close</button>
              <div className="text-[13px] text-zinc-400">STORM X Voice - {VOICES.find(v=>v.id===voiceId)?.name}</div>
              <div className="w-8"/>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`w-[160px] h-[160px] rounded-full bg-white/[0.08] border border-white/10 flex items-center justify-center ${listening?"animate-pulse":""}`}>
                <div className="w-[100px] h-[100px] rounded-full bg-white flex items-center justify-center">
                  <div className="flex gap-1"><span className="w-1 h-6 bg-black rounded-full animate-[bounce_0.8s_infinite]"></span><span className="w-1 h-8 bg-black rounded-full animate-[bounce_0.8s_infinite_0.1s]"></span><span className="w-1 h-5 bg-black rounded-full animate-[bounce_0.8s_infinite_0.2s]"></span></div>
                </div>
              </div>
              <div className="mt-6 text-[14px] text-zinc-400">{listening ? "Listening..." : "Talk to me"}</div>
            </div>
            <div className="p-4 flex justify-center">
              <button onClick={startSTT} className="bg-white text-black rounded-full px-6 py-3 text-[14px] font-medium">{listening ? "Stop listening" : "Start talking"}</button>
            </div>
          </div>
        )}

        {/* Settings - All together - ChatGPT style */}
        {showSettings && (
          <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={()=>setShowSettings(false)}>
            <div className="w-full max-w-[520px] bg-[#2f2f2f] rounded-2xl p-5 border border-white/[0.08]" onClick={e=>e.stopPropagation()}>
              <div className="flex justify-between items-center mb-5">
                <div className="font-semibold">Settings</div>
                <button onClick={()=>setShowSettings(false)} className="w-8 h-8 rounded-full hover:bg-w
