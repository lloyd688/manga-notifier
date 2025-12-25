"use client";

import { useState, useEffect } from "react";
import { Plus, ExternalLink, Trash2, Check, Clock, Loader2, Upload, Pencil, X, Bell, Calendar, RefreshCcw, LogOut } from "lucide-react";
import Image from "next/image";

export type Manga = {
    id: number;
    title: string;
    imageUrl?: string | null;
    link?: string | null;
    releaseDay?: string | null;
    releaseTime?: string | null;
    releaseInterval?: number | null;
    nextReleaseDate?: string | null;
    status: string;
    isFinished: boolean;
    creator?: string | null;
};

const DAY_TRANSLATION: Record<string, string> = {
    "Monday": "วันจันทร์",
    "Tuesday": "วันอังคาร",
    "Wednesday": "วันพุธ",
    "Thursday": "วันพฤหัสบดี",
    "Friday": "วันศุกร์",
    "Saturday": "วันเสาร์",
    "Sunday": "วันอาทิตย์",
    "Everyday": "ทุกวัน",
    "Custom": "กำหนดวันเอง"
};


export default function MangaDashboard({ initialManga }: { initialManga: Manga[] }) {
    const [mangas, setMangas] = useState<Manga[]>(initialManga);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [showTodayOnly, setShowTodayOnly] = useState(false);
    const [selectedCreator, setSelectedCreator] = useState<string>("All");

    // Get unique creators
    const creators = Array.from(new Set(mangas.map(m => m.creator || "ส่วนกลาง (Public)"))).sort();

    const initialFormState = {
        title: "",
        imageUrl: "",
        imageFile: null as File | null,
        link: "",
        releaseDay: "Monday",
        releaseTime: "18:00",
        releaseInterval: "",
        isCustomInterval: false,
        creator: "" // Added creator field
    };

    const [formData, setFormData] = useState(initialFormState);

    const handleStatusChange = async (id: number, newStatus: string) => {
        // Optimistic Update
        setMangas((prev) =>
            prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
        );

        try {
            await fetch(`/api/manga/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });
        } catch (error) {
            console.error("Failed to update status", error);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("ลบเรื่องนี้?")) return;
        setMangas((prev) => prev.filter((m) => m.id !== id));
        await fetch(`/api/manga/${id}`, { method: "DELETE" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = new FormData();
            data.append("title", formData.title);
            data.append("link", formData.link);
            data.append("releaseTime", formData.releaseTime);
            data.append("creator", formData.creator); // Send creator

            if (formData.isCustomInterval && formData.releaseInterval) {
                data.append("releaseInterval", formData.releaseInterval);
                data.append("releaseDay", "");
            } else {
                data.append("releaseDay", formData.releaseDay);
                data.append("releaseInterval", "");
            }

            if (formData.imageFile) {
                data.append("image", formData.imageFile);
            } else if (formData.imageUrl) {
                data.append("imageUrl", formData.imageUrl);
            }

            if (editingId) {
                // Update existing
                const res = await fetch(`/api/manga/${editingId}`, {
                    method: "PUT",
                    body: data,
                });
                const updatedManga = await res.json();
                setMangas((prev) => prev.map(m => m.id === editingId ? updatedManga : m));
            } else {
                // Create new
                const res = await fetch("/api/manga", {
                    method: "POST",
                    body: data,
                });
                const newManga = await res.json();
                setMangas([newManga, ...mangas]);
            }

            handleCloseForm();
        } catch (error) {
            console.error("Failed to save", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (manga: Manga) => {
        setEditingId(manga.id);
        const isCustom = !!manga.releaseInterval;
        setFormData({
            title: manga.title,
            imageUrl: manga.imageUrl || "",
            imageFile: null,
            link: manga.link || "",
            releaseDay: (isCustom ? "Monday" : (manga.releaseDay || "Monday")),
            releaseTime: manga.releaseTime || "18:00",
            releaseInterval: manga.releaseInterval ? manga.releaseInterval.toString() : "",
            isCustomInterval: isCustom,
            creator: manga.creator || "" // Load existing creator
        });
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleCloseForm = () => {
        setIsFormOpen(false);
        setEditingId(null);
        setFormData(initialFormState);
    };

    const handleNotify = async () => {
        if (!confirm("ต้องการส่งแจ้งเตือนเข้า Telegram เดี๋ยวนี้หรือไม่?")) return;
        try {
            const res = await fetch("/api/notify");
            const data = await res.json();
            if (data.success) {
                alert(`แจ้งเลือนสำเร็จ! (${data.notifiedCount} เรื่อง)`);
            } else {
                alert("เกิดข้อผิดพลาด: " + (data.message || data.error));
            }
        } catch (error) {
            console.error("Notify failed", error);
            alert("แจ้งเตือนล้มเหลว");
        }
    };

    const handleReset = async (id: number, title: string) => {
        if (!confirm(`เริ่มตอนใหม่ของ "${title}"? สถานะจะถูกรีเซ็ตเป็น "ยังไม่ทำ"`)) return;
        await handleStatusChange(id, "WAITING");
        alert(`รีเซ็ต "${title}" เป็นสถานะ "ยังไม่ทำ" เรียบร้อย!\nอย่าลืมกดแจ้งเตือนเข้ากลุ่มนะครับ`);
    };

    const handleLogout = async () => {
        if (!confirm("ออกจากระบบ?")) return;
        try {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    // Countdown Logic
    const [nextManga, setNextManga] = useState<{ title: string, timeLeft: string } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const todayName = days[now.getDay()];

            const upcoming = mangas.filter(m => {
                const isDayMatch = m.releaseInterval
                    ? (m.nextReleaseDate && new Date(m.nextReleaseDate) <= now)
                    : (m.releaseDay === "Everyday" || m.releaseDay === todayName);

                if (!isDayMatch || !m.releaseTime) return false;

                const [h, min] = m.releaseTime.split(":").map(Number);
                const t = new Date();
                t.setHours(h, min, 0, 0);
                return t > now;
            }).sort((a, b) => {
                const [h1, m1] = (a.releaseTime || "00:00").split(":").map(Number);
                const [h2, m2] = (b.releaseTime || "00:00").split(":").map(Number);
                return (h1 * 60 + m1) - (h2 * 60 + m2);
            });

            if (upcoming.length > 0) {
                const next = upcoming[0];
                const [h, m] = (next.releaseTime || "00:00").split(":").map(Number);
                const target = new Date();
                target.setHours(h, m, 0, 0);

                const diff = target.getTime() - now.getTime();
                const totalSecs = Math.floor(diff / 1000);
                const hours = Math.floor(totalSecs / 3600);
                const mins = Math.floor((totalSecs % 3600) / 60);
                const secs = totalSecs % 60;

                setNextManga({
                    title: next.title,
                    timeLeft: `${hours > 0 ? hours + 'h ' : ''}${mins}m ${secs}s`
                });
            } else {
                setNextManga(null);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [mangas]);

    const filteredMangas = mangas.filter(m => {
        const matchesToday = !showTodayOnly || m.releaseDay === new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const matchesCreator = selectedCreator === "All" || (m.creator || "ส่วนกลาง (Public)") === selectedCreator;
        return matchesToday && matchesCreator;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <h2 className="text-4xl font-display font-extrabold flex items-center gap-3 tracking-wide">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 drop-shadow-sm">
                                {showTodayOnly ? "งานวันนี้" : "MANGA NOTIFIER"}
                            </span>
                        </h2>
                        <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
                            ระบบจัดการงานตารางแปลสุดล้ำ
                        </p>


                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={handleLogout}
                            className="p-3 rounded-full text-slate-600 transition-all hover:scale-110 shadow-md bg-white hover:bg-red-50 hover:text-red-500 border border-slate-200"
                            title="ออกจากระบบ"
                        >
                            <LogOut size={18} />
                        </button>

                        <button
                            onClick={handleNotify}
                            className="p-3 rounded-full text-white transition-all hover:scale-110 shadow-lg bg-gradient-to-br from-blue-600 to-indigo-700 hover:shadow-blue-500/30 border border-white/20"
                            title="แจ้งเตือน Telegram เดี๋ยวนี้"
                        >
                            <Bell size={18} />
                        </button>
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-2" />

                    <button
                        onClick={() => setShowTodayOnly(!showTodayOnly)}
                        className={`px-5 py-2.5 rounded-2xl flex items-center gap-2 transition-all duration-300 hover:scale-105 font-bold shadow-lg border backdrop-blur-xl ${showTodayOnly
                            ? "bg-gradient-to-r from-fuchsia-600 to-pink-600 border-white/20 text-white shadow-[0_0_20px_rgba(217,70,239,0.5)]"
                            : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        <Calendar size={18} />
                        <span>{showTodayOnly ? "งานวันนี้ 🔥" : "ตารางงาน"}</span>
                    </button>

                    <div className="relative group">
                        <select
                            value={selectedCreator}
                            onChange={(e) => setSelectedCreator(e.target.value)}
                            className="appearance-none bg-black/40 text-white px-5 py-2.5 rounded-2xl font-bold border border-white/10 hover:border-blue-500/50 transition-all cursor-pointer pr-10 backdrop-blur-md focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                            <option value="All">All Creators 👥</option>
                            {creators.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-blue-400 group-hover:text-white transition-colors">
                            ▼
                        </div>
                    </div>
                </div>

                {/* Countdown Widget (Header) */}
                {nextManga ? (
                    <div className="ml-auto flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-500/20 shadow-lg shadow-blue-500/10 animate-pulse">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                        </span>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] text-blue-600 font-bold uppercase tracking-wider">Next</span>
                            <span className="text-sm font-bold text-slate-800">
                                {nextManga.title.length > 15 ? nextManga.title.substring(0, 15) + '...' : nextManga.title}
                                <span className="text-blue-500 ml-1 font-mono">({nextManga.timeLeft})</span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="ml-auto flex text-[10px] text-slate-400 font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                        💤 No Queue
                    </div>
                )}
                {!isFormOpen ? (
                    <button
                        onClick={() => setIsFormOpen(true)}
                        className="bg-white text-black px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-200 transition shadow-[0_0_15px_rgba(255,255,255,0.3)] transform hover:scale-105"
                    >
                        <Plus size={20} /> เพิ่มเรื่องใหม่
                    </button>
                ) : (
                    <button
                        onClick={handleCloseForm}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-500 transition"
                    >
                        <X size={20} /> ยกเลิก
                    </button>
                )}
            </div>

            {isFormOpen && (
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 space-y-4 shadow-2xl animate-in slide-in-from-top-10 fade-in duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="ชื่อผู้รับผิดชอบ (Creator Name)"
                            className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full text-center focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                            value={formData.creator}
                            onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="ชื่อเรื่อง"
                            className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded w-full">
                            <label className="block text-slate-500 text-sm mb-1 font-medium">รูปภาพ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="text-slate-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setFormData({ ...formData, imageUrl: reader.result as string, imageFile: null });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                                <input
                                    type="text"
                                    placeholder="หรือใส่ลิงก์รูปภาพ (Optional)"
                                    className="bg-white border border-slate-200 p-2 rounded text-slate-700 text-xs w-full focus:ring-1 focus:ring-blue-500 outline-none"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="ลิงก์อ่าน/ต้นฉบับ"
                            className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder:text-slate-400"
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <select
                                className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-1/2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                value={formData.isCustomInterval ? "Custom" : formData.releaseDay}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "Custom") {
                                        setFormData({ ...formData, isCustomInterval: true, releaseDay: "" });
                                    } else {
                                        setFormData({ ...formData, isCustomInterval: false, releaseDay: val, releaseInterval: "" });
                                    }
                                }}
                            >
                                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Everyday"].map(d => (
                                    <option key={d} value={d}>{DAY_TRANSLATION[d] || d}</option>
                                ))}
                                <option value="Custom">กำหนดวันเอง (เช่น ทุก 10 วัน)</option>
                            </select>

                            {formData.isCustomInterval && (
                                <div className="flex items-center gap-2 w-1/3">
                                    <input
                                        type="number"
                                        placeholder="จำนวน"
                                        className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.releaseInterval}
                                        onChange={(e) => setFormData({ ...formData, releaseInterval: e.target.value })}
                                        min="1"
                                        required
                                    />
                                    <span className="text-slate-600 text-sm whitespace-nowrap">วัน</span>
                                </div>
                            )}
                            {/* Custom 24H Time Picker (Desired: 22:00 Format) */}
                            <div className="flex w-1/2 gap-1 items-center">
                                <select
                                    className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full text-center appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.releaseTime ? formData.releaseTime.split(":")[0] : "12"}
                                    onChange={(e) => {
                                        const m = formData.releaseTime ? formData.releaseTime.split(":")[1] : "00";
                                        setFormData({ ...formData, releaseTime: `${e.target.value}:${m}` });
                                    }}
                                >
                                    {Array.from({ length: 24 }, (_, i) => i).map(h => {
                                        const hStr = h.toString().padStart(2, "0");
                                        return <option key={h} value={hStr}>{hStr}</option>;
                                    })}
                                </select>
                                <span className="text-slate-400 font-bold">:</span>
                                <select
                                    className="bg-slate-50 border border-slate-200 p-3 rounded text-slate-900 w-full text-center appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.releaseTime ? formData.releaseTime.split(":")[1] : "00"}
                                    onChange={(e) => {
                                        const h = formData.releaseTime ? formData.releaseTime.split(":")[0] : "12";
                                        setFormData({ ...formData, releaseTime: `${h}:${e.target.value}` });
                                    }}
                                >
                                    {["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"].map(m => (
                                        <option key={m} value={m}>{m}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 text-white py-3 rounded font-bold hover:bg-blue-500 transition"
                    >
                        {loading ? "กำลังบันทึก..." : (editingId ? "บันทึกการแก้ไข" : "บันทึกข้อมูล")}
                    </button>
                </form>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {Object.entries(filteredMangas.reduce((acc, manga) => {
                    const group = manga.creator || "ส่วนกลาง (Public)";
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(manga);
                    return acc;
                }, {} as Record<string, Manga[]>)).sort((a, b) => b[0].localeCompare(a[0])).map(([groupName, groupMangas]) => (
                    <div key={groupName} className="col-span-full mb-8">
                        <div className="flex items-center gap-3 mb-4 pl-2 border-l-4 border-blue-500">
                            <h3 className="text-2xl font-bold text-slate-800 uppercase tracking-wider">
                                {groupName}
                            </h3>
                            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">
                                {groupMangas.length} เรื่อง
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {groupMangas.map((manga) => (
                                <div
                                    key={manga.id}
                                    className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 transition-all duration-500 hover:scale-[1.02] hover:border-blue-400/50 shadow-md hover:shadow-xl flex flex-col"
                                >
                                    {/* Glass Highlight Removed for clean look */}

                                    <div className="relative w-full aspect-[3/4] overflow-hidden">
                                        {manga.imageUrl ? (
                                            <>
                                                <img src={manga.imageUrl} alt={manga.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-60" />
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 text-xs font-bold">NO IMAGE</div>
                                        )}

                                        {/* Action Buttons (Floating) */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                            <button
                                                onClick={() => handleReset(manga.id, manga.title)}
                                                className="bg-white/90 p-2 rounded-full text-slate-600 hover:bg-blue-500 hover:text-white hover:shadow-lg transition shadow-sm backdrop-blur-md"
                                                title="เริ่มตอนใหม่"
                                            >
                                                <RefreshCcw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(manga)}
                                                className="bg-white/90 p-2 rounded-full text-slate-600 hover:bg-indigo-500 hover:text-white hover:shadow-lg transition shadow-sm backdrop-blur-md"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(manga.id)}
                                                className="bg-white/90 p-2 rounded-full text-slate-600 hover:bg-red-500 hover:text-white hover:shadow-lg transition shadow-sm backdrop-blur-md"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md border ${manga.status === "WAITING" ? "bg-red-50 text-red-600 border-red-200" :
                                                manga.status === "PENDING" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                                    "bg-teal-50 text-teal-600 border-teal-200"
                                                }`}>
                                                {manga.status === "WAITING" ? "WAITING" :
                                                    manga.status === "PENDING" ? "WORKING" :
                                                        "DONE"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col gap-2">
                                        <h3 className="text-base font-bold text-slate-800 leading-tight line-clamp-2 group-hover:text-blue-600 transition-colors" title={manga.title}>
                                            {manga.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                            <Clock size={12} className="text-blue-500" />
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">
                                                {manga.releaseInterval
                                                    ? `Every ${manga.releaseInterval} days`
                                                    : `${DAY_TRANSLATION[manga.releaseDay || ""] || manga.releaseDay}`
                                                }
                                                {manga.releaseTime ? ` @ ${manga.releaseTime}` : ""}
                                            </span>
                                        </div>

                                        {manga.link && (
                                            <a href={manga.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition w-max font-semibold">
                                                <ExternalLink size={10} /> Link
                                            </a>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-slate-100 bg-slate-50/50">
                                        <div className="flex flex-col gap-2 p-2 rounded-xl">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status Control</span>
                                            </div>
                                            <div className="flex gap-1 w-full justify-between">
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "WAITING")}
                                                    className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${manga.status === "WAITING" ? "bg-red-500 shadow-md shadow-red-500/30 text-white" : "bg-white border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200"}`}
                                                    title="ยังไม่ทำ"
                                                >
                                                    Wait
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "PENDING")}
                                                    className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${manga.status === "PENDING" ? "bg-yellow-400 shadow-md shadow-yellow-400/30 text-yellow-900" : "bg-white border border-slate-200 text-slate-400 hover:bg-yellow-50 hover:text-yellow-600 hover:border-yellow-200"}`}
                                                    title="กำลังดำเนินการ"
                                                >
                                                    WIP
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "DONE")}
                                                    className={`flex-1 h-7 rounded-lg flex items-center justify-center transition-all duration-300 text-[10px] font-bold uppercase tracking-wider ${manga.status === "DONE" ? "bg-teal-500 shadow-md shadow-teal-500/30 text-white" : "bg-white border border-slate-200 text-slate-400 hover:bg-teal-50 hover:text-teal-600 hover:border-teal-200"}`}
                                                    title="สำเร็จ"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {filteredMangas.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        ยังไม่มีข้อมูลมังงะ กด "เพิ่มเรื่องใหม่"
                    </div>
                )}
            </div>
        </div >
    );
}
