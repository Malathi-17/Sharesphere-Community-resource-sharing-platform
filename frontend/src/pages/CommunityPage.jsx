import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const AVATAR_COLORS = [
  "from-violet-600 to-violet-400",
  "from-purple-600 to-purple-400",
  "from-indigo-600 to-indigo-400",
  "from-fuchsia-600 to-fuchsia-400",
  "from-violet-500 to-purple-400",
  "from-purple-500 to-fuchsia-400",
];

function Avatar({ name, idx = 0, size = "w-8 h-8", text = "text-xs" }) {
  const initials = name?.split(" ").map(w => w[0]).join("").slice(0, 2) ?? "?";
  return (
    <div className={`${size} ${text} rounded-full bg-gradient-to-br ${AVATAR_COLORS[idx % 6]} flex items-center justify-center font-bold text-white flex-shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const user = JSON.parse(localStorage.getItem("user"));

  const [community, setCommunity] = useState(null);
  const [members, setMembers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [content, setContent] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [communityAction, setCommunityAction] = useState("");
  const [newOwnerId, setNewOwnerId] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5001/community-posts/${id}`)
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d) ? d : []));

    fetch(`http://localhost:5001/community/${id}`)
      .then(r => r.json())
      .then(d => {
        setCommunity(d.community);
        setMembers(d.members || []);
        setIsAdmin(d.members?.find(m => m.user_id === user?.user_id)?.role === "ADMIN");
      });
  }, [id]);

  const handleLeave = async () => {
    if (community?.created_by === user.user_id) {
      setShowDeleteModal(true);
      return;
    }
    if (!window.confirm("Are you sure you want to leave this community?")) return;
    await fetch("http://localhost:5001/leave-community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id, community_id: id }),
    });
    navigate("/communities", { replace: true });
  };

  const handleConfirmAdminAction = async () => {
    if (!communityAction) { setDeleteError("Please select an action."); return; }
    setDeleteLoading(true);
    setDeleteError("");
    try {
      if (communityAction === "transfer") {
        if (!newOwnerId) throw new Error("Please select a new admin.");
        const res = await fetch("http://localhost:5001/transfer-ownership", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            community_id: id,
            current_owner_id: user.user_id,
            new_owner_id: parseInt(newOwnerId),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Transfer failed");
        
        // Finally leave community cleanly since we are a standard member now
        await fetch("http://localhost:5001/leave-community", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.user_id, community_id: id }),
        });
        navigate("/communities", { replace: true });
      } else if (communityAction === "delete") {
        const res = await fetch(`http://localhost:5001/delete-community/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.user_id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Delete failed");
        
        navigate("/communities", { replace: true });
      }
    } catch (e) {
      setDeleteError(e.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    await fetch("http://localhost:5001/create-post", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ community_id: id, user_id: user.user_id, content }),
    });
    setContent("");
    fetch(`http://localhost:5001/community-posts/${id}`)
      .then(r => r.json())
      .then(d => setPosts(Array.isArray(d) ? d : []));
  };

  if (!community) return (
    <div className="min-h-screen flex items-center justify-center bg-violet-50">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin mx-auto mb-4" />
        <p className="text-violet-400 text-sm">Loading community…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-violet-50 relative overflow-hidden">

      {/* Ambient blobs */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-purple-300 opacity-20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-80 h-80 bg-violet-300 opacity-15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 w-64 h-64 bg-fuchsia-200 opacity-10 rounded-full blur-3xl pointer-events-none" />

      {/* Leave Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-violet-100 max-h-[85vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-violet-900 mb-2">⚠️ Leave Community</h3>
            <p className="text-sm text-slate-500 mb-6">You are the <strong>Owner</strong> of this community. You cannot simply leave. You must choose one of the following options:</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setCommunityAction("transfer")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                  communityAction === "transfer"
                    ? "bg-indigo-100 border-indigo-300 text-indigo-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-indigo-200"
                }`}>
                🔄 Transfer Ownership
              </button>
              <button
                onClick={() => setCommunityAction("delete")}
                className={`flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer border transition-all ${
                  communityAction === "delete"
                    ? "bg-red-100 border-red-300 text-red-700"
                    : "bg-white border-slate-200 text-slate-500 hover:border-red-200"
                }`}>
                🗑 Delete Community
              </button>
            </div>

            {communityAction === "transfer" && (
              <div className="mb-6">
                <label className="text-xs font-semibold text-slate-600 block mb-2">Select new Admin & Leave:</label>
                {members.length <= 1 ? (
                  <p className="text-xs text-red-500">You are the only member in this community. You must delete it.</p>
                ) : (
                  <select
                    value={newOwnerId}
                    onChange={e => setNewOwnerId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer"
                  >
                    <option value="">— Select a member —</option>
                    {members.filter(m => m.user_id !== user.user_id).map(m => (
                      <option key={m.user_id} value={m.user_id}>{m.name}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {communityAction === "delete" && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl">
                <p className="text-xs text-red-600 font-medium">
                  <strong>Warning:</strong> The community, its resources, posts, and member data will be wiped entirely.
                </p>
              </div>
            )}

            {deleteError && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-600 border border-red-200 mb-4">
                {deleteError}
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setShowDeleteModal(false); setDeleteError(""); setCommunityAction(""); }}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold cursor-pointer bg-white hover:bg-slate-50">
                Cancel
              </button>
              <button onClick={handleConfirmAdminAction} disabled={deleteLoading || (communityAction === "transfer" && members.length <= 1)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold cursor-pointer border-none shadow-lg hover:shadow-xl disabled:opacity-50">
                {deleteLoading ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="relative z-10 flex items-center justify-between px-12 py-4 border-b border-violet-100 bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>🎭</div>
          <span className="font-bold text-base text-slate-800 tracking-tight">ShareSpeare</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/community/${id}/resources`)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-violet-200 bg-violet-50 text-violet-600 text-sm font-semibold hover:bg-violet-100 transition-all cursor-pointer"
          >
            📦 Resources
          </button>
          {isAdmin && (
            <button
              onClick={() => navigate(`/community/${id}/dashboard`)}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-purple-200 bg-purple-50 text-purple-600 text-sm font-semibold hover:bg-purple-100 transition-all cursor-pointer"
            >
              📊 Dashboard
            </button>
          )}
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white text-sm font-semibold shadow-lg shadow-violet-200 hover:shadow-violet-300 transition-all cursor-pointer border-none"
          >
            Leave Community <span className="text-base">⛔</span>
          </button>
        </div>
      </nav>

      {/* PAGE */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-10">

        {/* Back */}
        <button
          onClick={() => navigate("/communities")}
          className="flex items-center gap-2 text-violet-400 text-sm mb-7 hover:text-violet-600 transition-colors bg-transparent border-none cursor-pointer p-0"
        >
          ← Back to communities
        </button>

        {/* HEADER CARD */}
        <div className="relative bg-white/85 backdrop-blur-md border border-violet-100 rounded-3xl p-8 shadow-lg shadow-violet-100 mb-5 overflow-hidden">
          {/* top accent */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-400" />

          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-200 border border-violet-200 flex items-center justify-center text-3xl flex-shrink-0">
              🏘
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-extrabold text-violet-950 tracking-tight">
                  {community.community_name}
                </h1>
                <span className="px-3 py-0.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-xs font-bold uppercase tracking-wider">
                  {community.community_type}
                </span>
                {isAdmin && (
                  <span className="px-3 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>

              <p className="text-violet-500 text-sm leading-relaxed mb-5">
                {community.description}
              </p>

              <div className="flex gap-6">
                {[
                  { label: "Members", val: members.length },
                  { label: "Posts", val: posts.length },
                  { label: "Fine Rate", val: `₹${community.fine_rate}/day` },
                ].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-xl font-extrabold text-violet-600 tracking-tight">{s.val}</div>
                    <div className="text-xs text-violet-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="flex gap-1 bg-white/70 backdrop-blur-md border border-violet-100 rounded-xl p-1 mb-5 w-fit">
          {[{ key: "posts", label: "💬 Posts" }, { key: "members", label: "👥 Members" }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold capitalize transition-all cursor-pointer border-none ${activeTab === tab.key
                ? "bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-md shadow-violet-200"
                : "text-violet-400 bg-transparent hover:text-violet-600"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* POSTS TAB */}
        {activeTab === "posts" && (
          <div>
            {/* Compose box */}
            <div className="bg-white/85 backdrop-blur-md border border-violet-100 rounded-2xl p-6 mb-4 shadow-md shadow-violet-50">
              <div className="flex gap-3">
                <Avatar name={user?.name} idx={0} size="w-9 h-9" text="text-sm" />
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share something with the community..."
                    className="w-full min-h-24 p-4 rounded-xl border border-violet-200 bg-violet-50/80 text-violet-900 text-sm placeholder-violet-300 outline-none resize-y focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
                  />
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handlePost}
                      className="px-6 py-2.5 rounded-full bg-gradient-to-r from-violet-600 to-purple-500 text-white text-sm font-semibold shadow-lg shadow-violet-200 hover:shadow-violet-300 hover:scale-105 transition-all cursor-pointer border-none"
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Posts */}
            {posts.length === 0 ? (
              <div className="text-center py-16 text-violet-300">
                <div className="text-4xl mb-3">◎</div>
                <p className="text-sm">No posts yet. Be the first to share!</p>
              </div>
            ) : posts.map((p, i) => (
              <div
                key={p.post_id}
                className="bg-white/85 backdrop-blur-md border border-violet-100 rounded-2xl p-6 mb-3 shadow-sm shadow-violet-50 hover:shadow-md hover:shadow-violet-100 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={p.name} idx={i} size="w-9 h-9" text="text-sm" />
                  <div>
                    <div className="font-semibold text-violet-900 text-sm">{p.name}</div>
                    <div className="text-[10px] text-violet-300">{new Date(p.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <p className="text-violet-700 text-sm leading-relaxed">{p.content}</p>
              </div>
            ))}
          </div>
        )}

        {/* MEMBERS TAB */}
        {activeTab === "members" && (
          <div className="bg-white/85 backdrop-blur-md border border-violet-100 rounded-2xl p-8 shadow-md shadow-violet-50">
            <h2 className="text-lg font-bold text-violet-950 mb-5">
              Members <span className="text-purple-400 font-normal text-base">({members.length})</span>
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {members.map((m, i) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-3 p-4 bg-violet-50/80 border border-violet-100 rounded-xl hover:border-violet-300 hover:bg-violet-50 hover:-translate-y-0.5 hover:shadow-md hover:shadow-violet-100 transition-all cursor-default"
                >
                  <Avatar name={m.name} idx={i} size="w-9 h-9" text="text-sm" />
                  <div>
                    <div className="font-semibold text-violet-900 text-sm truncate">{m.name}</div>
                    <div className={`text-[10px] font-medium ${m.role === "ADMIN" ? "text-violet-500" : "text-violet-300"}`}>
                      {m.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {members.length === 0 && (
              <div className="text-center py-12 text-violet-300">
                <div className="text-3xl mb-3">◎</div>
                <p className="text-sm">No members yet.</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}