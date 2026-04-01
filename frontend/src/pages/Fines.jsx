import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
  { icon: "⊞", label: "Communities", path: "/communities" },
  { icon: "📦", label: "My Bookings", path: "/bookings" },
  { icon: "💸", label: "Fines",       path: "/fines" },
];

export default function Fines() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(null);

  const fetchFines = () => {
    fetch(`http://localhost:5001/fines/${user.user_id}`)
      .then(r => r.json())
      .then(d => { setFines(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { if (!user) return navigate("/"); fetchFines(); }, []);

  const handlePay = async (fine_id) => {
    setPayLoading(fine_id);
    const res = await fetch(`http://localhost:5001/pay-fine/${fine_id}`, { method: "POST" });
    const data = await res.json();
    setPayLoading(null);
    if (data.message === "Fine paid successfully") fetchFines();
  };

  const totalUnpaid = fines.filter(f => !f.paid).reduce((acc, f) => acc + parseFloat(f.amount), 0);
  const totalPaid   = fines.filter(f =>  f.paid).reduce((acc, f) => acc + parseFloat(f.amount), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>🎭</div>
          <span className="font-bold text-base text-slate-800">ShareSpeare</span>
        </div>
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ icon, label, path }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border
                ${location.pathname === path
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold"
                  : "bg-transparent border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
                }`}>
              <span>{icon}</span><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/70 cursor-pointer hover:border-indigo-200 transition-all"
            onClick={() => navigate("/profile")}>
            {user?.profile_pic ? (
              <img src={`http://localhost:5001${user.profile_pic}`} alt="Profile" className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span className="text-sm font-medium text-slate-700 max-w-[90px] truncate">{user?.name}</span>
          </div>
          <button onClick={() => { localStorage.removeItem("user"); navigate("/"); }} className="px-3 py-2 rounded-full border border-slate-200 text-slate-500 text-sm hover:border-red-200 hover:text-red-500 transition-all bg-transparent cursor-pointer">Logout</button>
        </div>
      </nav>

      <div className="relative z-10 px-8 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-1">My Fines</h1>
          <p className="text-slate-500 text-sm">Late returns and community fine management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/70 backdrop-blur-xl border border-red-200 rounded-2xl p-5">
            <div className="text-3xl font-black text-red-500">₹{totalUnpaid.toFixed(2)}</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">Total Unpaid</div>
          </div>
          <div className="bg-white/70 backdrop-blur-xl border border-emerald-200 rounded-2xl p-5">
            <div className="text-3xl font-black text-emerald-600">₹{totalPaid.toFixed(2)}</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">Total Paid</div>
          </div>
          <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-2xl p-5">
            <div className="text-3xl font-black bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">{fines.length}</div>
            <div className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wide">Fine Count</div>
          </div>
        </div>

        {/* Warning banner */}
        {totalUnpaid > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex gap-3 items-start">
            <span className="text-xl">💡</span>
            <div>
              <h4 className="text-sm font-bold text-red-500 mb-1">Heads up!</h4>
              <p className="text-xs text-slate-500 leading-relaxed">Users with more than 3 unpaid fines will have their accounts automatically suspended. Please pay your fines to maintain your trust score.</p>
            </div>
          </div>
        )}

        {/* Fines list */}
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" /></div>
        ) : fines.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">💸</div>
            <p className="text-xl font-bold text-slate-500 mb-2">No fines found</p>
            <p className="text-sm text-slate-400">Keep up the good work and return items on time!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {fines.map(f => (
              <div key={f.fine_id} className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-2xl p-5 shadow-sm hover:shadow-md hover:shadow-indigo-50 transition-all flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl ${f.paid ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                    {f.paid ? "✅" : "⚠️"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{f.resource_name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">Reason: {f.reason} · Due: {new Date(f.due_date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="text-right">
                    <div className={`text-xl font-black ${f.paid ? "text-emerald-600" : "text-red-500"}`}>₹{parseFloat(f.amount).toFixed(2)}</div>
                    <div className={`text-xs font-bold uppercase tracking-wide ${f.paid ? "text-emerald-400" : "text-red-400"}`}>{f.paid ? "PAID" : "UNPAID"}</div>
                  </div>
                  {!f.paid && (
                    <button onClick={() => handlePay(f.fine_id)} disabled={payLoading === f.fine_id}
                      className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all cursor-pointer border-none disabled:opacity-60">
                      {payLoading === f.fine_id ? "..." : "Pay Now"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
