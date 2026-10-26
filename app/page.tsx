"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; fileName?:string; thinking?:boolean; codeLang?:string };

const MODELS = [
  { id:"gpt-4o-mini", name:"STORM X Fast", desc:"Fast, daily" },
  { id:"gpt-4o", name:"STORM X Pro", desc:"Best for code" },
  { id:"o1-mini", name:"STORM X THINK HARDER", desc:"Deep reasoning", reasoning:true },
];

const VOICES = [
  { id:"guy-deep", name:"STORM", icon:"👨‍💻", pitch:0.7, rate:0.9, desc:"2 GUYZ - Deep" },
  { id:"guy-chill", name:"X", icon:"🧑‍🚀", pitch:1.0, rate:1.0, desc:"2 GUYZ - Chill" },
  { id:"girl", name:"NOVA", icon:"👩‍🎤", pitch:1.35, rate:1.0, desc:"Girl" },
  { id:"robot", name:"UNIT-666", icon:"🤖", pitch:0.2, rate:0.75, desc:"Robot Echo" },
];

const PROMPTS = [
  { icon:"💻", t:"Write WhatsApp bot", p:"Write a WhatsApp bot in Node.js using Baileys with pairing code" },
  { icon:"🖼️", t:"Create an image", p:"/image futuristic STORM X AI robot, black and blue neon, ultra detailed" },
  { icon:"🐛", t:"Debug Next.js", p:"Fix my Next.js build error: Port 3000 failed, Render expects 10000" },
  { icon:"📁", t:"Explain my file", p:"I will upload a file, explain and improve it" },
];

