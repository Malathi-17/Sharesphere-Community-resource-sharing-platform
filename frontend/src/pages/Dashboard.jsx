import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { id: community_id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch_ = () => {
    fetch(`http://localhost:5001/dashboard/${community_id}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => fetch_(), [community_id]);

  const handleAction = async (endpoint, payload) => {
    await fetch(`http://localhost:5001/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    fetch_();
  };

  if (!data || loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
      <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
    </div>
  );

  const stats = [
    { label: "Members",   val: data.stats?.totalMembers  || 0,      icon: "👥", color: "from-indigo-400 to-violet-500" },
    { label: "Resources", val: data.stats?.totalResources || 0,      icon: "📦", color: "from-amber-400 to-orange-500" },
    { label: "Active",    val: data.stats?.activeBookings || 0,      icon: "⚡", color: "from-emerald-400 to-teal-500" },
    { label: "Overdue",   val: data.stats?.overdueCount  || 0,      icon: "⚠️", color: "from-red-400 to-pink-500" },
    { label: "Fines Collected", val: `₹${data.stats?.fineTotal || "0.00"}`, icon: "₹", color: "from-purple-400 to-fuchsia-500" },
  ];

  const localUser = JSON.parse(localStorage.getItem("user"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 relative overflow-x-hidden">
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-300 opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-violet-300 opacity-15 rounded-full blur-3xl pointer-events-none" />

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", fontSize: "16px" }}>🎭</div>
          <span className="font-bold text-base text-violet-900">ShareSpeare</span>
        </div>
        <button onClick={() => navigate(`/community/${community_id}`)}
          className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-600 transition-colors bg-transparent border-none cursor-pointer">
          ← Back to Community
        </button>
        <button onClick={() => navigate("/communities")}
          className="px-3 py-2 rounded-full border border-violet-200 text-violet-500 text-sm hover:bg-violet-50 transition-all bg-transparent cursor-pointer">
          All Communities
        </button>
      </nav>

      <div className="relative z-10 px-8 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-violet-950 mb-1">Community Dashboard</h1>
          <p className="text-violet-400 text-sm">Admin overview and request management</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white/70 backdrop-blur-xl border border-violet-100 rounded-2xl p-5 hover:shadow-md hover:shadow-violet-100 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 bg-gradient-to-br ${s.color}`}>{s.icon}</div>
              <div className="text-2xl font-black text-violet-900">{s.val}</div>
              <div className="text-xs text-violet-400 mt-1 font-semibold uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* Left column */}
          <div className="flex flex-col gap-6">
            {/* Pending Resources */}
            <div className="bg-white/70 backdrop-blur-xl border border-violet-100 rounded-3xl overflow-hidden shadow-md shadow-violet-50">
              <div className="px-6 py-4 border-b border-violet-50 bg-white/50">
                <h3 className="font-bold text-violet-900 flex items-center gap-2">
                  Pending Resources
                  <span className="bg-violet-100 text-violet-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-violet-200">{(data.pendingResources || []).length}</span>
                </h3>
              </div>
              <div>
                {!(data.pendingResources || []).length ? (
                  <div className="py-10 text-center text-sm text-violet-300">No resource requests</div>
                ) : (data.pendingResources || []).map(r => (
                  <div key={r.resource_id} className="flex items-center justify-between px-6 py-4 border-b border-violet-50 hover:bg-violet-50/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>{r.owner_name?.[0]}</div>
                      <div>
                        <div className="font-semibold text-violet-900 text-sm">{r.name}</div>
                        <div className="text-xs text-violet-400">By {r.owner_name}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(`resource/${r.resource_id}/approve`, { user_id: localUser?.user_id, action: "APPROVE" })}
                        className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer">Approve</button>
                      <button onClick={() => handleAction(`resource/${r.resource_id}/approve`, { user_id: localUser?.user_id, action: "REJECT" })}
                        className="px-3 py-1.5 rounded-full bg-red-100 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-200 cursor-pointer">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Bookings */}
            <div className="bg-white/70 backdrop-blur-xl border border-violet-100 rounded-3xl overflow-hidden shadow-md shadow-violet-50">
              <div className="px-6 py-4 border-b border-violet-50 bg-white/50">
                <h3 className="font-bold text-violet-900">Recent Bookings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "400px" }}>
                  <tbody>
                    {(data.allBookings || []).slice(0, 10).map(b => (
                      <tr key={b.booking_id} className="border-b border-violet-50 hover:bg-violet-50/30 transition-colors">
                        <td className="px-6 py-3">
                          <div className="font-semibold text-violet-900 text-sm">{b.name}</div>
                          <div className="text-xs text-violet-400">{b.borrower_name}</div>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            b.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 border-emerald-200" :
                            b.status === "OVERDUE" ? "bg-red-100 text-red-600 border-red-200" :
                            b.status === "RETURNED" ? "bg-slate-100 text-slate-500 border-slate-200" :
                            "bg-violet-100 text-violet-600 border-violet-200"
                          }`}>{b.status}</span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {b.status === "REQUESTED" && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleAction(`booking/${b.booking_id}/approve`, { user_id: localUser?.user_id })}
                                className="px-3 py-1 rounded-full bg-violet-100 text-violet-600 border border-violet-200 text-xs font-semibold hover:bg-violet-200 cursor-pointer">Approve</button>
                              <button onClick={() => handleAction(`booking/${b.booking_id}/reject`, { user_id: localUser?.user_id, reason: "Rejected by admin" })}
                                className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-semibold hover:bg-slate-200 cursor-pointer">Reject</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-6">
            {/* Top Resources */}
            <div className="bg-white/70 backdrop-blur-xl border border-violet-100 rounded-3xl p-6 shadow-md shadow-violet-50">
              <h3 className="font-bold text-violet-900 mb-5">Top Resources</h3>
              <div className="flex flex-col gap-4">
                {(data.topResources || []).map((r, i) => (
                  <div key={r.name + i} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-violet-100 border border-violet-200 text-xs font-black flex items-center justify-center text-violet-600">{i + 1}</div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-violet-800">{r.name}</div>
                      <div className="h-1.5 bg-violet-100 rounded-full mt-1.5">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 rounded-full" style={{ width: `${Math.min(100, (r.borrow_count / (data.topResources[0]?.borrow_count || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <div className="text-xs font-bold text-violet-400">{r.borrow_count} uses</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Borrowers */}
            <div className="bg-white/70 backdrop-blur-xl border border-violet-100 rounded-3xl p-6 shadow-md shadow-violet-50">
              <h3 className="font-bold text-violet-900 mb-5">Top Borrowers</h3>
              <div className="flex flex-col gap-3">
                {(data.topBorrowers || []).map((b, i) => (
                  <div key={b.name + i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)" }}>{b.name?.[0]}</div>
                      <span className="text-sm font-semibold text-violet-800">{b.name}</span>
                    </div>
                    <span className="bg-violet-100 text-violet-600 text-xs font-bold px-2.5 py-1 rounded-full border border-violet-200">{b.borrow_count} borrows</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
