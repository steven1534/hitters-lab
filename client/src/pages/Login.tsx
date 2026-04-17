import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const { refresh } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteToken] = useState(
    new URLSearchParams(window.location.search).get("token") ?? ""
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "forgot") {
        const res = await fetch("/api/auth/request-reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) { setError("Something went wrong. Please try again."); return; }
        setResetSent(true);
        return;
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, name, inviteToken };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      await refresh();
      navigate("/");
    } catch {
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ colorScheme: 'light' }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-600 to-red-800 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white text-lg">Coach Steve's Hitters Lab</span>
        </div>
        <div>
          <blockquote className="text-white/90 text-2xl font-bold leading-snug mb-4">
            "Elite mechanics start with<br />deliberate practice."
          </blockquote>
          <p className="text-white/70 text-sm">Coach Steve Baseball — Player Development Platform</p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { n: "200+", l: "Drills" },
            { n: "8",    l: "Categories" },
            { n: "3",    l: "Skill Levels" },
          ].map(s => (
            <div key={s.l} className="bg-white/15 rounded-xl p-4 text-center border border-white/10">
              <div className="text-2xl font-black text-white">{s.n}</div>
              <div className="text-xs text-white/70 mt-0.5">{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Target className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Coach Steve's Hitters Lab</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {mode === "login" ? "Welcome back" : mode === "register" ? "Create account" : "Reset Password"}
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            {mode === "login"
              ? "Sign in to access your training portal."
              : mode === "register"
              ? "Join with your invite link to get started."
              : "Enter your email and we'll notify Coach Steve to reset your password."}
          </p>

          {mode === "forgot" && resetSent ? (
            <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <p className="text-sm font-medium text-green-800 mb-1">Request sent!</p>
              <p className="text-sm text-green-700">
                Coach Steve has been notified and will reset your password shortly.
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                <Input
                  id="name" type="text" placeholder="Your name"
                  value={name} onChange={(e) => setName(e.target.value)}
                  required autoComplete="name"
                  className="h-11 bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 rounded-xl focus-visible:ring-red-500/30 focus-visible:border-red-300"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
              <Input
                id="email" type="email" placeholder="you@example.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoComplete="email"
                className="h-11 bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 rounded-xl focus-visible:ring-red-500/30 focus-visible:border-red-300"
              />
            </div>

            {mode !== "forgot" && (
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="h-11 pr-10 bg-white text-slate-900 placeholder:text-slate-400 border-slate-200 rounded-xl focus-visible:ring-red-500/30 focus-visible:border-red-300"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "login" && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => { setMode("forgot"); setError(""); setResetSent(false); }}
                    className="text-xs text-slate-400 hover:text-red-600 transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}
            </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl mt-2"
            >
              {loading
                ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Please wait...</span>
                : mode === "login" ? "Sign In" : mode === "register" ? "Create Account" : "Send Reset Request"}
            </Button>
          </form>
          )}

          {/* Mode toggle — invite-only, no public sign-up */}
          {mode === "forgot" && (
            <p className="text-center text-sm text-slate-500 mt-6">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setResetSent(false); }}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Back to sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
