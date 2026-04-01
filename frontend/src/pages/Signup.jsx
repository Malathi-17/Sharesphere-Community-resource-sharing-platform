import React, { useState } from "react";
import signupPic from "../assets/Community.png";
import { useNavigate } from "react-router-dom";

export default function Signup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", otp: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", ok: false });

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setMsg({ text: "", ok: false });

    if (form.password !== form.confirmPassword) {
      setMsg({ text: "Passwords do not match", ok: false });
      return;
    }

    if (form.password.length < 6) {
      setMsg({ text: "Password must be at least 6 characters", ok: false });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.message.includes("successfully")) {
        setMsg({ text: data.message, ok: true });
        setStep(2); // Move to OTP step
      } else {
        setMsg({ text: data.message, ok: false });
      }
    } catch {
      setLoading(false);
      setMsg({ text: "Connection error. Is the server running?", ok: false });
    }
  };

  const handleVerifySignup = async (e) => {
    e.preventDefault();
    setMsg({ text: "", ok: false });
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5001/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, otp: form.otp }),
      });
      const data = await res.json();
      setLoading(false);

      if (data.message === "User registered successfully" && data.user) {
        setMsg({ text: "Account created! Logging you in...", ok: true });
        localStorage.setItem("user", JSON.stringify(data.user));
        setTimeout(() => navigate("/communities"), 800);
      } else {
        setMsg({ text: data.message, ok: false });
      }
    } catch {
      setLoading(false);
      setMsg({ text: "Connection error. Is the server running?", ok: false });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative overflow-hidden font-sans">
      
      {/* Background Graphic Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 pointer-events-none" />

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 p-8 md:p-12 z-10 border border-gray-100 relative overflow-hidden">
        
        {/* Left Side Branding */}
        <div className="hidden md:flex flex-col justify-center pr-12 border-r border-gray-100">
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              S
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">ShareSphere</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
            Join the movement.
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-sm mb-12">
            Create an account to discover communities around you and start sharing resources easily.
          </p>
          
          <img
            src={signupPic}
            alt="Community"
            className="w-full max-w-xs opacity-90 transition-transform duration-500 hover:scale-105"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>

        {/* Right Side Signup Form */}
        <div className="flex flex-col justify-center md:pl-12 relative">
          
          {/* Back Button for Step 2 */}
          {step === 2 && (
            <button onClick={() => { setStep(1); setMsg({ text: "", ok: false }); setForm({...form, otp: ""}); }} className="absolute -top-4 -left-2 md:-top-6 md:-left-4 p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-3 mb-8 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold tracking-tighter">
              S
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">ShareSphere</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-4 md:mt-0">
              {step === 1 ? "Create Account" : "Verify Email"}
            </h2>
            <p className="text-gray-500">
              {step === 1 ? "Fill in your details to get started." : `Enter the 6-digit code sent to ${form.email}`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Ex. John Doe"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="Ex. john@university.edu"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Confirm</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              {msg.text && (
                <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 mt-4 ${msg.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100 animate-pulse'}`}>
                  {msg.ok ? (
                     <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                     </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <p className={`text-sm font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-4 rounded-xl bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Sending OTP..." : "Continue"}
              </button>

              <p className="text-sm text-center text-gray-500 mt-6 block w-full">
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="text-blue-600 font-semibold hover:text-blue-700 bg-transparent border-none cursor-pointer"
                >
                  Log In
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleVerifySignup} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Verification Code</label>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  maxLength="6"
                  value={form.otp}
                  onChange={e => setForm(p => ({ ...p, otp: e.target.value.replace(/\D/g, '') }))}
                  required
                  className="w-full px-4 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center text-xl font-mono tracking-widest"
                />
              </div>

              {msg.text && (
                <div className={`px-4 py-3 rounded-xl border flex items-center gap-3 mt-4 ${msg.ok ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100 animate-pulse'}`}>
                  {msg.ok ? (
                     <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                     </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <p className={`text-sm font-medium ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || form.otp.length < 5}
                className="w-full py-3.5 mt-4 rounded-xl bg-blue-600 text-white font-medium shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Verifying..." : "Verify & Create Account"}
              </button>
              
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={loading}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 transition-colors"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}