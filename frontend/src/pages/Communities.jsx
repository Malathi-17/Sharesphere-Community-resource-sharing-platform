import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

const META = {
  COLLEGE: { label: "College", color: "blue" },
  APARTMENT: { label: "Apartment", color: "emerald" },
  OFFICE: { label: "Office", color: "orange" },
  PUBLIC: { label: "Public", color: "indigo" },
};

const FILTERS = ["ALL", "COLLEGE", "APARTMENT", "OFFICE", "PUBLIC"];

const NAV_LINKS = [
  { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />, label: "Communities", path: "/communities" },
  { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />, label: "My Bookings", path: "/bookings" },
  { icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />, label: "Fines", path: "/fines" },
];

export default function Communities() {
  const navigate = useNavigate();
  const location = useLocation();

  const [communities, setCommunities] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinRequests, setShowJoinRequests] = useState(false);

  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));

  /* ── fetch communities from search API ── */
  const fetchCommunities = (searchText = "") => {
    setLoading(true);
    const params = new URLSearchParams({ user_id: user.user_id });
    if (searchText.trim()) params.append("query", searchText.trim());
    fetch(`http://localhost:5001/search-communities?${params}`)
      .then(r => r.json())
      .then(d => { setCommunities(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  /* ── data fetching ── */
  useEffect(() => {
    if (!user) return navigate("/");
    fetchCommunities("");

    const fetchNotifs = () =>
      fetch(`http://localhost:5001/notifications/${user.user_id}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) && setNotifications(d))
        .catch(() => { });

    const fetchAdminRequests = () =>
      fetch(`http://localhost:5001/my-admin-requests/${user.user_id}`)
        .then(r => r.json())
        .then(d => Array.isArray(d) && setJoinRequests(d))
        .catch(() => { });

    fetchNotifs();
    fetchAdminRequests();
    const t = setInterval(() => { fetchNotifs(); fetchAdminRequests(); }, 30000);

    const onStorage = () => {
      const u = JSON.parse(localStorage.getItem("user"));
      if (u) setUser(u);
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(t); window.removeEventListener("storage", onStorage); };
  }, []);

  /* ── debounced search ── */
  useEffect(() => {
    const timer = setTimeout(() => fetchCommunities(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /* ── helpers ── */
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleJoin = async (id) => {
    try {
      const res = await fetch("http://localhost:5001/join-community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.user_id, community_id: id }),
      });
      const data = await res.json();
      if (data.message === "Joined successfully" || data.message === "Already a member") {
        navigate(`/community/${id}`);
      } else {
        showToast(data.message);
        fetchCommunities(search);
      }
    } catch (err) { console.error(err); }
  };

  const handleJoinAction = async (request_id, community_id, action) => {
    try {
      await fetch("http://localhost:5001/approve-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id, action, user_id: user.user_id, community_id }),
      });
      setJoinRequests(prev => prev.filter(r => r.request_id !== request_id));
      showToast(action === "APPROVE" ? "Request approved!" : "Request rejected.");
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    await fetch("http://localhost:5001/notifications/read-all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user?.user_id }),
    });
    setNotifications(p => p.map(n => ({ ...n, read_status: true })));
    setShowNotifs(false);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

  const visible = communities.filter(c => {
    const matchType = filter === "ALL" ? true : c.community_type?.toUpperCase() === filter;
    return matchType;
  });

  const totalMembers = communities.reduce((sum, c) => sum + (c.members || 0), 0);
  const unread = notifications.filter(n => !n.read_status).length;

  return (
    <div className="min-h-screen bg-gray-50 font-sans relative">

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 rounded-xl px-6 py-3.5 text-sm font-medium text-white shadow-2xl flex items-center gap-2">
           <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
          {toast}
        </div>
      )}

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white border-b border-gray-200 shadow-sm gap-4 transition-all">

        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/communities')}>
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/30">
            S
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">ShareSphere</span>
        </div>

        {/* Centre nav links */}
        <div className="hidden md:flex items-center gap-2">
          {NAV_LINKS.map(({ icon, label, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border
                ${isActive(path)
                  ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                  : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {icon}
              </svg>
              <span>{label}</span>
            </button>
          ))}

          {/* Admin link */}
          {user?.role === "SUPER_ADMIN" && (
            <button
              onClick={() => navigate("/admin")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer border
                ${isActive("/admin")
                  ? "bg-blue-50 border-blue-100 text-blue-700 font-semibold"
                  : "bg-transparent border-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Admin</span>
            </button>
          )}
        </div>

        {/* Right side: Notifications + User + Log Out + Create */}
        <div className="flex items-center gap-3 shrink-0 relative">

          {/* Notifications bell */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(p => !p); setShowJoinRequests(false); }}
              className="relative flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-gray-50 hover:border-blue-200 text-gray-500 hover:text-blue-600 transition-all cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>

              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {/* Notifications dropdown */}
            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-900">Notifications</span>
                  {unread > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 font-medium bg-transparent border-none cursor-pointer hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-400">No notifications</div>
                  ) : notifications.slice(0, 10).map(n => (
                    <div key={n.notification_id} className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${!n.read_status ? "bg-blue-50/40" : "hover:bg-gray-50"}`}>
                      <div className="mt-0.5 shrink-0 text-blue-500">
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Join Requests button (only for community admins with pending requests) */}
          {joinRequests.length > 0 && (
            <div className="relative">
              <button
                onClick={() => { setShowJoinRequests(p => !p); setShowNotifs(false); }}
                className="relative flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white hover:bg-amber-50 hover:border-amber-300 text-gray-500 hover:text-amber-600 transition-all cursor-pointer"
                title="Pending Join Requests"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-white">
                  {joinRequests.length > 9 ? "9+" : joinRequests.length}
                </span>
              </button>

              {showJoinRequests && (
                <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-amber-50">
                    <span className="text-sm font-semibold text-gray-900">🤝 Pending Join Requests</span>
                    <span className="text-xs text-amber-600 font-medium">{joinRequests.length} pending</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {joinRequests.map(r => (
                      <div key={r.request_id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">{r.requester_name}</p>
                            <p className="text-xs text-gray-400 truncate">{r.requester_email}</p>
                            <p className="text-xs text-blue-500 font-medium mt-1">→ {r.community_name}</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 mt-1">
                            <button
                              onClick={() => handleJoinAction(r.request_id, r.community_id, "APPROVE")}
                              className="px-3 py-1.5 rounded-lg bg-green-500 text-white text-xs font-semibold hover:bg-green-600 transition-all cursor-pointer border-none"
                            >Accept</button>
                            <button
                              onClick={() => handleJoinAction(r.request_id, r.community_id, "REJECT")}
                              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-all cursor-pointer border-none"
                            >Reject</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User avatar + name */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 transition-all font-medium"
            onClick={() => navigate("/profile")}
          >
            {user?.profile_pic ? (
              <img src={`http://localhost:5001${user.profile_pic}`} alt="Profile" className="w-6 h-6 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                {user?.name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            <span className="text-sm text-gray-800 max-w-[90px] truncate">{user?.name}</span>
          </div>

          {/* Log Out */}
          <button
            onClick={() => { localStorage.removeItem("user"); navigate("/"); }}
            className="hidden md:block px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-gray-300 hover:bg-gray-100 transition-all bg-white cursor-pointer"
          >
            Log Out
          </button>

          {/* Create Community */}
          <button
            onClick={() => navigate("/create-community")}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none flexitems-center gap-2"
          >
            Create
          </button>
        </div>
      </nav>

      {/* ── Header Area ── */}
      <div className="px-8 pt-12 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-8 w-full max-w-7xl mx-auto">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
            Dashboard
          </h1>
          <p className="mt-2 text-base text-gray-500 max-w-lg">
            Manage your joined communities, or search for new groups to request to join.
          </p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm min-w-32">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Total Hubs</div>
            <div className="text-2xl font-bold text-gray-900">{communities.length || "—"}</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm min-w-32">
            <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">Network Size</div>
            <div className="text-2xl font-bold text-gray-900">{totalMembers || "—"}</div>
          </div>
        </div>
      </div>

      {/* ── Search + Filters ── */}
      <div className="px-8 pb-8 w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:items-center justify-between border-b border-gray-200">
        <div className="flex-1 max-w-xl relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search communities by name to discover more..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-sm"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-lg border text-sm font-medium transition-all cursor-pointer whitespace-nowrap
                ${filter === f
                  ? "bg-gray-900 border-gray-900 text-white"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              {f === "ALL" ? "All Filters" : META[f].label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="px-8 py-8 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {search ? 'Search Results' : 'Your Communities'}
          </h2>
          <span className="text-xs text-gray-500 font-medium">
            Showing {visible.length}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center py-24 bg-white border border-gray-100 rounded-3xl shadow-sm">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <div className="text-xl font-bold text-gray-900 mb-2">Nothing found</div>
            <div className="text-gray-500 text-sm">{search ? `No communities match "${search}".` : "You haven't joined any communities matching this filter yet."}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visible.map((c) => (
              <CommunityCard key={c.id} c={c} user={user} onJoin={handleJoin} navigate={navigate} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

function CommunityCard({ c, user, onJoin, navigate }) {
  const m = META[c.community_type?.toUpperCase()] || META.PUBLIC;

  const renderIcon = (type) => {
    // Dynamic tailwind classes don't work well unless safelisted, but I'm assuming regular css colors or default blue
    // For safety, I'll inline the colors based on type to avoid PurgeCSS/Tailwind stripping them
    let colorClass = "text-indigo-600 bg-indigo-50 border-indigo-100";
    if (type === 'COLLEGE') colorClass = "text-blue-600 bg-blue-50 border-blue-100";
    if (type === 'APARTMENT') colorClass = "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (type === 'OFFICE') colorClass = "text-orange-600 bg-orange-50 border-orange-100";

    const defaultClasses = `w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${colorClass}`;
    switch(type) {
      case 'COLLEGE': return <div className={defaultClasses}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeWidth="2" strokeLinejoin="round"/></svg></div>;
      case 'APARTMENT': return <div className={defaultClasses}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg></div>;
      case 'OFFICE': return <div className={defaultClasses}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg></div>;
      default: return <div className={defaultClasses}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/></svg></div>;
    }
  }

  const isOwner = c.created_by === user?.user_id;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col justify-between hover:border-blue-300 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group relative">
      <div>
        <div className="flex items-start justify-between mb-5">
          {renderIcon(c.community_type?.toUpperCase())}
          {isOwner && (
            <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded border border-purple-200 uppercase tracking-widest shrink-0">Owner</span>
          )}
        </div>

        <h3 className="font-bold text-lg text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors line-clamp-1">{c.community_name}</h3>
        <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2 min-h-[40px]">{c.description}</p>
        
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="text-xs font-semibold text-gray-600 border px-2 py-0.5 rounded-md bg-gray-50">{c.members || 0} Member{(c.members || 0) !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <button
        onClick={() => c.joined || isOwner ? navigate(`/community/${c.id}`) : onJoin(c.id)}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all border
          ${c.joined || isOwner
            ? "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
            : "bg-blue-600 border-blue-600 text-white hover:bg-blue-700 hover:shadow-md cursor-pointer"
          }`}
      >
        {c.joined || isOwner ? "Open Community" : "Request to Join"}
      </button>
    </div>
  );
}