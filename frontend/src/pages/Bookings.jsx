import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NAV_LINKS = [
    { icon: "⊞", label: "Communities", path: "/communities" },
    { icon: "📦", label: "My Bookings", path: "/bookings" },
    { icon: "💸", label: "Fines",       path: "/fines" },
];

function TopNav({ navigate }) {
    const user = JSON.parse(localStorage.getItem("user"));
    return (
        <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/60 backdrop-blur-xl border-b border-white/80 shadow-sm">
            <div className="flex items-center gap-2 shrink-0">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>🎭</div>
                <span className="font-bold text-base text-slate-800 tracking-tight">ShareSpeare</span>
            </div>
            <div className="flex items-center gap-1">
                {NAV_LINKS.map(({ icon, label, path }) => (
                    <button key={path} onClick={() => navigate(path)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border
                            ${window.location.pathname === path
                                ? "bg-indigo-50 border-indigo-200 text-indigo-600 font-semibold"
                                : "bg-transparent border-transparent text-slate-500 hover:bg-white/70 hover:text-slate-800"
                            }`}>
                        <span>{icon}</span><span>{label}</span>
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-white/70 cursor-pointer hover:border-indigo-200 transition-all" onClick={() => navigate("/profile")}>
                    {user?.profile_pic ? (
                        <img src={`http://localhost:5001${user.profile_pic}`} alt="Profile" className="w-6 h-6 rounded-full object-cover shrink-0" />
                    ) : (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>
                            {user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <span className="text-sm font-medium text-slate-700 max-w-[90px] truncate">{user?.name}</span>
                </div>
                <button onClick={() => { localStorage.removeItem("user"); navigate("/"); }}
                    className="px-3 py-2 rounded-full border border-slate-200 text-slate-500 text-sm hover:border-red-200 hover:text-red-500 transition-all bg-transparent cursor-pointer">
                    Logout
                </button>
            </div>
        </nav>
    );
}

const STATUS_COLORS = {
    ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
    REQUESTED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    OVERDUE: "bg-red-100 text-red-700 border-red-200",
    RETURNED: "bg-slate-100 text-slate-600 border-slate-200",
    REJECTED: "bg-orange-100 text-orange-700 border-orange-200",
    PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    ACCEPTED: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function Bookings() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const [bookings, setBookings] = useState([]);
    const [incoming, setIncoming] = useState([]);
    const [ownerRequests, setOwnerRequests] = useState([]);
    const [myBorrowRequests, setMyBorrowRequests] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [ratingModal, setRatingModal] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState("");
    const [toast, setToast] = useState("");
    const [activeTab, setActiveTab] = useState("requests");

    const fetchAll = () => {
        Promise.all([
            fetch(`http://localhost:5001/bookings/user/${user.user_id}`).then(r => r.json()),
            fetch(`http://localhost:5001/incoming-requests/${user.user_id}`).then(r => r.json()),
            fetch(`http://localhost:5001/owner/requests/${user.user_id}`).then(r => r.json()),
            fetch(`http://localhost:5001/my-borrow-requests/${user.user_id}`).then(r => r.json()),
            fetch(`http://localhost:5001/my-transactions/${user.user_id}`).then(r => r.json()),
        ]).then(([b, i, or, mbr, txs]) => {
            setBookings(Array.isArray(b) ? b : []);
            setIncoming(Array.isArray(i) ? i : []);
            setOwnerRequests(Array.isArray(or) ? or : []);
            setMyBorrowRequests(Array.isArray(mbr) ? mbr : []);
            setTransactions(Array.isArray(txs) ? txs : []);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => { if (!user) return navigate("/"); fetchAll(); }, []);

    const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

    const handleAction = async (endpoint, payload) => {
        const res = await fetch(`http://localhost:5001/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const data = await res.json(); showToast(data.message || "Success"); fetchAll();
    };

    const handleReturn = async (booking_id) => {
        const res = await fetch(`http://localhost:5001/booking/${booking_id}/return`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.user_id }) });
        const data = await res.json(); showToast(data.message || data.error); fetchAll();
        if (res.ok) setRatingModal(bookings.find(b => b.booking_id === booking_id));
    };

    const submitRating = async () => {
        await fetch("http://localhost:5001/rating", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ booking_id: ratingModal.booking_id, reviewer_id: user.user_id, reviewee_id: ratingModal.owner_id, rating, comment }) });
        setRatingModal(null); setRating(5); setComment(""); showToast("Rating submitted! Thank you.");
    };

    const handleExtend = async (booking_id) => {
        const days = window.prompt("How many extra days?"); if (!days) return;
        const res = await fetch(`http://localhost:5001/booking/${booking_id}/extend`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: user.user_id, days }) });
        const data = await res.json(); showToast(data.message || data.error); fetchAll();
    };

    const handleAcceptRequest = async (id) => {
        await handleAction(`request/${id}/accept`, { user_id: user.user_id });
    };
    const handleRejectRequest = async (id) => {
        const reason = window.prompt("Reason for rejection (optional):");
        await handleAction(`request/${id}/reject`, { user_id: user.user_id, reason });
    };

    const pendingOwnerRequests = ownerRequests.filter(r => r.status === "PENDING");
    const pendingMyRequests = myBorrowRequests.filter(r => r.status === "PENDING");
    
    // Active array
    const activeTx = transactions.filter(t => !t.completed_at);
    
    // Overdue array
    const today = new Date();
    today.setHours(0,0,0,0);
    const overdueTx = transactions.filter(t => {
        if (t.completed_at) return false;
        const due = new Date(t.due_date);
        return due < today;
    });

    const stats = [
        { label: "Active", val: activeTx.length, color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
        { label: "Pending Requests", val: pendingOwnerRequests.length + pendingMyRequests.length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
        { label: "Overdue", val: overdueTx.length, color: "text-red-500", bg: "bg-red-50 border-red-200" },
    ];

    const TABS = [
        { key: "requests", label: "📩 Borrow Requests", badge: pendingOwnerRequests.length },
        { key: "my-requests", label: "📤 My Requests", badge: pendingMyRequests.length },
        { key: "transactions", label: "🔄 Transactions", badge: activeTx.length },
        { key: "bookings", label: "📦 Bookings", badge: incoming.length },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
            <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
            <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

            {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md border border-indigo-100 rounded-2xl px-6 py-3.5 text-sm font-medium text-slate-800 shadow-xl whitespace-nowrap">{toast}</div>}

            {/* Rating Modal */}
            {ratingModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-indigo-100">
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Rate Item & Lender</h3>
                        <p className="text-sm text-slate-500 mb-6">How was your experience with <span className="font-semibold text-slate-700">{ratingModal.name}</span>?</p>
                        <div className="flex justify-center gap-3 mb-6">
                            {[1, 2, 3, 4, 5].map(s => (
                                <button key={s} onClick={() => setRating(s)} className="border-none bg-transparent cursor-pointer text-4xl transition-transform hover:scale-110" style={{ color: s <= rating ? "#f59e0b" : "#e2e8f0" }}>★</button>
                            ))}
                        </div>
                        <textarea rows={3} placeholder="Add a comment (optional)..." value={comment} onChange={e => setComment(e.target.value)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-300 resize-none mb-6" />
                        <div className="flex gap-3">
                            <button onClick={() => setRatingModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 cursor-pointer bg-transparent">Skip</button>
                            <button onClick={submitRating} className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold cursor-pointer border-none">Submit Review</button>
                        </div>
                    </div>
                </div>
            )}

            <TopNav navigate={navigate} />

            <div className="relative z-10 px-8 pt-10 pb-20">
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 mb-1">My Bookings</h1>
                    <p className="text-slate-500 text-sm">Track borrow requests, items you've lent, and your borrowings</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    {stats.map(s => (
                        <div key={s.label} className={`bg-white/70 backdrop-blur-xl border rounded-2xl p-5 ${s.bg}`}>
                            <div className={`text-3xl font-black ${s.color}`}>{s.val}</div>
                            <div className="text-xs font-semibold text-slate-500 mt-1 uppercase tracking-wide">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-white/70 backdrop-blur-md border border-slate-200 rounded-xl p-1 mb-6 w-fit">
                    {TABS.map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${
                                activeTab === tab.key
                                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md shadow-indigo-200"
                                    : "text-slate-400 bg-transparent hover:text-slate-600"
                            }`}>
                            {tab.label}
                            {tab.badge > 0 && (
                                <span className="bg-white/30 text-xs font-bold px-1.5 py-0.5 rounded-full">{tab.badge}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* TAB: Borrow Requests (Owner View) */}
                {activeTab === "requests" && (
                    <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50 mb-6">
                        <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                Incoming Borrow Requests
                                <span className="bg-amber-100 text-amber-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-amber-200">{pendingOwnerRequests.length} pending</span>
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "800px" }}>
                                <thead>
                                    <tr className="border-b border-slate-100 text-left">
                                        {["Item", "Borrower", "Community", "Duration", "Purpose", "Status", "Actions"].map(h => (
                                            <th key={h} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="7" className="py-12 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" /></td></tr>
                                    ) : ownerRequests.length === 0 ? (
                                        <tr><td colSpan="7" className="py-10 text-center text-sm text-slate-400">No borrow requests yet</td></tr>
                                    ) : ownerRequests.map(r => (
                                        <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-700">{r.resource_name}</span></td>
                                            <td className="px-5 py-4">
                                                <div>
                                                    <span className="text-sm font-medium text-slate-600">{r.borrower_name}</span>
                                                    <div className="text-xs text-slate-400">Trust: ★ {parseFloat(r.borrower_trust || 5).toFixed(1)}</div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500">{r.community_name}</td>
                                            <td className="px-5 py-4 text-xs text-slate-500">
                                                {new Date(r.borrow_from_date).toLocaleDateString()} → {new Date(r.expected_return_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4 text-xs text-slate-500 max-w-32 truncate">{r.purpose || "—"}</td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{r.status}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                {r.status === "PENDING" ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleAcceptRequest(r.id)} className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer">Accept</button>
                                                        <button onClick={() => handleRejectRequest(r.id)} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-200 cursor-pointer">Reject</button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400">{r.status === "ACCEPTED" ? "Accepted" : "Rejected"}</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: My Borrow Requests (Borrower View) */}
                {activeTab === "my-requests" && (
                    <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50 mb-6">
                        <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                            <h3 className="font-bold text-slate-800">My Borrow Requests</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "700px" }}>
                                <thead>
                                    <tr className="border-b border-slate-100 text-left">
                                        {["Item", "Owner", "Community", "Duration", "Status"].map(h => (
                                            <th key={h} className="px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" className="py-12 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" /></td></tr>
                                    ) : myBorrowRequests.length === 0 ? (
                                        <tr><td colSpan="5"><div className="py-16 text-center"><div className="text-4xl mb-3">📤</div><p className="font-semibold text-slate-500">No requests sent</p><p className="text-xs text-slate-400 mt-1">Request to borrow items from community resources.</p></div></td></tr>
                                    ) : myBorrowRequests.map(r => (
                                        <tr key={r.id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-5 py-4"><span className="text-sm font-semibold text-slate-700">{r.resource_name}</span></td>
                                            <td className="px-5 py-4 text-sm text-slate-500">{r.owner_name}</td>
                                            <td className="px-5 py-4 text-sm text-slate-500">{r.community_name}</td>
                                            <td className="px-5 py-4 text-xs text-slate-400">
                                                {new Date(r.borrow_from_date).toLocaleDateString()} → {new Date(r.expected_return_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{r.status}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB: Legacy Bookings */}
                {activeTab === "bookings" && (
                    <>
                        {/* Incoming Requests (legacy) */}
                        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50 mb-6">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    Incoming Requests
                                    <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">{incoming.length}</span>
                                </h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "700px" }}>
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left">
                                            {["Item", "Borrower", "Duration", "Actions"].map(h => (
                                                <th key={h} className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="4" className="py-12 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" /></td></tr>
                                        ) : incoming.length === 0 ? (
                                            <tr><td colSpan="4" className="py-10 text-center text-sm text-slate-400">No incoming requests</td></tr>
                                        ) : incoming.map(r => (
                                            <tr key={r.booking_id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-6 py-4"><div className="flex items-center gap-2"><span className="text-lg">📦</span><span className="text-sm font-semibold text-slate-700">{r.resource_name}</span></div></td>
                                                <td className="px-6 py-4"><span className="text-sm font-medium text-slate-600">{r.borrower_name}</span></td>
                                                <td className="px-6 py-4 text-xs text-slate-400">{new Date(r.start_date).toLocaleDateString()} → {new Date(r.end_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleAction(`booking/${r.booking_id}/approve`, { user_id: user.user_id })} className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer">Approve</button>
                                                        <button onClick={() => handleAction(`booking/${r.booking_id}/reject`, { user_id: user.user_id, reason: "Rejected by owner" })} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-200 cursor-pointer">Reject</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* My Borrowings */}
                        <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50">
                            <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                                <h3 className="font-bold text-slate-800">My Borrowings</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full" style={{ borderCollapse: "collapse", minWidth: "750px" }}>
                                    <thead>
                                        <tr className="border-b border-slate-100 text-left">
                                            {["Item", "Community", "Due Date", "Status", "Actions"].map(h => (
                                                <th key={h} className="px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="5" className="py-12 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" /></td></tr>
                                        ) : bookings.length === 0 ? (
                                            <tr><td colSpan="5"><div className="py-16 text-center"><div className="text-4xl mb-3">📂</div><p className="font-semibold text-slate-500">No bookings found</p><p className="text-xs text-slate-400 mt-1">Borrowed items will appear here.</p></div></td></tr>
                                        ) : bookings.map(b => (
                                            <tr key={b.booking_id} className="border-b border-slate-50 hover:bg-indigo-50/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-base">📦</div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-800">{b.name || b.resource_name}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{b.community_name}</td>
                                                <td className="px-6 py-4 text-sm text-slate-500">{new Date(b.end_date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[b.status] || "bg-slate-100 text-slate-600 border-slate-200"}`}>{b.status}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        {(b.status === "ACTIVE" || b.status === "OVERDUE") ? (
                                                            <>
                                                                <button onClick={() => handleReturn(b.booking_id)} className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-semibold hover:bg-emerald-200 cursor-pointer">Return</button>
                                                                <button onClick={() => handleExtend(b.booking_id)} className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold hover:bg-slate-200 cursor-pointer">Extend</button>
                                                            </>
                                                        ) : b.status === "RETURNED" ? (
                                                            <button onClick={() => setRatingModal(b)} className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 text-xs font-semibold hover:bg-amber-200 cursor-pointer">⭐ Rate</button>
                                                        ) : (
                                                            <span className="text-xs text-slate-400">Wait for approval</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {/* TAB: Transactions */}
                {activeTab === "transactions" && (
                    <div className="bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl overflow-hidden shadow-lg shadow-indigo-50">
                        <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                Borrow Transactions
                                <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">{transactions.length}</span>
                            </h3>
                        </div>
                        {loading ? (
                            <div className="py-12 text-center"><div className="w-8 h-8 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin mx-auto" /></div>
                        ) : transactions.length === 0 ? (
                            <div className="py-16 text-center"><div className="text-4xl mb-3">🔄</div><p className="font-semibold text-slate-500">No transactions yet</p><p className="text-xs text-slate-400 mt-1">Accepted borrow requests will create transactions here.</p></div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                                {transactions.map(t => {
                                    const isComplete = !!t.completed_at;
                                    const due = new Date(t.due_date);
                                    const isOverdue = !isComplete && due < new Date();
                                    const iAmBorrower = t.borrower_id === user.user_id;
                                    return (
                                        <div key={t.id} className="bg-white/80 border border-slate-200 rounded-2xl p-5 hover:shadow-lg hover:shadow-indigo-100 hover:-translate-y-0.5 transition-all cursor-pointer relative overflow-hidden"
                                            onClick={() => navigate(`/transaction/${t.id}`)}>
                                            <div className={`absolute top-0 left-0 right-0 h-1 ${isComplete ? 'bg-emerald-400' : isOverdue ? 'bg-red-400' : 'bg-gradient-to-r from-indigo-400 to-violet-400'}`} />
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <div className="text-sm font-bold text-slate-800">{t.resource_name}</div>
                                                    <div className="text-xs text-slate-400 mt-0.5">{t.community_name}</div>
                                                </div>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${isComplete ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : isOverdue ? 'bg-red-100 text-red-600 border-red-200' : 'bg-indigo-100 text-indigo-600 border-indigo-200'}`}>
                                                    {isComplete ? '✅ Done' : isOverdue ? '⚠️ Overdue' : '🔄 Active'}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                                <span>{iAmBorrower ? '📦 Borrowing from' : '🤝 Lending to'}</span>
                                                <span className="font-semibold text-slate-700">{t.other_party_name}</span>
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <span className={`px-2 py-0.5 rounded-full border ${t.pickup_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Pickup {t.pickup_status === 'COMPLETED' ? '✓' : '○'}</span>
                                                <span className={`px-2 py-0.5 rounded-full border ${t.handover_status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Handover {t.handover_status === 'COMPLETED' ? '✓' : '○'}</span>
                                                <span className={`px-2 py-0.5 rounded-full border ${t.return_status === 'RETURNED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>Return {t.return_status === 'RETURNED' ? '✓' : '○'}</span>
                                            </div>
                                            <div className="text-xs text-slate-400 mt-3 flex justify-between">
                                                <span>Due: {due.toLocaleDateString()}</span>
                                                <span className="text-indigo-500 font-semibold">View →</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
