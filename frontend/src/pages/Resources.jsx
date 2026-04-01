import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const CATEGORIES = ["Tools", "Books", "Electronics", "Furniture", "Sports", "Kitchen", "Clothing", "Other"];

const CONDITION_STYLES = {
  New:  "bg-emerald-100 text-emerald-700 border-emerald-200",
  Good: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Fair: "bg-amber-100 text-amber-700 border-amber-200",
  Poor: "bg-slate-100 text-slate-500 border-slate-200",
};

export default function Resources() {
  const { id: community_id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [resources, setResources] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [borrowModal, setBorrowModal] = useState(null);
  const [borrowForm, setBorrowForm] = useState({ borrow_from_date: "", expected_return_date: "", purpose: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch(`http://localhost:5001/resources/${community_id}`)
      .then(r => r.json())
      .then(d => { setResources(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [community_id]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  const handleBorrowRequest = async () => {
    if (!borrowForm.borrow_from_date || !borrowForm.expected_return_date)
      return showToast("Please select both dates");

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const borrowDate = new Date(borrowForm.borrow_from_date);
    const returnDate = new Date(borrowForm.expected_return_date);

    if (borrowDate < today) {
      return showToast("Borrow date cannot be in the past");
    }
    if (returnDate < borrowDate) {
      return showToast("Return date must be equal to or after borrow date");
    }
    const maxDays = borrowModal.max_days_allowed || 7;
    const diffDays = Math.ceil((returnDate - borrowDate) / (1000 * 60 * 60 * 24));
    if (diffDays > maxDays) {
      return showToast(`Maximum borrow duration is ${maxDays} days`);
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:5001/borrow-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource_id: borrowModal.resource_id,
          borrower_id: user.user_id,
          community_id,
          borrow_from_date: borrowForm.borrow_from_date,
          expected_return_date: borrowForm.expected_return_date,
          purpose: borrowForm.purpose,
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        showToast(data.error || data.message || "Request failed");
        return;
      }

      showToast(data.message);
      setBorrowModal(null);
      setBorrowForm({ borrow_from_date: "", expected_return_date: "", purpose: "" });
    } catch {
      showToast("Failed to send request");
    } finally {
      setSubmitting(false);
    }
  };

  const visible = resources.filter(r => {
    const q = search.toLowerCase();
    return (!q || r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q)) &&
           (filterCat === "All" || r.category === filterCat);
  });

  const todayStr = new Date().toISOString().split("T")[0];

  let dateError = "";
  if (borrowForm.borrow_from_date && borrowForm.expected_return_date && borrowModal) {
    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);
    const bDate = new Date(borrowForm.borrow_from_date);
    const rDate = new Date(borrowForm.expected_return_date);
    if (bDate < todayObj) {
      dateError = "Borrow date cannot be in the past";
    } else if (rDate < bDate) {
      dateError = "Return date must be equal to or after borrow date";
    } else {
      const maxD = borrowModal.max_days_allowed || 7;
      const diffD = Math.ceil((rDate - bDate) / (1000 * 60 * 60 * 24));
      if (diffD > maxD) dateError = `Maximum borrow duration is ${maxD} days`;
    }
  }
  const isFormValid = borrowForm.borrow_from_date && borrowForm.expected_return_date && !dateError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 relative overflow-x-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

      {toast && <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-white/90 backdrop-blur-md border border-indigo-100 rounded-2xl px-6 py-3.5 text-sm font-medium text-slate-800 shadow-xl whitespace-nowrap">{toast}</div>}

      {/* Borrow Request Modal */}
      {borrowModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 w-full max-w-md shadow-2xl border border-indigo-100">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Request to Borrow</h3>
            <p className="text-sm text-slate-500 mb-1">Item: <span className="font-semibold text-slate-700">{borrowModal.name}</span></p>
            <p className="text-xs text-slate-400 mb-6">Max {borrowModal.max_days_allowed || 7} days • Deposit: ₹{parseFloat(borrowModal.deposit_amount || 0).toFixed(2)}</p>

            <div className="flex flex-col gap-4 mb-6">
              {dateError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold">
                  {dateError}
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">Borrow From</label>
                <input type="date" min={todayStr} value={borrowForm.borrow_from_date}
                  onChange={e => setBorrowForm(p => ({ ...p, borrow_from_date: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">Expected Return</label>
                <input type="date" min={borrowForm.borrow_from_date || todayStr} value={borrowForm.expected_return_date}
                  onChange={e => setBorrowForm(p => ({ ...p, expected_return_date: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm" />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-600 block mb-2">Purpose (optional)</label>
                <textarea rows={2} placeholder="Why do you need this item?"
                  value={borrowForm.purpose} onChange={e => setBorrowForm(p => ({ ...p, purpose: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm resize-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setBorrowModal(null); setBorrowForm({ borrow_from_date: "", expected_return_date: "", purpose: "" }); }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium cursor-pointer bg-transparent hover:bg-slate-50">Cancel</button>
              <button onClick={handleBorrowRequest} disabled={submitting || !isFormValid}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold border-none transition-all ${submitting || !isFormValid ? 'bg-slate-300 cursor-not-allowed opacity-70' : 'bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:shadow-lg'}`}>
                {submitting ? "Sending..." : "Send Request"}
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
        <button onClick={() => navigate(`/community/${community_id}`)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-500 transition-colors bg-transparent border-none cursor-pointer">
          ← Back to Community
        </button>
        <button onClick={() => navigate(`/community/${community_id}/add-resource`)}
          className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer border-none">
          + Share Item
        </button>
      </nav>

      <div className="relative z-10 px-8 pt-10 pb-20">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 mb-1">Resources</h1>
          <p className="text-slate-500 text-sm">{resources.length} items shared within this community</p>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mb-8 flex-wrap items-center">
          <div className="relative flex-1 min-w-56">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">🔍</span>
            <input type="text" placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 bg-white/80 text-slate-800 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" />
          </div>
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
            className="px-4 py-3 rounded-2xl border border-slate-200 bg-white/80 text-slate-600 text-sm outline-none focus:border-indigo-400 cursor-pointer">
            <option>All</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center pt-20"><div className="w-10 h-10 rounded-full border-4 border-indigo-200 border-t-indigo-500 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <div className="text-center py-20"><div className="text-5xl mb-4">📦</div><p className="text-xl font-bold text-slate-500 mb-2">No items found</p><p className="text-sm text-slate-400">Be the first to share an item in this community!</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {visible.map(r => (
              <div key={r.resource_id} className="group bg-white/70 backdrop-blur-xl border border-white/90 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-100 hover:-translate-y-1 transition-all duration-300 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400" />

                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">{r.category}</span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${(r.availability === "Available" && r.available_quantity > 0) ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                    {r.availability === "Available" && r.available_quantity > 0 ? "Available" : "Unavailable"}
                  </span>
                </div>

                <h3 className="font-bold text-lg text-slate-900 mb-2 leading-snug">{r.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 flex-1 line-clamp-2">{r.description}</p>

                {/* Details grid */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Condition</div>
                    <span className={`font-bold px-2 py-0.5 rounded-full border text-xs ${CONDITION_STYLES[r.item_condition] || CONDITION_STYLES.Fair}`}>{r.item_condition}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Qty</div>
                    <span className="font-bold text-slate-700">{r.available_quantity} / {r.quantity}</span>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Deposit</div>
                    <span className="font-bold text-slate-700">₹{parseFloat(r.deposit_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Fine/Day</div>
                    <span className="font-bold text-slate-700">₹{parseFloat(r.fine_per_day || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Pickup</div>
                    <span className="font-bold text-slate-700">{r.pickup_method || "—"}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 font-semibold uppercase tracking-wide mb-1">Max Days</div>
                    <span className="font-bold text-slate-700">{r.max_days_allowed || 7}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 pt-3 border-t border-slate-100">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>{r.owner_name?.[0]}</div>
                  <span>Shared by <span className="font-semibold text-slate-600">{r.owner_name}</span></span>
                </div>

                {/* Lend / Request to Borrow button */}
                {r.owner_id === user?.user_id ? (
                  <button disabled
                    className="w-full py-2.5 rounded-full text-sm font-semibold border border-slate-200 bg-slate-50 text-slate-400 cursor-default">
                    Your Item
                  </button>
                ) : r.available_quantity > 0 ? (
                  <button
                    onClick={() => setBorrowModal(r)}
                    className="w-full py-2.5 rounded-full text-sm font-semibold border transition-all cursor-pointer bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-gradient-to-r hover:from-indigo-500 hover:via-violet-500 hover:to-pink-500 hover:text-white hover:border-transparent hover:shadow-md hover:shadow-indigo-200"
                  >
                    🤝 Request to Borrow
                  </button>
                ) : (
                  <button disabled
                    className="w-full py-2.5 rounded-full text-sm font-semibold border border-orange-200 bg-orange-50 text-orange-500 cursor-default">
                    Currently Unavailable
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
