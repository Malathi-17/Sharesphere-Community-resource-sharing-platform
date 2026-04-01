import React, { useState } from "react";
import loginPic from "../assets/login_img.png";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5001/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.message === "Login success") {
        localStorage.setItem("user", JSON.stringify(data.user));
        navigate("/communities");
      } else {
        setError(data.message);
      }
    } catch {
      setError("Connection error. Is the server running?");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 relative overflow-hidden font-sans">
      
      {/* Background Graphic Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none" />
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob pointer-events-none" />

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 p-8 md:p-12 z-10 border border-gray-100 relative overflow-hidden">
        
        {/* Left Side Branding */}
        <div className="hidden md:flex flex-col justify-center pr-12 border-r border-gray-100">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
              S
            </div>
            <span className="font-bold text-xl text-gray-900 tracking-tight">ShareSphere</span>
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-[1.1] tracking-tight mb-5">
            Welcome back to your community.
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-sm mb-12">
            Log in to continue sharing, borrowing, and growing together.
          </p>
          
          <img
            src={loginPic}
            alt="Collaboration"
            className="w-full max-w-xs opacity-90 transition-transform duration-500 hover:scale-105"
            onError={(e) => e.target.style.display = 'none'}
          />
        </div>

        {/* Right Side Login Form */}
        <div className="flex flex-col justify-center md:pl-12">
          {/* Mobile Logo */}
          <div className="md:hidden flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight">ShareSphere</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 mt-4 md:mt-0">Sign In</h2>
            <p className="text-gray-500">Please enter your credentials below.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Ex. john@university.edu"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 animate-pulse">
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 rounded-xl bg-gray-900 text-white font-medium shadow-lg shadow-gray-900/20 hover:bg-gray-800 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin text-white/70" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Authenticating...
                </>
              ) : "Sign In"}
            </button>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-100"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">New to ShareSphere?</span>
              <div className="flex-grow border-t border-gray-100"></div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="w-full py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all cursor-pointer block text-center"
            >
              Create an account
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default Login;