export default function Page(){
  const [msgs,setMsgs]=useState<Msg[]>([]);
  const [input,setInput]=useState("");
  const [modelId,setModelId]=useState("gpt-4o-mini");
  const [thinkHarder,setThinkHarder]=useState(false);
  const [loading,setLoading]=useState(false);
  const [voiceId,setVoiceId]=useState("guy-deep");
  const [voiceMode,setVoiceMode]=useState(false);
  const [imageMode,setImageMode]=useState(false);
  const [sidebar,setSidebar]=useState(false);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [textSize,setTextSize]=useState(14);
  const [securityStep,setSecurityStep]=useState("");
  const [ownerMode,setOwnerMode]=useState(false);
  const [showPlus,setShowPlus]=useState(false);
  const [chats,setChats]=useState<{id:string,title:string,date:string}[]>([
    {id:"1",title:"Package.JSON Check",date:"Today"},
    {id:"2",title:"AI Assistant Blueprint",date:"Today"},
    {id:"3",title:"Write Termux Bot Code",date:"Yesterday"},
  ]);
  const [gallery,setGallery]=useState<string[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);
  const inputRef=useRef<HTMLInputElement>(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);
  useEffect(()=>{ 
    if("speechSynthesis" in window) speechSynthesis.getVoices();
  },[]);

  const speak = (text:string) => {
    if(!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const v = VOICES.find(x=>x.id===voiceId)!;
    const clean = text.replace(/```[\s\S]*?```/g," code block ").slice(0,600);
    const u = new SpeechSynthesisUtterance(clean);
    const vs = speechSynthesis.getVoices();
    u.voice = vs.find(v=> v.name.toLowerCase().includes(voiceId==="girl"?"female":"male"))||vs[0];
    u.pitch = v.pitch; u.rate = v.rate;
    if(v.id==="robot"){
      // Real robot echo: speak + delayed echo with Web Audio
      u.onend=()=>{
        setTimeout(()=>{
          const echo = new SpeechSynthesisUtterance(clean.slice(0,250));
          echo.pitch=0.05; echo.rate=0.65; echo.volume=0.5; echo.voice=u.voice;
          speechSynthesis.speak(echo);
        },280);
      };
    }
    speechSynthesis.speak(u);
  };

  const send = async (custom?:string, imgData?:string, fileName?:string, regenId?:string) => {
    const txt = custom ?? input.trim();
    if(!txt && !imgData) return;
    
    // Image generation path - uses REAL API
    if(txt.startsWith("/image") || imageMode){
      const prompt = txt.replace("/image","").trim() || txt;
      const userMsg:Msg={id:Date.now()+"" ,role:"user", content:prompt, image:imgData};
      setMsgs(m=>[...m, userMsg]); setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{
        const r = await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})});
        const d = await r.json();
        if(d.image){
          setGallery(g=>[d.image,...g]);
          setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:`Generated: "${prompt}"`, images:[d.image]}]);
        } else setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:d.error||"Image failed - need OPENAI_API_KEY with image model access"}]);
      }catch(e:any){ setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:"Image error: "+e.message}]); }
      setLoading(false); return;
    }

    const userMsg:Msg={id:regenId||Date.now()+"", role:"user", content:txt, image:imgData, fileName};
    if(!regenId) setMsgs(m=>[...m, userMsg]);
    else setMsgs(m=> m.filter(x=>x.id!==regenId).concat(userMsg));
    setInput(""); setLoading(true); setShowPlus(false);
    
    try{
      const res = await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          messages:[...msgs, userMsg].map(x=>({role:x.role, content:x.content})),
          model: thinkHarder ? "o1-mini" : modelId,
          thinkHarder,
          securityStep, ownerMode, image:imgData
        })
      });
      const data = await res.json();
      if(data.awaitingKey) setSecurityStep("awaiting_key");
      if(data.ownerUnlocked){ setOwnerMode(true); setSecurityStep(""); }
      
      const bot:Msg={id:Date.now()+"b", role:"assistant", content:data.reply||"No reply", thinking: data.thinking};
      setMsgs(m=>[...m, bot]);
      if(data.reply) speak(data.reply);
    }catch(e:any){
      setMsgs(m=>[...m,{id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}. Check Render > Environment > OPENAI_API_KEY`}]);
    }
    setLoading(false);
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload=()=>{
      const res = reader.result as string;
      send(`Analyze this file: ${f.name}. Content included.`, res.startsWith("data:image")?res:undefined, f.name);
    };
    if(f.type.startsWith("image/")) reader.readAsDataURL(f);
    else reader.readAsText(f);
  };

  const copy = (t:string)=> navigator.clipboard.writeText(t);

  // Parse code blocks
  const renderContent = (content:string)=>{
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((p,i)=>{
      if(p.startsWith("```")){
        const lang = p.match(/```(\w+)/)?.[1]||"code";
        const code = p.replace(/```\w*\n?/, "").replace(/```$/, "");
        return (
          <div key={i} className="my-3 rounded-xl overflow-hidden bg-[#0a0a0a] border border-[#2a2a2a]">
            <div className="flex justify-between items-center px-3 py-2 bg-[#151515] text-xs text-zinc-400"><span>{lang}</span><button onClick={()=>copy(code)} className="px-2 py-1 bg-white text-black rounded-full text-[11px]">Copy</button></div>
            <pre className="p-3 overflow-x-auto text-[13px] leading-5"><code>{code}</code></pre>
          </div>
        );
      }
      // tables and bold
      return <div key={i} className="whitespace-pre-wrap leading-6" style={{fontSize:textSize}}>{p}</div>;
    });
  };

  return (
    <div className="h-[100dvh] flex bg-black text-white overflow-hidden selection:bg-blue-600/30">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap'); *{font-family:Inter,sans-serif} .scroll{scrollbar-width:none} .scroll::-webkit-scrollbar{display:none} @keyframes pulse{0%,100%{opacity:1} 50%{opacity:.4}}`}</style>
      
      {/* SIDEBAR - like your video */}
      <div className={`fixed md:static z-40 h-full w-[300px] bg-[#171717] flex flex-col transition-all ${sidebar?"translate-x-0":"-translate-x-full md:translate-x-0"} ${sidebar?"flex":"hidden md:flex"}`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-white text-black grid place-items-center font-bold text-sm">S</div><span className="font-semibold">STORM X</span></div>
            <button onClick={()=>setSidebar(false)} className="md:hidden w-8 h-8 bg-zinc-800 rounded-full">—</button>
          </div>
          <button onClick={()=>{setMsgs([]); setSidebar(false);}} className="mt-4 w-full bg-[#212121] hover:bg-[#2a2a2a] p-3 rounded-full text-sm flex items-center gap-2"><span>+</span> New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto scroll px-2 space-y-5">
          <div><div className="text-[11px] text-zinc-500 px-3 mb-2">TOOLS</div>
            <button onClick={()=>{setImageMode(true); inputRef.current?.focus(); setSidebar(false);}} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#212121] text-sm">🖼️ Images <span className="ml-auto text-[10px] text-zinc-500">DALL·E 3</span></button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#212121] text-sm">📚 Library</button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#212121] text-sm">📁 Projects</button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[#212121] text-sm">🔌 Plugins</button>
          </div>
          <div><div className="text-[11px] text-zinc-500 px-3 mb-2">PINNED</div>
            <div className="px-3 py-2 text-sm text-zinc-300 bg-[#212121] rounded-xl">WhatsApp Name Below Telegram</div>
          </div>
          <div><div className="text-[11px] text-zinc-500 px-3 mb-2">RECENTS</div>
            {chats.map(c=><div key={c.id} className="px-3 py-2.5 rounded-xl hover:bg-[#212121] text-sm truncate cursor-pointer" onClick={()=>setSidebar(false)}>{c.title}</div>)}
          </div>
          {gallery.length>0 && <div><div className="text-[11px] text-zinc-500 px-3 mb-2">IMAGE GALLERY</div><div className="grid grid-cols-2 gap-2 px-2">{gallery.slice(0,4).map((g,i)=><img key={i} src={g} className="w-full h-20 object-cover rounded-lg"/>)}</div></div>}
        </div>
        <div className="p-3 border-t border-zinc-800 flex items-center gap-2">
          <button onClick={()=>setSettingsOpen(true)} className="w-9 h-9 bg-[#212121] rounded-full grid place-items-center">⚙️</button>
          <button onClick={()=>setVoiceMode(true)} className={`w-9 h-9 rounded-full grid place-items-center ${voiceMode?"bg-blue-600":"bg-[#212121]"}`}>🎙️</button>
          <div className="ml-auto text-[11px] text-zinc-500">{ownerMode?"OWNER":"FREE"}</div>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
        {/* Header with model selector + THINK HARDER */}
        <div className="h-[56px] flex items-center justify-between px-3 border-b border-zinc-900 bg-black/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <button onClick={()=>setSidebar(true)} className="md:hidden w-8 h-8 bg-[#212121] rounded-full grid place-items-center">≡</button>
            <select value={modelId} onChange={e=>setModelId(e.target.value)} className="bg-[#212121] border border-zinc-800 rounded-full px-3 py-1.5 text-sm">
              {MODELS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={()=>setThinkHarder(!thinkHarder)} className={`px-3 py-1.5 rounded-full text-xs border transition ${thinkHarder?"bg-blue-600 border-blue-500 text-white":"bg-[#212121] border-zinc-700 text-zinc-400"}`}>🧠 THINK HARDER {thinkHarder?"ON":""}</button>
          </div>
          <div className="flex items-center gap-2">
            <select value={voiceId} onChange={e=>setVoiceId(e.target.value)} className="hidden md:block bg-[#171717] rounded-full px-3 py-1.5 text-xs">
              {VOICES.map(v=><option key={v.id} value={v.id}>{v.icon} {v.name} - {v.desc}</option>)}
            </select>
            <button onClick={()=>setSettingsOpen(true)} className="w-8 h-8 rounded-full bg-[#212121]">⚙️</button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto scroll px-3 md:px-6 py-6">
          {msgs.length===0 ? (
            <div className="max-w-[760px] mx-auto mt-[12vh]">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-xs mb-4">⚡ STORM X AI ASSISTANT • CODE THE FUTURE</div>
                <h1 className="text-[32px] md:text-[42px] font-semibold tracking-tight">STORM X</h1>
                <p className="text-zinc-400 mt-2">DEBUG THE IMPOSSIBLE • WhatsApp • Next.js • Termux</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10 max-w-[600px] mx-auto">
                  {PROMPTS.map((p,i)=><button key={i} onClick={()=>send(p.p)} className="text-left bg-[#171717] hover:bg-[#1e1e1e] border border-zinc-800 p-4 rounded-2xl transition"><div className="text-lg">{p.icon}</div><div className="text-sm mt-2 font-medium">{p.t}</div><div className="text-xs text-zinc-500 mt-1 line-clamp-2">{p.p}</div></button>)}
                </div>
                <div className="mt-8 flex justify-center gap-2">
                  {VOICES.map(v=><button key={v.id} onClick={()=>setVoiceId(v.id)} className={`px-3 py-2 rounded-full text-xs border ${voiceId===v.id?"bg-white text-black border-white":"bg-[#171717] border-zinc-800 text-zinc-400"}`}>{v.icon} {v.name}</button>)}
                </div>
              </div>
            </div>
          ):(
            <div className="max-w-[760px] mx-auto space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`group ${m.role==="user"?"flex justify-end":""} `}>
                  <div className={`${m.role==="user"?"bg-[#212121] rounded-[24px] px-4 py-3 max-w-[80%]":"w-full"}`}>
                    {m.image && <img src={m.image} className="max-w-[280px] rounded-xl mb-2 border border-zinc-800"/>}
                    {m.images && <div className="grid gap-2 my-2">{m.images.map((img,j)=><img key={j} src={img} className="max-w-full rounded-2xl border border-zinc-800"/><div className="flex gap-2 mt-1"><button onClick={()=>copy(img)} className="text-[11px] px-2 py-1 bg-zinc-800 rounded-full">Copy link</button><button onClick={()=>{ setGallery(g=>[img,...g]); }} className="text-[11px] px-2 py-1 bg-zinc-800 rounded-full">Save</button></div>)}</div>}
                    <div className={`${m.role==="user"?"text-[15px]":"text-[15px]"}`}>{renderContent(m.content)}</div>
                    {m.role==="assistant" && <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition"><button onClick={()=>copy(m.content)} className="w-8 h-8 bg-[#212121] rounded-full text-xs">📋</button><button onClick={()=>speak(m.content)} className="w-8 h-8 bg-[#212121] rounded-full text-xs">🔊</button><button onClick={()=>send(m.content,m.image,undefined,m.id)} className="w-8 h-8 bg-[#212121] rounded-full text-xs">🔄</button></div>}
                  </div>
                </div>
              ))}
              {loading && <div className="flex items-center gap-2 text-sm text-zinc-400"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"/><span className="animate-[pulse_1.5s_infinite]">{thinkHarder?"STORM X THINKING HARDER... 🧠":"STORM X THINKING... ⚡"}</span></div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>

        {/* Voice Mode Overlay */}
        {voiceMode && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur flex flex-col items-center justify-center">
            <button onClick={()=>setVoiceMode(false)} className="absolute top-4 right-4 w-10 h-10 bg-[#212121] rounded-full">✕</button>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 animate-pulse grid place-items-center text-4xl">{VOICES.find(v=>v.id===voiceId)?.icon}</div>
            <h2 className="mt-6 text-xl font-semibold">{VOICES.find(v=>v.id===voiceId)?.name} - Listening</h2>
            <p className="text-zinc-500 text-sm mt-2">Say "Stop" to end • Robot echo adds 280ms delay</p>
            <div className="mt-6 flex gap-2">{VOICES.map(v=><button key={v.id} onClick={()=>setVoiceId(v.id)} className={`px-4 py-2 rounded-full text-sm ${voiceId===v.id?"bg-white text-black":"bg-zinc-800"}`}>{v.icon} {v.name}</button>)}</div>
            <button onClick={()=>{
              const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition; if(!R) return alert("Mic not supported");
              const rec=new R(); rec.lang="en-US"; rec.start(); rec.onresult=(e:any)=>{ setInput(e.results[0][0].transcript); setVoiceMode(false); };
            }} className="mt-8 px-8 py-3 bg-white text-black rounded-full">🎤 Start Talking</button>
          </div>
        )}

        {/* Input - like your video */}
        <div className="p-3 md:p-4 bg-gradient-to-t from-black via-black to-transparent">
          <div className="max-w-[760px] mx-auto">
            {showPlus && (
              <div className="mb-3 bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-2 w-[220px] shadow-2xl animate-[pulse_.3s]">
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">📷 Camera</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🖼️ Photos</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">📎 Files & Docs</button>
                <button onClick={()=>{setImageMode(true); setShowPlus(false);}} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🎨 Create Image {imageMode?"(ON)":""}</button>
                <button onClick={()=>setVoiceMode(true)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🎙️ Voice Mode - {VOICES.find(v=>v.id===voiceId)?.name}</button>
              </div>
            )}
            <div className={`flex items-center gap-2 bg-[#212121] border ${imageMode?"border-blue-600":"border-zinc-800"} rounded-full p-2 pl-3 shadow-xl`}>
              <button onClick={()=>setShowPlus(!showPlus)} className="w-9 h-9 rounded-full bg-zinc-700 hover:bg-zinc-600 grid place-items-center text-lg shrink-0">+</button>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.js,.ts,.json,.py" hidden onChange={handleFile}/>
              <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={imageMode?"Describe image to generate...":"Ask STORM X"} className="flex-1 bg-transparent outline-none text-[15px] placeholder-zinc-500"/>
              <button onClick={()=>{
                const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition; if(!R) return; const rec=new R(); rec.lang="en-US"; rec.start(); rec.onresult=(e:any)=>setInput(e.results[0][0].transcript);
              }} className="w-9 h-9 grid place-items-center text-zinc-400">🎤</button>
              <button onClick={()=>send()} className="w-9 h-9 rounded-full bg-white text-black grid place-items-center font-bold">↑</button>
            </div>
            <div className="text-[10px] text-center text-zinc-600 mt-2">STORM X uses {modelId} {thinkHarder?"+ o1-mini reasoning":""} • Images via DALL·E 3 • Voices use device TTS + robot echo</div>
          </div>
        </div>
      </div>

      {/* Settings */}
      {settingsOpen 
