import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const TABS = ["overview", "communities", "users"];

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetch_ = () => {
    fetch("http://localhost:5001/admin/analytics").then(r => r.json()).then(d => setData(d));
  };

  useEffect(() => {
    if (user?.role !== "SUPER_ADMIN") return navigate("/communities");
    fetch_();
  }, []);

  const handleAction = async (endpoint, payload) => {
    await fetch(`http://localhost:5001/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    fetch_();
  };

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
    </div>
  );

  const overviewStats = [
    { label: "Total Users",     val: data.totalUsers,       icon: "👥", color: "from-indigo-400 to-violet-500" },
    { label: "Communities",     val: data.totalCommunities, icon: "🏘", color: "from-emerald-400 to-teal-500" },
    { label: "Total Bookings",  val: data.totalBookings,    icon: "📦", color: "from-amber-400 to-orange-500" },
    { label: "Overdue Now",     val: data.overdueBookings,  icon: "⚠️", color: "from-red-400 to-pink-500" },
    { label: "Fine Revenue",    val: `₹${data.totalFines}`, icon: "₹",  color: "from-indigo-400 to-cyan-500" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "16px" }}>🎭</div>
          <span className="font-bold text-base text-slate-800">ShareSpeare</span>
          <span className="ml-2 text-xs font-bold bg-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full border border-indigo-200">Super Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate("/communities")} className="px-3 py-2 rounded-full text-sm font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800 transition-all cursor-pointer border-none bg-transparent">← Communities</button>
          <button onClick={() => { localStorage.removeItem("user"); navigate("/"); }} className="px-3 py-2 rounded-full border border-slate-200 text-slate-500 text-sm hover:border-red-200 hover:text-red-500 transition-all bg-transparent cursor-pointer">Logout</button>
        </div>
      </nav>

      <div className="relative z-10 px-8 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-1">Super Admin Panel</h1>
          <p className="text-slate-500 text-sm">System-wide management and global analytics</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/70 backdrop-blur-xl border border-white/90 rounded-xl p-1 mb-8 w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all cursor-pointer border-none
                ${activeTab === t ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-200" : "text-slate-500 bg-transparent hover:text-slate-700"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {overviewStats.map(s => (
                <div key={s.label} className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 bg-gradient-to-br ${s.color}`}>{s.icon}</div>
                  <div className="text-2xl font-black text-slate-800">{s.val}</div>
                  <div className="text-xs text-slate-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-indigo-50 border border-dashed border-indigo-300 rounded-2xl p-5">
              <h4 className="font-bold text-indigo-700 mb-1">System Health</h4>
              <p className="text-sm text-indigo-500">All modules are operational. Background fine scanner is active and running hourly.</p>
            </div>
          </>
        )}

        {/* Communities Tab */}
        {activeTab === "communities" && (
          <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Community</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.communitiesDetails?.map(c => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-800 text-sm">{c.community_name}</div>
                      <div className="text-xs text-slate-400">{c.community_type}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{c.membersCount}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleAction("admin/remove-community", { community_id: c.id })}
                        className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-200 cursor-pointer">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr className="border-b border-slate-100 text-left">
                  {["User", "Role", "Trust", "Actions"].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.usersDetails?.map(u => (
                  <tr key={u.user_id} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{u.name?.[0]}</div>
                        <div>
                          <div className={`text-sm font-semibold ${u.suspended ? "text-slate-400" : "text-slate-800"}`}>{u.name}</div>
                          <div className="text-xs text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full border border-indigo-200">{u.role}</span></td>
                    <td className="px-6 py-4 text-sm font-black text-amber-500">{parseFloat(u.trust_score).toFixed(1)}</td>
                    <td className="px-6 py-4">
                      {u.role !== "SUPER_ADMIN" && (
                        u.suspended ? (
                          <button onClick={() => handleAction("admin/suspend-user", { user_id: u.user_id, status: 0 })}
                            className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer">Unsuspend</button>
                        ) : (
                          <button onClick={() => handleAction("admin/suspend-user", { user_id: u.user_id, status: 1 })}
                            className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-200 cursor-pointer">Suspend</button>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
