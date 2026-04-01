import { useState } from "react";
import { useNavigate } from "react-router-dom";

const communityTypes = [
  { id: "college",   label: "College",   emoji: "🎓", desc: "Universities & student housing" },
  { id: "apartment", label: "Apartment", emoji: "🏢", desc: "Residential complexes & condos" },
  { id: "office",    label: "Office",    emoji: "💼", desc: "Workplaces & coworking spaces" },
  { id: "public",    label: "Public",    emoji: "🌐", desc: "Open communities for everyone" },
];

export default function CreateCommunity() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const [form, setForm] = useState({
    name: "", type: "", description: "",
    fine_rate: 10, borrow_limit: 3, join_approval: false,
  });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [msg, setMsg]           = useState("");
  const [errors, setErrors]     = useState({});
  const [charCount, setCharCount] = useState(0);

  const validate = () => {
    const e = {};
    if (!form.name.trim())        e.name = "Community name is required";
    if (!form.type)               e.type = "Please select a community type";
    if (!form.description.trim()) e.description = "Description is required";
    if (form.description.length < 20) e.description = "Write at least 20 characters";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    try {
      const res  = await fetch("http://localhost:5001/create-community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, user_id: user.user_id }),
      });
      const data = await res.json();
      setMsg(data.message);
      if (data.message === "Community created successfully") {
        setSuccess(true);
        setTimeout(() => navigate("/communities"), 1800);
      }
    } catch (err) {
      setMsg("Error creating community");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectedType = communityTypes.find(t => t.id === form.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-orange-50 to-emerald-50 flex items-center justify-center p-6">

      {/* SUCCESS MODAL */}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm bg-white/50 z-50">
          <div className="bg-white rounded-3xl p-10 text-center shadow-xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-gray-800">Community Created!</h2>
            <p className="text-gray-500 mt-2">Redirecting you to communities...</p>
          </div>
        </div>
      )}

      <div className="max-w-xl w-full">

        {/* HEADER */}
        <div className="text-center mb-10">
          <span className="bg-indigo-100 text-indigo-600 text-sm px-4 py-1 rounded-full font-semibold">
            ✦ Start Something New
          </span>
          <h1 className="text-4xl font-extrabold mt-4">
            Create Your
            <span className="bg-gradient-to-r from-indigo-500 to-pink-500 text-transparent bg-clip-text"> Community</span>
          </h1>
          <p className="text-gray-500 mt-2">Bring people together. Build something meaningful.</p>
        </div>

        {/* FORM CARD */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-lg p-8">

          {/* Back link */}
          <button
            type="button"
            onClick={() => navigate("/communities")}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-indigo-500 mb-6 bg-transparent border-none cursor-pointer p-0 transition-colors"
          >
            ← Back to Communities
          </button>

          {/* COMMUNITY NAME */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-600 block mb-2">Community Name</label>
            <input
              className={`w-full p-3 rounded-xl border ${errors.name ? "border-red-400" : "border-gray-200"} focus:ring-2 focus:ring-indigo-400 outline-none`}
              placeholder="e.g. Sunrise Residences"
              value={form.name}
              onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setErrors(p => ({ ...p, name: "" })); }}
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* COMMUNITY TYPE */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-600 block mb-3">Community Type</label>
            <div className="grid grid-cols-2 gap-3">
              {communityTypes.map(t => (
                <div
                  key={t.id}
                  onClick={() => { setForm(p => ({ ...p, type: t.id })); setErrors(p => ({ ...p, type: "" })); }}
                  className={`cursor-pointer border rounded-xl p-4 text-center transition-all
                    ${form.type === t.id
                      ? "border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100"
                      : "border-gray-200 hover:shadow hover:border-indigo-200"
                    }`}
                >
                  <div className="text-2xl mb-1">{t.emoji}</div>
                  <div className="font-semibold text-sm">{t.label}</div>
                  <div className="text-xs text-gray-400">{t.desc}</div>
                </div>
              ))}
            </div>
            {errors.type && <p className="text-red-500 text-sm mt-2">{errors.type}</p>}
          </div>

          {/* DESCRIPTION */}
          <div className="mb-6">
            <label className="text-sm font-semibold text-gray-600 flex justify-between mb-2">
              Description
              <span className="text-xs text-gray-400">{charCount}/300</span>
            </label>
            <textarea
              rows={4}
              maxLength={300}
              className={`w-full p-3 rounded-xl border ${errors.description ? "border-red-400" : "border-gray-200"} focus:ring-2 focus:ring-indigo-400 outline-none resize-y`}
              placeholder="Tell people what makes your community special..."
              value={form.description}
              onChange={e => {
                setForm(p => ({ ...p, description: e.target.value }));
                setCharCount(e.target.value.length);
                setErrors(p => ({ ...p, description: "" }));
              }}
            />
            {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
          </div>

          {/* FINE RATE + BORROW LIMIT */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Fine Rate (₹/day)</label>
              <input
                type="number" min="0"
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                value={form.fine_rate}
                onChange={e => setForm(p => ({ ...p, fine_rate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-2">Borrow Limit</label>
              <input
                type="number" min="1"
                className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-400 outline-none"
                value={form.borrow_limit}
                onChange={e => setForm(p => ({ ...p, borrow_limit: e.target.value }))}
              />
            </div>
          </div>

          {/* JOIN APPROVAL TOGGLE */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
            <input
              type="checkbox" id="approval"
              checked={form.join_approval}
              onChange={e => setForm(p => ({ ...p, join_approval: e.target.checked }))}
              className="w-4 h-4 cursor-pointer accent-indigo-500"
            />
            <label htmlFor="approval" className="text-sm text-gray-600 cursor-pointer">
              Require admin approval for new members
            </label>
          </div>

          {/* PREVIEW */}
          {form.name && form.type && (
            <div className="flex items-center gap-3 bg-indigo-50 border border-dashed border-indigo-300 rounded-xl p-3 mb-6">
              <span className="text-xl">{selectedType?.emoji}</span>
              <div>
                <p className="font-semibold text-sm">{form.name}</p>
                <p className="text-xs text-gray-500">{selectedType?.label} Community</p>
              </div>
              <span className="ml-auto text-xs bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full">Draft</span>
            </div>
          )}

          {/* API message */}
          {msg && !success && (
            <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
              msg.includes("success")
                ? "bg-green-50 text-green-600 border-green-200"
                : "bg-red-50 text-red-500 border-red-200"
            }`}>
              {msg}
            </div>
          )}

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-60 cursor-pointer border-none"
          >
            {loading ? "Creating Community..." : "Create Community"}
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            You'll be the admin. Others can join via invite link.
          </p>
        </div>
      </div>
    </div>
  );
}