"use client";
import { useState, useRef, useEffect } from "react";

type Msg = { role: "user"|"assistant"; content: string; image?: string; fileName?: string };

const VOICES = [
  { id: "guy1", name: "STORM - Guy Deep", pitch: 0.8, rate: 0.9, icon: "👨‍💻" },
  { id: "guy2", name: "X - Guy Chill", pitch: 1.0, rate: 1.0, icon: "🧑" },
  { id: "girl1", name: "NOVA - Girl", pitch: 1.3, rate: 1.0, icon: "👩‍🚀" },
  { id: "robot", name: "STORM-UNIT 666 - Robot Echo", pitch: 0.3, rate: 0.8, icon: "🤖" },
];

export default function Home() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [voiceId, setVoiceId] = useState("guy1");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [securityStep, setSecurityStep] = useState("");
  const [ownerMode, setOwnerMode] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(()=>{ endRef.current?.scrollIntoView({behavior:"smooth"}); },[msgs]);

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const v = VOICES.find(x=>x.id===voiceId)!;
    
    const utter = new SpeechSynthesisUtterance(text.slice(0,400));
    const voices = window.speechSynthesis.getVoices();
    // pick voice based on type
    if (v.id.includes("girl")) {
      utter.voice = voices.find(v=>v.name.toLowerCase().includes("female")||v.name.toLowerCase().includes("zira")||v.name.toLowerCase().includes("samantha"))||voices[0];
    } else {
      utter.voice = voices.find(v=>v.name.toLowerCase().includes("male")||v.name.toLowerCase().includes("david"))||voices[0];
    }
    utter.pitch = v.pitch;
    utter.rate = v.rate;
    utter.volume = 1;

    if (v.id==="robot") {
      // Robot echo effect - speak twice with delay + AudioContext echo
      utter.onstart = ()=>setIsSpeaking(true);
      utter.onend = ()=>{
        setTimeout(()=>{
          const echo = new SpeechSynthesisUtterance(text.slice(0,200));
          echo.pitch = 0.1; echo.rate = 0.7; echo.volume = 0.6;
          echo.voice = utter.voice;
          echo.onend = ()=>setIsSpeaking(false);
          window.speechSynthesis.speak(echo);
        },250);
      };
      window.speechSynthesis.speak(utter);
    } else {
      utter.onstart=()=>setIsSpeaking(true);
      utter.onend=()=>setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
    }
  };

  const send = async (customText?: string, imageData?: string, fileName?: string) => {
    const text = customText || input.trim();
    if (!text && !imageData) return;
    const userMsg: Msg = { role:"user", content: text||`Uploaded ${fileName}`, image: imageData, fileName };
    setMsgs(m=>[...m, userMsg]);
    setInput(""); setLoading(true); setShowAttach(false);
    try {
      const res = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ 
          messages: [...msgs, userMsg].map(m=>({role:m.role, content:m.content + (m.image? " [Image attached]":"")})),
          securityStep, ownerMode, image: imageData
        })
      });
      const data = await res.json();
      if (data.awaitingKey) setSecurityStep("awaiting_key");
      if (data.ownerUnlocked) { setOwnerMode(true); setSecurityStep(""); }
      const botMsg: Msg = { role:"assistant", content: data.reply || "No reply" };
      setMsgs(m=>[...m, botMsg]);
      speak(data.reply);
    } catch(e:any) {
      setMsgs(m=>[...m, {role:"assistant", content:"❌ Error: "+e.message+" - Check OPENAI_API_KEY on Render"}]);
    }
    setLoading(false);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      send(`Analyze this file: ${file.name}`, base64.startsWith("data:image")?base64:undefined, file.name);
    };
    if (file.type.startsWith("image/")) reader.readAsDataURL(file);
    else reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-[#212121] text-white">
      {/* Sidebar like ChatGPT */}
      <div className="hidden md:flex w-[260px] bg-[#171717] flex-col p-3">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black font-bold">S</div>
          <span className="font-bold">STORM X</span>
        </div>
        <button onClick={()=>setMsgs([])} className="bg-[#212121] p-3 rounded-full text-sm mb-4">+ New Chat</button>
        <div className="text-xs text-zinc-400">STORM CODE 666 IS BACK = owner unlock</div>
        <div className="mt-auto">
          <select value={voiceId} onChange={e=>setVoiceId(e.target.value)} className="w-full bg-[#212121] p-2 rounded-lg text-sm">
            {VOICES.map(v=><option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
          </select>
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="font-semibold">STORM X AI</span>
            <span className="text-xs bg-zinc-700 px-2 py-1 rounded-full">{VOICES.find(v=>v.id===voiceId)?.icon} {VOICES.find(v=>v.id===voiceId)?.name}</span>
            {isSpeaking && <span className="text-xs text-green-400 animate-pulse">● Speaking...</span>}
          </div>
          <select value={voiceId} onChange={e=>setVoiceId(e.target.value)} className="md:hidden bg-zinc-800 p-2 rounded-full text-xs">
            {VOICES.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {msgs.length===0 && (
            <div className="text-center mt-20">
              <h1 className="text-3xl font-bold mb-2">STORM X AI</h1>
              <p className="text-zinc-400">CODE THE FUTURE. DEBUG THE IMPOSSIBLE.</p>
              <div className="grid grid-cols-2 gap-2 mt-8 max-w-md mx-auto">
                <button onClick={()=>send("Write a WhatsApp bot in Node.js")} className="bg-[#2f2f2f] p-3 rounded-xl text-sm">WhatsApp Bot</button>
                <button onClick={()=>send("Fix my Next.js build error")} className="bg-[#2f2f2f] p-3 rounded-xl text-sm">Fix Build</button>
                <button onClick={()=>send("Explain my uploaded code")} className="bg-[#2f2f2f] p-3 rounded-xl text-sm">Explain Code</button>
                <button onClick={()=>send("STORM CODE 666 IS BACK")} className="bg-red-900/30 p-3 rounded-xl text-sm border border-red-800">Owner Unlock</button>
              </div>
            </div>
          )}
          {msgs.map((m,i)=>(
            <div key={i} className={`flex ${m.role==="user"?"justify-end":"justify-start"}`}>
              <div className={`max-w-[80%] p-3 rounded-2xl ${m.role==="user"?"bg-[#2f2f2f]":"bg-transparent"} `}>
                {m.image && <img src={m.image} alt="upload" className="max-w-[200px] rounded-lg mb-2" />}
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                {m.role==="assistant" && <button onClick={()=>speak(m.content)} className="text-xs mt-2 text-zinc-400 hover:text-white">🔊 Speak as {VOICES.find(v=>v.id===voiceId)?.name}</button>}
              </div>
            </div>
          ))}
          {loading && <div className="text-sm text-zinc-400 animate-pulse">STORM X THINKING... ⚡</div>}
          <div ref={endRef}/>
        </div>

        {/* Input like ChatGPT */}
        <div className="p-3">
          {showAttach && (
            <div className="bg-[#2f2f2f] rounded-2xl p-2 mb-2 flex flex-col gap-2 w-[180px]">
              <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-zinc-700 rounded-lg text-sm"><span>📷</span> Camera</button>
              <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-zinc-700 rounded-lg text-sm"><span>🖼️</span> Photos</button>
              <button onClick={()=>fileRef.current?.click()} className="flex items-center gap-3 p-2 hover:bg-zinc-700 rounded-lg text-sm"><span>📎</span> Files</button>
            </div>
          )}
          <div className="bg-[#2f2f2f] rounded-full flex items-center p-2 gap-2">
            <button onClick={()=>setShowAttach(!showAttach)} className="w-8 h-8 bg-zinc-600 rounded-full flex items-center justify-center">+</button>
            <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.js,.ts,.json" onChange={handleFile} hidden />
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Ask STORM X" className="flex-1 bg-transparent outline-none text-sm" />
            <button onClick={()=>send()} className="w-8 h-8 bg-white text-black rounded-full">↑</button>
            <button onClick={()=>{ const rec = new (window as any).webkitSpeechRecognition(); rec.lang="en-US"; rec.start(); rec.onresult=(e:any)=>setInput(e.results[0][0].transcript); }} className="text-zinc-400">🎤</button>
          </div>
          <p className="text-[10px] text-center text-zinc-500 mt-2">STORM X can make mistakes. Check important info.</p>
        </div>
      </div>
    </div>
  );
}
