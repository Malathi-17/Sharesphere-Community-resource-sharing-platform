import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [adminCommunities, setAdminCommunities] = useState([]);
  const [communityActions, setCommunityActions] = useState({}); // { community_id: { action: "transfer"|"delete", new_owner_id: "" } }
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) return navigate("/");
    fetch(`http://localhost:5001/profile/${user.user_id}`)
      .then(r => r.json())
      .then(d => { setProfile(d); setName(d.name); });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("name", name);
    const fileInput = document.getElementById("pic-input");
    if (fileInput.files[0]) formData.append("profile_pic", fileInput.files[0]);
    const res = await fetch("http://localhost:5001/profile", { method: "PUT", body: formData });
    const data = await res.json();
    const refRes = await fetch(`http://localhost:5001/profile/${user.user_id}`);
    const refData = await refRes.json();
    setProfile(refData);
    const updated = { ...user, name: refData.name, profile_pic: refData.profile_pic };
    localStorage.setItem("user", JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    setSaving(false);
    setMsg(data.message);
    setTimeout(() => setMsg(""), 3000);
  };

  const handleDeleteClick = async () => {
    setDeleteError("");
    // Check if user is admin of any communities
    try {
      const res = await fetch(`http://localhost:5001/admin-communities/${user.user_id}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setAdminCommunities(data);
        // Initialize actions
        const actions = {};
        data.forEach(c => {
          actions[c.community_id] = { action: c.members.length > 0 ? "transfer" : "delete", new_owner_id: c.members[0]?.user_id || "" };
        });
        setCommunityActions(actions);
      } else {
        setAdminCommunities([]);
      }
      setShowDeleteModal(true);
    } catch {
      setDeleteError("Failed to check community admin status");
    }
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      // Step 1: Handle admin communities first
      for (const comm of adminCommunities) {
        const action = communityActions[comm.community_id];
        if (!action) continue;

        if (action.action === "transfer") {
          if (!action.new_owner_id) {
            setDeleteError(`Please select a new owner for "${comm.community_name}"`);
            setDeleteLoading(false);
            return;
          }
          const res = await fetch("http://localhost:5001/transfer-ownership", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              community_id: comm.community_id,
              current_owner_id: user.user_id,
              new_owner_id: action.new_owner_id,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setDeleteError(data.message || "Transfer failed"); setDeleteLoading(false); return; }
        } else if (action.action === "delete") {
          const res = await fetch(`http://localhost:5001/delete-community/${comm.community_id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user.user_id }),
          });
          const data = await res.json();
          if (!res.ok) { setDeleteError(data.message || "Delete community failed"); setDeleteLoading(false); return; }
        }
      }

      // Step 2: Delete account
      const res = await fetch(`http://localhost:5001/account/${user.user_id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        localStorage.removeItem("user");
        navigate("/");
      } else {
        setDeleteError(data.message || "Account deletion failed");
      }
    } catch (e) {
      setDeleteError("An error occurred during account deletion");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!profile) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50">
      <div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-red-100 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-red-600 mb-2">⚠️ Delete Account</h3>
            <p className="text-sm text-slate-500 mb-6">This action is <strong>permanent</strong> and cannot be undone. All your data will be removed.</p>

            {/* Admin communities handling */}
            {adminCommunities.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-bold text-slate-700 mb-3">You are the admin of the following communities:</h4>
                {adminCommunities.map(comm => (
                  <div key={comm.community_id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">🏘</span>
                      <span className="font-semibold text-slate-800">{comm.community_name}</span>
                      <span className="text-xs text-slate-400">({comm.member_count} members)</span>
                    </div>

                    <div className="flex gap-2 mb-3">
                      <button
                        onClick={() => setCommunityActions(p => ({ ...p, [comm.community_id]: { ...p[comm.community_id], action: "transfer" } }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                          communityActions[comm.community_id]?.action === "transfer"
                            ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                        }`}>
                        🔄 Transfer Ownership
                      </button>
                      <button
                        onClick={() => setCommunityActions(p => ({ ...p, [comm.community_id]: { ...p[comm.community_id], action: "delete" } }))}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${
                          communityActions[comm.community_id]?.action === "delete"
                            ? "bg-red-100 border-red-300 text-red-700"
                            : "bg-white border-slate-200 text-slate-500 hover:border-red-200"
                        }`}>
                        🗑 Delete Community
                      </button>
                    </div>

                    {communityActions[comm.community_id]?.action === "transfer" && (
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-1">Select new admin:</label>
                        {comm.members.length === 0 ? (
                          <p className="text-xs text-red-500">No other members. You must delete this community.</p>
                        ) : (
                          <select
                            value={communityActions[comm.community_id]?.new_owner_id || ""}
                            onChange={e => setCommunityActions(p => ({ ...p, [comm.community_id]: { ...p[comm.community_id], new_owner_id: parseInt(e.target.value) } }))}
                            className="w-full p-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                          >
                            <option value="">— Select member —</option>
                            {comm.members.map(m => (
                              <option key={m.user_id} value={m.user_id}>{m.name} ({m.email})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {communityActions[comm.community_id]?.action === "delete" && (
                      <p className="text-xs text-red-500 italic">⚠️ This community and all its resources, posts, and members will be permanently deleted.</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {deleteError && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200 mb-4">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteError(""); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium cursor-pointer bg-transparent hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleConfirmDelete} disabled={deleteLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-semibold cursor-pointer border-none hover:shadow-lg disabled:opacity-60">
                {deleteLoading ? "Deleting..." : "Delete My Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)", fontSize: "16px" }}>🎭</div>
          <span className="font-bold text-base text-slate-800">ShareSpeare</span>
        </div>
        <div className="flex items-center gap-1">
          {[{ label: "⊞ Communities", path: "/communities" }, { label: "📦 My Bookings", path: "/bookings" }, { label: "💸 Fines", path: "/fines" }].map(n => (
            <button key={n.path} onClick={() => navigate(n.path)} className="px-3 py-2 rounded-full text-sm font-medium text-slate-500 hover:bg-white/70 hover:text-slate-800 transition-all cursor-pointer border-none bg-transparent">{n.label}</button>
          ))}
        </div>
        <button onClick={() => { localStorage.removeItem("user"); navigate("/"); }} className="px-3 py-2 rounded-full border border-slate-200 text-slate-500 text-sm hover:border-red-200 hover:text-red-500 transition-all bg-transparent cursor-pointer">Logout</button>
      </nav>

      <div className="relative z-10 px-8 pt-10 pb-20 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-1">My Profile</h1>
          <p className="text-slate-500 text-sm">Manage your account settings and trust score</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1.6fr] gap-6">
          {/* Left: Avatar + stats */}
          <div className="flex flex-col gap-4">
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-lg shadow-indigo-50 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 opacity-10 rounded-t-3xl" />
              <div className="relative z-10">
                {profile.profile_pic ? (
                  <img src={`http://localhost:5001${profile.profile_pic}`} alt="Profile" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 ring-4 ring-white shadow-lg" />
                ) : (
                  <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white shadow-lg" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                    {profile.name?.[0]?.toUpperCase()}
                  </div>
                )}
                <h2 className="text-xl font-black text-slate-800">{profile.name}</h2>
                <p className="text-sm text-slate-400 mb-4">{profile.email}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200">{profile.role}</span>
                  <span className="bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1 rounded-full border border-slate-200">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Trust score */}
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-lg shadow-indigo-50">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Trust Score</div>
              <div className="text-4xl font-black text-amber-500">{parseFloat(profile.trust_score || 5).toFixed(1)} <span className="text-base font-medium text-slate-400">/ 5.0</span></div>
              <div className="flex gap-1 mt-3">
                {[1, 2, 3, 4, 5].map(s => (
                  <span key={s} className="text-2xl" style={{ color: s <= Math.round(profile.trust_score || 5) ? "#f59e0b" : "#e2e8f0" }}>★</span>
                ))}
              </div>
              {profile.suspended && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2">
                  <span>🚫</span><span className="text-sm font-semibold text-red-500">Account Suspended</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: Edit form + Delete */}
          <div className="flex flex-col gap-6">
            <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-8 shadow-lg shadow-indigo-50">
              <h3 className="text-xl font-bold text-slate-800 mb-6">Edit Profile</h3>
              <div className="flex flex-col gap-5">
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Display Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-600 block mb-2">Profile Picture</label>
                  <div className="relative">
                    <input id="pic-input" type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                    <div className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                      <span>📁</span><span>Choose new photo...</span>
                    </div>
                  </div>
                </div>

                {msg && (
                  <div className="px-4 py-3 rounded-xl text-sm bg-emerald-50 text-emerald-600 border border-emerald-200">{msg}</div>
                )}

                <button onClick={handleSave} disabled={saving}
                  className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-200 transition-all cursor-pointer border-none disabled:opacity-60 mt-2">
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-white/70 backdrop-blur-xl border border-red-200 rounded-3xl p-8 shadow-lg">
              <h3 className="text-lg font-bold text-red-600 mb-2">⚠️ Danger Zone</h3>
              <p className="text-sm text-slate-500 mb-4">Permanently delete your account and all associated data. This cannot be undone.</p>
              <button onClick={handleDeleteClick}
                className="px-6 py-2.5 rounded-xl bg-red-50 border border-red-300 text-red-600 text-sm font-semibold hover:bg-red-100 hover:border-red-400 transition-all cursor-pointer">
                🗑 Delete Account
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
