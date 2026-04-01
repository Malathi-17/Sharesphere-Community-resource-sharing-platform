import { useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";

const NAV_SECTIONS = [
    {
        label: "MAIN",
        items: [
            { icon: "⊞", label: "Communities", path: "/communities" },
            { icon: "👤", label: "My Profile", path: "/profile" },
        ],
    },
    {
        label: "RESOURCES",
        items: [
            { icon: "📦", label: "My Bookings", path: "/bookings" },
            { icon: "💸", label: "Fines", path: "/fines" },
        ],
    },
];

const ADMIN_SECTION = {
    label: "ADMIN",
    items: [
        { icon: "🛡️", label: "Super Admin", path: "/admin", adminOnly: true },
    ],
};

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(() => JSON.parse(localStorage.getItem("user")));
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetch_ = () =>
            fetch(`http://localhost:5001/notifications/${user.user_id}`)
                .then(r => r.json())
                .then(d => Array.isArray(d) && setNotifications(d))
                .catch(() => { });
        fetch_();
        const t = setInterval(fetch_, 30000);

        const handleStorage = () => {
            const updatedUser = JSON.parse(localStorage.getItem("user"));
            if (updatedUser) {
                setUser(updatedUser);
            }
        };
        window.addEventListener("storage", handleStorage);

        return () => {
            clearInterval(t);
            window.removeEventListener("storage", handleStorage);
        }
    }, []);

    const unread = notifications.filter(n => !n.read_status).length;

    const markAllRead = async () => {
        await fetch("http://localhost:5001/notifications/read-all", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user?.user_id }),
        });
        setNotifications(p => p.map(n => ({ ...n, read_status: true })));
        setShowNotifs(false);
    };

    const TYPE_ICONS = { BOOKING: "📦", FINE: "💸", RATING: "⭐", WAITLIST: "⏳", JOIN: "🤝", SUSPENSION: "🚫", REMINDER: "⏰", INFO: "ℹ️", RESOURCE: "🗂" };

    const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + "/");

    const NavItem = ({ icon, label, path, badge }) => (
        <button
            onClick={() => navigate(path)}
            style={{
                display: "flex", alignItems: "center", gap: "10px",
                width: "100%", padding: "9px 16px", borderRadius: "10px",
                background: isActive(path) ? "rgba(99,102,241,0.15)" : "transparent",
                border: isActive(path) ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
                color: isActive(path) ? "#818cf8" : "var(--text2)",
                fontSize: "13px", fontWeight: isActive(path) ? "600" : "500",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                transition: "all 0.15s",
            }}
            onMouseEnter={e => { if (!isActive(path)) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "var(--text)"; } }}
            onMouseLeave={e => { if (!isActive(path)) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; } }}
        >
            <span style={{ fontSize: "15px", width: "20px", textAlign: "center" }}>{icon}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {badge > 0 && (
                <span style={{ background: "#ef4444", color: "white", fontSize: "10px", fontWeight: "700", borderRadius: "20px", padding: "1px 6px", minWidth: "18px", textAlign: "center" }}>
                    {badge > 9 ? "9+" : badge}
                </span>
            )}
        </button>
    );

    return (
        <>
            <div className="sidebar" style={{ padding: "20px 12px", gap: "4px" }}>
                {/* Logo */}
                <div style={{ padding: "8px 16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{
                            width: "34px", height: "34px", borderRadius: "10px",
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "16px", boxShadow: "0 4px 15px rgba(99,102,241,0.35)",
                        }}>🎭</div>
                        <div>
                            <div style={{ fontWeight: "800", fontSize: "15px", color: "var(--text)", letterSpacing: "-0.3px" }}>ShareSpeare</div>
                            <div style={{ fontSize: "10px", color: "var(--text3)", fontWeight: "500" }}>Community Platform</div>
                        </div>
                    </div>
                </div>

                {/* Nav sections */}
                {NAV_SECTIONS.map(section => (
                    <div key={section.label} style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text3)", letterSpacing: "1px", padding: "0 16px", marginBottom: "6px" }}>
                            {section.label}
                        </div>
                        {section.items.map(item => (
                            <NavItem key={item.path} {...item} badge={item.path === "/fines" ? 0 : 0} />
                        ))}
                    </div>
                ))}

                {/* Notifications */}
                <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text3)", letterSpacing: "1px", padding: "0 16px", marginBottom: "6px" }}>NOTIFICATIONS</div>
                    <button
                        onClick={() => setShowNotifs(p => !p)}
                        style={{
                            display: "flex", alignItems: "center", gap: "10px",
                            width: "100%", padding: "9px 16px", borderRadius: "10px",
                            background: showNotifs ? "rgba(99,102,241,0.15)" : "transparent",
                            border: "1px solid transparent",
                            color: showNotifs ? "#818cf8" : "var(--text2)",
                            fontSize: "13px", fontWeight: "500",
                            cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                            transition: "all 0.15s",
                        }}
                    >
                        <span style={{ fontSize: "15px", width: "20px", textAlign: "center" }}>🔔</span>
                        <span style={{ flex: 1 }}>Notifications</span>
                        {unread > 0 && (
                            <span style={{ background: "#ef4444", color: "white", fontSize: "10px", fontWeight: "700", borderRadius: "20px", padding: "1px 6px" }}>
                                {unread > 9 ? "9+" : unread}
                            </span>
                        )}
                    </button>

                    {/* Notifications dropdown */}
                    {showNotifs && (
                        <div style={{
                            background: "var(--surface2)", border: "1px solid var(--border)",
                            borderRadius: "12px", marginTop: "8px", overflow: "hidden",
                        }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}>
                                <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text)" }}>Recent</span>
                                {unread > 0 && (
                                    <button onClick={markAllRead} style={{ fontSize: "11px", color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
                                        Clear all
                                    </button>
                                )}
                            </div>
                            <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                                {notifications.length === 0 ? (
                                    <div style={{ padding: "20px", textAlign: "center", fontSize: "12px", color: "var(--text3)" }}>No notifications</div>
                                ) : notifications.slice(0, 8).map(n => (
                                    <div key={n.notification_id} style={{
                                        padding: "10px 14px", borderBottom: "1px solid var(--border)",
                                        background: !n.read_status ? "rgba(99,102,241,0.06)" : "transparent",
                                        display: "flex", gap: "10px",
                                    }}>
                                        <span style={{ fontSize: "14px", flexShrink: 0 }}>{TYPE_ICONS[n.type] || "ℹ️"}</span>
                                        <div>
                                            <p style={{ fontSize: "12px", color: "var(--text)", lineHeight: "1.4" }}>{n.message}</p>
                                            <p style={{ fontSize: "10px", color: "var(--text3)", marginTop: "2px" }}>{new Date(n.created_at).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Admin */}
                {user?.role === "SUPER_ADMIN" && (
                    <div style={{ marginBottom: "20px" }}>
                        <div style={{ fontSize: "10px", fontWeight: "700", color: "var(--text3)", letterSpacing: "1px", padding: "0 16px", marginBottom: "6px" }}>SUPER ADMIN</div>
                        <NavItem icon="🛡️" label="Admin Panel" path="/admin" />
                    </div>
                )}

                {/* Spacer */}
                <div style={{ flex: 1 }} />

                {/* User Footer */}
                <div style={{
                    borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "auto",
                    display: "flex", alignItems: "center", gap: "10px",
                }}>
                    {user?.profile_pic ? (
                        <img src={`http://localhost:5001${user.profile_pic}`} alt="Profile" style={{ width: "34px", height: "34px", borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                    ) : (
                        <div className="avatar" style={{ width: "34px", height: "34px", fontSize: "13px", fontWeight: "700", flexShrink: 0 }}>
                            {user?.name?.[0]?.toUpperCase() || "?"}
                        </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {user?.name}
                        </div>
                        <div style={{ fontSize: "10px", color: "var(--text3)" }}>{user?.role}</div>
                    </div>
                    <button
                        onClick={() => { localStorage.removeItem("user"); navigate("/"); }}
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--text3)", padding: "4px", borderRadius: "6px" }}
                        title="Logout"
                    >
                        ⏏
                    </button>
                </div>
            </div>
        </>
    );
}
