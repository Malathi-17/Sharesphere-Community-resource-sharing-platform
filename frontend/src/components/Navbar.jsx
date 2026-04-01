import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem("user"));
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchNotifs = () => {
            fetch(`http://localhost:5001/notifications/${user.user_id}`)
                .then(r => r.json())
                .then(d => Array.isArray(d) && setNotifications(d))
                .catch(() => { });
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => clearInterval(interval);
    }, []);

    const unread = notifications.filter(n => !n.read_status).length;

    const markAllRead = async () => {
        await fetch("http://localhost:5001/notifications/read-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user?.user_id }),
        });
        setNotifications(prev => prev.map(n => ({ ...n, read_status: true })));
    };

    const TYPE_ICONS = { BOOKING: "📦", FINE: "💸", RATING: "⭐", WAITLIST: "⏳", JOIN: "🤝", SUSPENSION: "🚫", REMINDER: "⏰", INFO: "ℹ️", RESOURCE: "🗂" };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="sticky top-0 z-40 flex items-center justify-between px-8 h-16 bg-white/70 backdrop-blur-xl border-b border-white/80 shadow-sm">
            <button onClick={() => navigate("/communities")} className="font-black text-lg text-slate-800 tracking-tight bg-transparent border-none cursor-pointer">
                ShareSpeare
            </button>

            <div className="flex items-center gap-2">
                {[
                    { label: "Communities", path: "/communities" },
                    { label: "My Bookings", path: "/bookings" },
                    { label: "Fines", path: "/fines" },
                ].map(item => (
                    <button key={item.path} onClick={() => navigate(item.path)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border-none
              ${isActive(item.path) ? "bg-indigo-100 text-indigo-700" : "text-slate-500 bg-transparent hover:text-indigo-500"}`}>
                        {item.label}
                    </button>
                ))}

                {/* Notification Bell */}
                <div className="relative">
                    <button onClick={() => setShowNotifs(p => !p)}
                        className="relative w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-lg hover:bg-indigo-100 transition cursor-pointer border-none">
                        🔔
                        {unread > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {unread > 9 ? "9+" : unread}
                            </span>
                        )}
                    </button>

                    {showNotifs && (
                        <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                                <span className="font-bold text-slate-700 text-sm">Notifications</span>
                                {unread > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-indigo-500 cursor-pointer bg-transparent border-none font-medium">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="py-8 text-center text-slate-300 text-sm">No notifications</div>
                                ) : notifications.map(n => (
                                    <div key={n.notification_id}
                                        className={`px-4 py-3 border-b border-slate-50 flex gap-3 ${!n.read_status ? "bg-indigo-50/50" : ""}`}>
                                        <span className="text-lg flex-shrink-0">{TYPE_ICONS[n.type] || "ℹ️"}</span>
                                        <div>
                                            <p className="text-sm text-slate-700 leading-snug">{n.message}</p>
                                            <p className="text-xs text-slate-300 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile */}
                <button onClick={() => navigate("/profile")}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white text-sm font-bold flex items-center justify-center cursor-pointer border-none shadow-md">
                    {user?.name?.[0]?.toUpperCase() || "?"}
                </button>

                {/* Admin Panel */}
                {user?.role === "SUPER_ADMIN" && (
                    <button onClick={() => navigate("/admin")}
                        className="px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-sm font-bold border border-rose-200 hover:bg-rose-100 transition cursor-pointer">
                        Admin
                    </button>
                )}

                {/* Logout */}
                <button onClick={() => { localStorage.removeItem("user"); navigate("/"); }}
                    className="px-3 py-1.5 rounded-full border border-slate-200 text-slate-400 text-sm hover:text-red-400 hover:border-red-200 transition cursor-pointer bg-transparent">
                    Log Out
                </button>
            </div>
        </nav>
    );
}
