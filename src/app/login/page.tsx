"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                router.push("/");
            } else {
                setError(data.message || "รหัสผ่านไม่ถูกต้อง");
            }
        } catch (err) {
            setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[1000px] h-[1000px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[1000px] h-[1000px] bg-blue-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
                <div className="absolute top-[40%] left-[30%] w-[600px] h-[600px] bg-cyan-600/10 rounded-full blur-[100px] animate-pulse delay-700" />
            </div>

            <div className="z-10 w-full max-w-md p-8 relative">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-500 to-purple-500 drop-shadow-[0_0_25px_rgba(59,130,246,0.6)] mb-3 tracking-tight">
                        MANGA NOTIFIER
                    </h1>
                    <p className="text-blue-200/50 text-xs tracking-[0.3em] uppercase font-light">
                        Admin Access Only
                    </p>
                </div>

                <form onSubmit={handleLogin} className="bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
                    {/* Inner glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    <div className="mb-8 relative z-10">
                        <label className="block text-blue-200/70 text-xs font-medium mb-3 uppercase tracking-wider">Passcode</label>
                        <div className="relative group/input">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/50 group-focus-within/input:text-blue-400 transition duration-300" size={20} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/20 border border-white/5 text-white pl-12 pr-4 py-4 rounded-2xl focus:outline-none focus:bg-black/40 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all duration-300 placeholder-white/20"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 text-red-300 text-xs text-center bg-red-500/10 py-3 px-4 rounded-xl border border-red-500/20 backdrop-blur-sm animate-shake">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full relative z-10 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/40 hover:shadow-cyan-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group-hover:brightness-110"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : "UNLOCK DASHBOARD"}
                    </button>
                </form>
            </div>
        </div>
    );
}
