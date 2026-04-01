import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const CATEGORIES = ["Tools", "Books", "Electronics", "Furniture", "Sports", "Kitchen", "Clothing", "Other"];
const CONDITIONS = ["New", "Good", "Fair", "Poor"];
const AVAILABILITY = ["Available", "Unavailable"];

export default function AddResource() {
  const { id: community_id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Tools",
    quantity: 1,
    item_condition: "Good",
    availability: "Available",
    deposit_amount: "",
    fine_per_day: "",
    pickup_method: "",
    max_days_allowed: "7",
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return setMsg("Resource name is required");
    setLoading(true);
    const formData = new FormData();
    formData.append("community_id", community_id);
    formData.append("user_id", user.user_id);
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    if (image) formData.append("image", image);
    const res = await fetch("http://localhost:5001/resource", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    setMsg(data.message);
    if (data.message?.includes("added")) setTimeout(() => navigate(`/community/${community_id}/resources`), 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-[-160px] left-[-140px] w-[500px] h-[500px] rounded-full bg-violet-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-120px] right-[-110px] w-[450px] h-[450px] rounded-full bg-emerald-300 opacity-20 blur-3xl pointer-events-none animate-pulse" />

      <div className="max-w-lg w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="bg-indigo-100 text-indigo-600 text-sm px-4 py-1 rounded-full font-semibold">📦 Share with the Community</span>
          <h1 className="text-4xl font-extrabold mt-4">
            Add a <span className="bg-gradient-to-r from-indigo-500 to-pink-500 text-transparent bg-clip-text">Resource</span>
          </h1>
          <p className="text-gray-500 mt-2">Share an item for others in your community to borrow.</p>
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg p-8">
          <button type="button" onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-500 mb-6 bg-transparent border-none cursor-pointer p-0 transition-colors">
            ← Back
          </button>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Item Name *</label>
              <input className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm"
                placeholder="e.g. Electric Drill, Harry Potter Book Set"
                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Description</label>
              <textarea rows={3} className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none text-sm resize-y"
                placeholder="Describe the item, its condition, or any rules..."
                value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Category</label>
                <select className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm cursor-pointer"
                  value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Condition</label>
                <select className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm cursor-pointer"
                  value={form.item_condition} onChange={e => setForm(p => ({ ...p, item_condition: e.target.value }))}>
                  {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Availability</label>
                <select className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm cursor-pointer"
                  value={form.availability} onChange={e => setForm(p => ({ ...p, availability: e.target.value }))}>
                  {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Quantity</label>
                <input type="number" min="1" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Deposit Amount (₹)</label>
                <input type="number" min="0" step="0.01" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="0.00"
                  value={form.deposit_amount} onChange={e => setForm(p => ({ ...p, deposit_amount: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Fine Per Day (₹)</label>
                <input type="number" min="0" step="0.01" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="0.00"
                  value={form.fine_per_day} onChange={e => setForm(p => ({ ...p, fine_per_day: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Pickup Method</label>
                <input className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="e.g. Door pickup, Community center"
                  value={form.pickup_method} onChange={e => setForm(p => ({ ...p, pickup_method: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-2">Return Within (days)</label>
                <input type="number" min="1" className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-400 text-sm"
                  placeholder="7"
                  value={form.max_days_allowed} onChange={e => setForm(p => ({ ...p, max_days_allowed: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Item Photo</label>
              <div className="relative">
                <input type="file" accept="image/*" onChange={e => setImage(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                <div className="w-full p-3 rounded-xl border border-gray-200 text-sm text-gray-400 text-center bg-gray-50 cursor-pointer">
                  {image ? image.name : "📁 Choose File"}
                </div>
              </div>
            </div>

            {msg && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${msg.includes("added") ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-500 border-red-200"}`}>{msg}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-200 transition-all cursor-pointer border-none disabled:opacity-60">
              {loading ? "Adding Item..." : "Add Resource →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
