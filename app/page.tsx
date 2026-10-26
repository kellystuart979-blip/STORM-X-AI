"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { id:string; role:"user"|"assistant"; content:string; image?:string; images?:string[]; fileName?:string; thinking?:boolean; };

const MODELS = [
  { id:"gpt-4o-mini", name:"STORM X Fast", desc:"Fast" },
  { id:"gpt-4o", name:"STORM X Pro", desc:"Code" },
  { id:"o1-mini", name:"STORM X THINK HARDER", desc:"Deep", reasoning:true },
];

const VOICES = [
  { id:"guy-deep", name:"STORM", icon:"👨‍💻", pitch:0.7, rate:0.9, desc:"Guy Deep" },
  { id:"guy-chill", name:"X", icon:"🧑‍🚀", pitch:1.0, rate:1.0, desc:"Guy Chill" },
  { id:"girl", name:"NOVA", icon:"👩‍🎤", pitch:1.35, rate:1.0, desc:"Girl" },
  { id:"robot", name:"UNIT-666", icon:"🤖", pitch:0.2, rate:0.75, desc:"Robot Echo" },
];

const PROMPTS = [
  { icon:"💻", t:"WhatsApp bot", p:"Write a WhatsApp bot in Node.js using Baileys with pairing code" },
  { icon:"🖼️", t:"Create image", p:"/image futuristic STORM X AI robot, black and blue neon, ultra detailed" },
  { icon:"🐛", t:"Debug Next.js", p:"Fix my Next.js build error: Port 3000 failed, Render expects 10000" },
  { icon:"📁", t:"Explain file", p:"I will upload a file, explain and improve it" },
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
  const [chats,setChats]=useState([{id:"1",title:"Package.JSON Check"},{id:"2",title:"AI Blueprint"},{id:"3",title:"Termux Bot Code"}]);
  const [gallery,setGallery]=useState<string[]>([]);
  const fileRef=useRef<HTMLInputElement>(null);
  const endRef=useRef<HTMLDivElement>(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs, loading]);

  const speak = (text:string) => {
    if(!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const v = VOICES.find(x=>x.id===voiceId)!;
    const clean = text.replace(/```[\s\S]*?```/g," code ").slice(0,600);
    const u = new SpeechSynthesisUtterance(clean);
    const vs = window.speechSynthesis.getVoices();
    u.voice = vs[0];
    u.pitch = v.pitch; u.rate = v.rate;
    if(v.id==="robot"){
      u.onend=()=>{
        setTimeout(()=>{
          const echo = new SpeechSynthesisUtterance(clean.slice(0,250));
          echo.pitch=0.05; echo.rate=0.65; echo.volume=0.5;
          window.speechSynthesis.speak(echo);
        },280);
      };
    }
    window.speechSynthesis.speak(u);
  };

  const send = async (custom?:string, imgData?:string, fileName?:string) => {
    const txt = custom ?? input.trim();
    if(!txt && !imgData) return;
    
    if(txt.startsWith("/image") || imageMode){
      const prompt = txt.replace("/image","").trim() || txt;
      const userMsg:Msg={id:Date.now()+"",role:"user", content:prompt, image:imgData};
      setMsgs(m=>[...m, userMsg]); setInput(""); setLoading(true); setShowPlus(false); setImageMode(false);
      try{
        const r = await fetch("/api/image",{method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({prompt})});
        const d = await r.json();
        if(d.image){
          setGallery(g=>[d.image,...g]);
          setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:`Generated: "${prompt}"`, images:[d.image]}]);
        } else setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:d.error||"Image failed"}]);
      }catch(e:any){ setMsgs(m=>[...m,{id:Date.now()+"a", role:"assistant", content:"Image error: "+e.message}]); }
      setLoading(false); return;
    }

    const userMsg:Msg={id:Date.now()+"", role:"user", content:txt, image:imgData, fileName};
    setMsgs(m=>[...m, userMsg]);
    setInput(""); setLoading(true); setShowPlus(false);
    
    try{
      const res = await fetch("/api/chat",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          messages:[...msgs, userMsg].map(x=>({role:x.role, content:x.content})),
          model: thinkHarder ? "o1-mini" : modelId,
          thinkHarder, securityStep, ownerMode, image:imgData
        })
      });
      const data = await res.json();
      if(data.awaitingKey) setSecurityStep("awaiting_key");
      if(data.ownerUnlocked){ setOwnerMode(true); setSecurityStep(""); }
      const bot:Msg={id:Date.now()+"b", role:"assistant", content:data.reply||"No reply"};
      setMsgs(m=>[...m, bot]);
      if(data.reply) speak(data.reply);
    }catch(e:any){
      setMsgs(m=>[...m,{id:Date.now()+"b", role:"assistant", content:`❌ ${e.message}`}]);
    }
    setLoading(false);
  };

  const handleFile = (e:React.ChangeEvent<HTMLInputElement>)=>{
    const f = e.target.files?.[0]; if(!f) return;
    const reader = new FileReader();
    reader.onload=()=>{
      const res = reader.result as string;
      send(`Analyze file: ${f.name}`, res.startsWith("data:image")?res:undefined, f.name);
    };
    if(f.type.startsWith("image/")) reader.readAsDataURL(f);
    else reader.readAsText(f);
  };

  const copy = (t:string)=> navigator.clipboard.writeText(t);

  const renderContent = (content:string)=>{
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((p,i)=>{
      if(p.startsWith("```")){
        const lang = p.match(/```(\w+)/)?.[1]||"code";
        const code = p.replace(/```\w*\n?/, "").replace(/```$/, "");
        return (
          <div key={i} className="my-3 rounded-xl overflow-hidden bg-[#0a0a0a] border border-zinc-800">
            <div className="flex justify-between items-center px-3 py-2 bg-[#151515] text-xs text-zinc-400"><span>{lang}</span><button onClick={()=>copy(code)} className="px-2 py-1 bg-white text-black rounded-full text-[11px]">Copy</button></div>
            <pre className="p-3 overflow-x-auto text-[13px]"><code>{code}</code></pre>
          </div>
        );
      }
      return <div key={i} className="whitespace-pre-wrap leading-6" style={{fontSize:textSize}}>{p}</div>;
    });
  };

  return (
    <div className="h-[100dvh] flex bg-black text-white overflow-hidden">
      <div className={`fixed md:static z-40 h-full w-[300px] bg-[#171717] flex flex-col transition-all ${sidebar?"translate-x-0 flex":"-translate-x-full md:translate-x-0 hidden md:flex"}`}>
        <div className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full bg-white text-black grid place-items-center font-bold text-sm">S</div><span className="font-semibold">STORM X</span></div>
            <button onClick={()=>setSidebar(false)} className="md:hidden w-8 h-8 bg-zinc-800 rounded-full">—</button>
          </div>
          <button onClick={()=>setMsgs([])} className="mt-4 w-full bg-[#212121] p-3 rounded-full text-sm">+ New chat</button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-4">
          <div className="px-3 py-2 text-sm">🖼️ Images {gallery.length>0?`(${gallery.length})`:""}</div>
          <div className="px-3 py-2 text-sm">📚 Library</div>
          <div className="px-3 py-2 text-sm">📁 Projects</div>
          <div className="text-[11px] text-zinc-500 px-3 mt-4">RECENTS</div>
          {chats.map(c=><div key={c.id} className="px-3 py-2 rounded-xl hover:bg-[#212121] text-sm">{c.title}</div>)}
          {gallery.length>0 && <div className="grid grid-cols-2 gap-2 px-2 mt-4">{gallery.slice(0,4).map((g,i)=><img key={i} src={g} alt="" className="w-full h-20 object-cover rounded-lg"/>)}</div>}
        </div>
        <div className="p-3 border-t border-zinc-800 flex gap-2">
          <button onClick={()=>setSettingsOpen(true)} className="w-9 h-9 bg-[#212121] rounded-full">⚙️</button>
          <button onClick={()=>setVoiceMode(true)} className="w-9 h-9 bg-[#212121] rounded-full">🎙️</button>
          <div className="ml-auto text-[11px] text-zinc-500">{ownerMode?"OWNER":"FREE"}</div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[#0a0a0a] relative">
        <div className="h-[56px] flex items-center justify-between px-3 border-b border-zinc-900">
          <div className="flex items-center gap-2">
            <button onClick={()=>setSidebar(true)} className="md:hidden w-8 h-8 bg-[#212121] rounded-full">≡</button>
            <select value={modelId} onChange={e=>setModelId(e.target.value)} className="bg-[#212121] border border-zinc-800 rounded-full px-3 py-1.5 text-sm">
              {MODELS.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <button onClick={()=>setThinkHarder(!thinkHarder)} className={`px-3 py-1.5 rounded-full text-xs border ${thinkHarder?"bg-blue-600 border-blue-500":"bg-[#212121] border-zinc-700 text-zinc-400"}`}>🧠 THINK HARDER</button>
          </div>
          <button onClick={()=>setSettingsOpen(true)} className="w-8 h-8 rounded-full bg-[#212121]">⚙️</button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 md:px-6 py-6">
          {msgs.length===0 ? (
            <div className="max-w-[760px] mx-auto mt-[10vh] text-center">
              <div className="inline-flex px-3 py-1 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/20 text-xs mb-4">⚡ STORM X AI ASSISTANT</div>
              <h1 className="text-[36px] font-semibold">STORM X</h1>
              <p className="text-zinc-400 mt-2">CODE THE FUTURE. DEBUG THE IMPOSSIBLE.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10 max-w-[600px] mx-auto text-left">
                {PROMPTS.map((p,i)=><button key={i} onClick={()=>send(p.p)} className="bg-[#171717] border border-zinc-800 p-4 rounded-2xl"><div>{p.icon}</div><div className="text-sm mt-2">{p.t}</div><div className="text-xs text-zinc-500 mt-1">{p.p.slice(0,60)}</div></button>)}
              </div>
              <div className="mt-6 flex justify-center gap-2 flex-wrap">
                {VOICES.map(v=><button key={v.id} onClick={()=>setVoiceId(v.id)} className={`px-3 py-2 rounded-full text-xs border ${voiceId===v.id?"bg-white text-black":"bg-[#171717] border-zinc-800"}`}>{v.icon} {v.name}</button>)}
              </div>
            </div>
          ):(
            <div className="max-w-[760px] mx-auto space-y-6">
              {msgs.map(m=>(
                <div key={m.id} className={`${m.role==="user"?"flex justify-end":""}`}>
                  <div className={`${m.role==="user"?"bg-[#212121] rounded-[24px] px-4 py-3 max-w-[80%]":"w-full"}`}>
                    {m.image && <img src={m.image} alt="" className="max-w-[280px] rounded-xl mb-2"/>}
                    {m.images && (
                      <div className="space-y-2 my-2">
                        {m.images.map((img,j)=>(
                          <div key={j}>
                            <img src={img} alt="" className="max-w-full rounded-2xl border border-zinc-800"/>
                            <div className="flex gap-2 mt-2">
                              <button onClick={()=>copy(img)} className="text-[11px] px-3 py-1 bg-zinc-800 rounded-full">Copy</button>
                              <button onClick={()=>setGallery(g=>[img,...g])} className="text-[11px] px-3 py-1 bg-zinc-800 rounded-full">Save</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div>{renderContent(m.content)}</div>
                    {m.role==="assistant" && <div className="flex gap-2 mt-3"><button onClick={()=>copy(m.content)} className="w-8 h-8 bg-[#212121] rounded-full text-xs">📋</button><button onClick={()=>speak(m.content)} className="w-8 h-8 bg-[#212121] rounded-full text-xs">🔊</button></div>}
                  </div>
                </div>
              ))}
              {loading && <div className="text-sm text-zinc-400">{thinkHarder?"STORM X THINKING HARDER... 🧠":"STORM X THINKING... ⚡"}</div>}
              <div ref={endRef}/>
            </div>
          )}
        </div>

        {voiceMode && (
          <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
            <button onClick={()=>setVoiceMode(false)} className="absolute top-4 right-4 w-10 h-10 bg-[#212121] rounded-full">✕</button>
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 grid place-items-center text-4xl">{VOICES.find(v=>v.id===voiceId)?.icon}</div>
            <h2 className="mt-6 text-xl">{VOICES.find(v=>v.id===voiceId)?.name} Listening</h2>
            <button onClick={()=>{
              const R=(window as any).webkitSpeechRecognition||(window as any).SpeechRecognition; 
              const rec=new R(); rec.lang="en-US"; rec.start(); rec.onresult=(e:any)=>{ setInput(e.results[0][0].transcript); setVoiceMode(false); };
            }} className="mt-8 px-8 py-3 bg-white text-black rounded-full">🎤 Start Talking</button>
          </div>
        )}

        <div className="p-3 md:p-4 bg-black">
          <div className="max-w-[760px] mx-auto">
            {showPlus && (
              <div className="mb-3 bg-[#1e1e1e] border border-zinc-800 rounded-2xl p-2 w-[220px]">
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🖼️ Photos</button>
                <button onClick={()=>fileRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">📎 Files</button>
                <button onClick={()=>{setImageMode(true); setShowPlus(false);}} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🎨 Create Image</button>
                <button onClick={()=>setVoiceMode(true)} className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-zinc-800 rounded-xl text-sm">🎙️ Voice Mode</button>
              </div>
            )}
            <div className={`flex items-center gap-2 bg-[#212121] border ${imageMode?"border-blue-600":"border-zinc-800"} rounded-full p-2 pl-3`}>
              <button onClick={()=>setShowPlus(!showPlus)} className="w-9 h-9 rounded-full bg-zinc-700 grid place-items-center">+</button>
              <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.js,.ts,.json" hidden onChange={handleFile}/>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder={imageMode?"Describe image...":"Ask STORM X"} className="flex-1 bg-transparent outline-none text-[15px]"/>
              <button onClick={()=>send()} className="w-9 h-9 rounded-full bg-white text-black">↑</button>
            </div>
          </div>
        </div>
      </div>

      {settingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3">
          <div className="bg-[#171717] border border-zinc-800 rounded-[24px] w-full max-w-[420px] p-5">
            <div className="flex justify-between"><h3 className="font-semibold">Settings</h3><button onClick={()=>setSettingsOpen(false)} className="w-8 h-8 bg-zinc-800 rounded-full">✕</button></div>
            <div className="mt-5 space-y-4">
              <div><div className="text-xs text-zinc-400 mb-2">Text size {textSize}px</div><input type="range" min={12} max={18} value={textSize} onChange={e=>setTextSize(parseInt(e.target.value))} className="w-full"/></div>
              <div className="grid grid-cols-2 gap-2">{VOICES.map(v=><button key={v.id} onClick={()=>setVoiceId(v.id)} className={`p-3 rounded-xl border text-left ${voiceId===v.id?"bg-white text-black":"bg-[#212121] border-zinc-800"}`}><div className="text-sm">{v.icon} {v.name}</div><div className="text-[11px]">{v.desc}</div></button>)}</div>
              <button onClick={()=>setSettingsOpen(false)} className="w-full bg-white text-black p-3 rounded-full">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
