"use client";
import { useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [ownerMode, setOwnerMode] = useState(false);
  const [securityStep, setSecurityStep] = useState("");

  async function send() {
    if (!input.trim()) return;
    const userMsg = { role: "user", content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, ownerMode, securityStep })
      });
      const data = await res.json();
      
      if (data.awaitingKey) {
        setSecurityStep("awaiting_key");
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else if (data.ownerUnlocked) {
        setOwnerMode(true);
        setSecurityStep("");
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setSecurityStep("");
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      }
    } catch (e: any) {
      setMessages([...newMessages, { role: "assistant", content: "Error: " + e.message }]);
    }
    setLoading(false);
  }

  return (
    <div style={{background:"#050507", color:"white", minHeight:"100vh", padding:"20px", fontFamily:"system-ui"}}>
      <h1 style={{color:"#a855f7", textAlign:"center"}}>⚡ STORM X AI ASSISTANT</h1>
      <p style={{textAlign:"center", color:"#06b6d4", fontSize:"12px"}}>CODE THE FUTURE. DEBUG THE IMPOSSIBLE.</p>
      
      <div style={{maxWidth:"700px", margin:"20px auto", border:"1px solid #333", borderRadius:"10px", padding:"10px", minHeight:"400px"}}>
        {messages.map((m,i) => (
          <div key={i} style={{margin:"10px 0", padding:"10px", borderRadius:"8px", background: m.role==="user" ? "#1a1a2e" : "#0f0f14", borderLeft: m.role==="user" ? "3px solid #06b6d4" : "3px solid #a855f7", whiteSpace:"pre-wrap"}}>
            <b style={{color: m.role==="user" ? "#06b6d4" : "#a855f7", fontSize:"12px"}}>{m.role.toUpperCase()} {ownerMode && m.role==="assistant" ? "🔓 OWNER" : ""}</b>
            <div style={{marginTop:"5px"}}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{color:"#a855f7"}}>Storm is thinking...</div>}
      </div>

      <div style={{maxWidth:"700px", margin:"0 auto", display:"flex", gap:"10px"}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter" && send()} placeholder="Ask STORM X anything... or type STORM CODE 666 IS BACK" style={{flex:1, padding:"12px", borderRadius:"8px", border:"1px solid #333", background:"#111", color:"white"}} />
        <button onClick={send} disabled={loading} style={{padding:"12px 20px", borderRadius:"8px", background:"#a855f7", color:"white", border:"none", fontWeight:"bold"}}>SEND</button>
      </div>
      <p style={{textAlign:"center", marginTop:"20px", fontSize:"11px", color:"#555"}}>Owned by STORM X • Owner trigger: STORM CODE 666 IS BACK</p>
    </div>
  );
}
