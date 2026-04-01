import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";

const PHASE_CONFIG = [
  { key: "accepted",  label: "Accepted",      icon: "✅", check: () => true },
  { key: "pickup",    label: "Collected",      icon: "📦", check: t => t.pickup_status === "COMPLETED" },
  { key: "handover",  label: "Handover OK",    icon: "🤝", check: t => t.handover_status === "COMPLETED" },
  { key: "returned",  label: "Returned",       icon: "🔄", check: t => t.return_status === "RETURNED" },
  { key: "completed", label: "Completed",      icon: "🎉", check: t => !!t.completed_at },
];

export default function TransactionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [tx, setTx] = useState(null);
  const [chat, setChat] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState("");
  const [pickupOtpInput, setPickupOtpInput] = useState("");
  const [returnOtpInput, setReturnOtpInput] = useState("");
  const chatEndRef = useRef(null);
  const pollRef = useRef(null);

  const fetchTx = () => fetch(`http://localhost:5001/transaction/${id}`).then(r => r.json()).then(d => { if (d.id) setTx(d); setLoading(false); });
  const fetchChat = () => fetch(`http://localhost:5001/transaction/${id}/chat`).then(r => r.json()).then(d => { if (Array.isArray(d)) setChat(d); });

  useEffect(() => {
    if (!user) return navigate("/");
    fetchTx();
    fetchChat();
    // Poll chat every 5 seconds
    pollRef.current = setInterval(fetchChat, 5000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  const sendMessage = async () => {
    if (!msg.trim()) return;
    setSending(true);
    await fetch(`http://localhost:5001/transaction/${id}/chat`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sender_id: user.user_id, message: msg }),
    });
    setMsg("");
    await fetchChat();
    setSending(false);
  };

  const updateStatus = async (action, otpVal) => {
    const res = await fetch(`http://localhost:5001/transaction/${id}/status`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id, action, otp: otpVal }),
    });
    const data = await res.json();
    if (!res.ok) { showToast(data.message || data.error); return; }
    showToast(data.message);
    setPickupOtpInput("");
    setReturnOtpInput("");
    await fetchTx();
    await fetchChat();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
    </div>
  );

  if (!tx) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50">
      <div className="text-center"><div className="text-5xl mb-4">❌</div><p className="text-xl font-bold text-slate-500">Transaction not found</p>
        <button onClick={() => navigate("/bookings")} className="mt-4 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm border-none cursor-pointer">← Back to Bookings</button>
      </div>
    </div>
  );

  const isBorrower = tx.borrower_id === user.user_id;
  const isOwner = tx.owner_id === user.user_id;
  const isComplete = !!tx.completed_at;
  const dueDate = new Date(tx.due_date);
  const isOverdue = !isComplete && dueDate < new Date();
  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md border border-indigo-100 rounded-2xl px-6 py-3.5 text-sm font-medium text-slate-800 shadow-xl">{toast}</div>}

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "16px" }}>🎭</div>
          <span className="font-bold text-base text-slate-800">ShareSpeare</span>
        </div>
        <button onClick={() => navigate("/bookings")} className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-500 transition-colors bg-transparent border-none cursor-pointer">
          ← Back to Bookings
        </button>
      </nav>

      <div className="relative z-10 px-8 pt-8 pb-20 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">Transaction #{tx.id}</span>
            {isComplete && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">✅ Completed</span>}
            {isOverdue && <span className="bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-200">⚠️ Overdue</span>}
          </div>
          <h1 className="text-3xl font-black text-slate-900">Borrow: {tx.resource_name}</h1>
          <p className="text-slate-500 text-sm mt-1">{tx.community_name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6">
          {/* LEFT COLUMN: Info + Status + Actions */}
          <div className="flex flex-col gap-5">
            {/* Participants */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Participants</h3>
              <div className="flex flex-col gap-3">
                {[
                  { label: "Owner", name: tx.owner_name, email: tx.owner_email, pic: tx.owner_pic, isYou: isOwner },
                  { label: "Borrower", name: tx.borrower_name, email: tx.borrower_email, pic: tx.borrower_pic, isYou: isBorrower },
                ].map(p => (
                  <div key={p.label} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    {p.pic ? (
                      <img src={`http://localhost:5001${p.pic}`} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{p.name?.[0]}</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                        {p.name}
                        {p.isYou && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                      </div>
                      <div className="text-xs text-slate-400">{p.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Details */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Details</h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  { label: "Due Date", val: dueDate.toLocaleDateString(), warn: isOverdue },
                  { label: "Days Left", val: isComplete ? "Done" : isOverdue ? `${Math.abs(daysLeft)} overdue` : `${daysLeft} days`, warn: isOverdue },
                  { label: "Deposit", val: `₹${parseFloat(tx.deposit_amount || 0).toFixed(2)}` },
                  { label: "Fine/Day", val: `₹${parseFloat(tx.fine_per_day || 0).toFixed(2)}` },
                  { label: "Pickup", val: tx.pickup_method || "Not specified" },
                  { label: "Approved", val: new Date(tx.approved_date).toLocaleDateString() },
                ].map(d => (
                  <div key={d.label} className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{d.label}</div>
                    <div className={`font-bold ${d.warn ? "text-red-500" : "text-slate-700"}`}>{d.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Progress */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Progress</h3>
              <div className="flex flex-col gap-1">
                {PHASE_CONFIG.map((phase, i) => {
                  const done = phase.check(tx);
                  return (
                    <div key={phase.key} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all ${done ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300" : "bg-slate-100 text-slate-400 border-2 border-slate-200"}`}>
                        {done ? "✓" : phase.icon}
                      </div>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${done ? "text-emerald-700" : "text-slate-400"}`}>{phase.label}</div>
                      </div>
                      {i < PHASE_CONFIG.length - 1 && (
                        <div className={`absolute ml-[15px] mt-10 w-0.5 h-4 ${done ? "bg-emerald-300" : "bg-slate-200"}`} style={{ display: "none" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            {!isComplete && (
              <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Your Actions</h3>
                <div className="flex flex-col gap-3">
                  {tx.pickup_status === "PENDING" && isBorrower && (
                    <div className="text-center p-4 rounded-xl bg-indigo-50 border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-bold mb-1 uppercase tracking-wide">Your Pickup OTP</div>
                      <div className="text-4xl font-black text-indigo-600 tracking-widest">{tx.pickup_otp}</div>
                      <div className="text-[10px] text-indigo-400 mt-2">Show this to the owner when receiving the item</div>
                    </div>
                  )}

                  {tx.pickup_status === "PENDING" && isOwner && (
                    <div className="flex flex-col gap-2">
                       <input 
                         type="text" 
                         maxLength={6} 
                         placeholder="Enter 6-digit Pickup OTP" 
                         value={pickupOtpInput} 
                         onChange={e => setPickupOtpInput(e.target.value)}
                         className="px-4 py-2.5 rounded-xl border border-slate-200 text-center font-bold tracking-[0.2em] outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400 text-slate-700"
                       />
                       <button onClick={() => updateStatus("verify_pickup", pickupOtpInput)}
                         disabled={pickupOtpInput.length !== 6}
                         className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold cursor-pointer border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                         ✅ Verify Pickup
                       </button>
                    </div>
                  )}

                  {tx.pickup_status === "COMPLETED" && tx.return_status === "PENDING" && isBorrower && !tx.return_otp && (
                    <button onClick={() => updateStatus("ready_return")}
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold cursor-pointer border-none transition-all shadow-md mt-2">
                      🔄 Ready to Return
                    </button>
                  )}

                  {tx.pickup_status === "COMPLETED" && tx.return_status === "PENDING" && isBorrower && tx.return_otp && (
                    <div className="text-center p-4 rounded-xl bg-amber-50 border border-amber-100 mt-2">
                      <div className="text-xs text-amber-600 font-bold mb-1 uppercase tracking-wide">Your Return OTP</div>
                      <div className="text-4xl font-black text-amber-600 tracking-widest">{tx.return_otp}</div>
                      <div className="text-[10px] text-amber-400 mt-2">Show this to the owner when returning the item</div>
                    </div>
                  )}

                  {tx.pickup_status === "COMPLETED" && tx.return_status === "PENDING" && isOwner && (
                    <div className="flex flex-col gap-2 mt-2">
                       <p className="text-xs text-slate-500 text-center mb-1">Waiting for item return...</p>
                       <input 
                         type="text" 
                         maxLength={6} 
                         placeholder="Enter 6-digit Return OTP" 
                         value={returnOtpInput} 
                         onChange={e => setReturnOtpInput(e.target.value)}
                         className="px-4 py-2.5 rounded-xl border border-slate-200 text-center font-bold tracking-[0.2em] outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 text-slate-700"
                       />
                       <button onClick={() => updateStatus("verify_return", returnOtpInput)}
                         disabled={returnOtpInput.length !== 6}
                         className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-lg text-white text-sm font-semibold cursor-pointer border-none transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                         🎉 Verify Return
                       </button>
                    </div>
                  )}

                  {isOwner && (
                    <button onClick={() => updateStatus("report_issue")}
                      className="w-full py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold cursor-pointer hover:bg-red-100 transition-all mt-4">
                      ⚠️ Report Issue
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Chat */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl shadow-sm flex flex-col" style={{ height: "calc(100vh - 160px)", minHeight: "500px" }}>
            {/* Chat header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-white/50 rounded-t-3xl flex-shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span>💬</span> Borrow Chat
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Private conversation about "{tx.resource_name}"</p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2" style={{ minHeight: 0 }}>
              {chat.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-sm text-slate-400">No messages yet. Coordinate pickup & return here!</p>
                  </div>
                </div>
              ) : chat.map(m => {
                const isMe = m.sender_id === user.user_id;
                const isSystem = m.message.startsWith("📦") || m.message.startsWith("✅") || m.message.startsWith("🔄") || m.message.startsWith("🎉") || m.message.startsWith("⚠️");
                if (isSystem) {
                  return (
                    <div key={m.id} className="text-center my-2">
                      <span className="bg-slate-100 text-slate-500 text-xs px-3 py-1.5 rounded-full inline-block border border-slate-200">
                        {m.message}
                      </span>
                      <div className="text-[10px] text-slate-300 mt-1">{new Date(m.created_at).toLocaleString()}</div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] ${isMe ? "order-2" : ""}`}>
                      {!isMe && <div className="text-[10px] text-slate-400 font-semibold mb-0.5 ml-1">{m.sender_name}</div>}
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${isMe
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-br-md"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-md"
                      }`}>
                        {m.message}
                      </div>
                      <div className={`text-[10px] text-slate-300 mt-0.5 ${isMe ? "text-right mr-1" : "ml-1"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-slate-100 bg-white/50 rounded-b-3xl flex-shrink-0">
              {isComplete ? (
                <div className="text-center text-sm text-slate-400 py-2">🎉 Transaction completed. Chat is read-only.</div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={msg} onChange={e => setMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all text-slate-700"
                  />
                  <button onClick={sendMessage} disabled={sending || !msg.trim()}
                    className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold cursor-pointer border-none hover:shadow-lg disabled:opacity-50 flex-shrink-0 transition-all">
                    {sending ? "..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
