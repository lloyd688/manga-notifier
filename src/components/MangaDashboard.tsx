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
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 drop-shadow-[0_0_15px_rgba(6,182,212,0.6)] animate-pulse">
                                {showTodayOnly ? "งานวันนี้" : "MANGA NOTIFIER"}
                            </span>
                        </h2>
                        <p className="text-xs font-medium tracking-[0.2em] text-cyan-200/70 uppercase">
                            ระบบจัดการงานตารางแปลสุดล้ำ
                        </p>


                    </div>

                    <div className="flex items-center gap-2 ml-4">
                        <button
                            onClick={handleLogout}
                            className="p-3 rounded-full text-white/90 transition-all hover:scale-110 shadow-lg bg-white/5 hover:bg-red-500/20 border border-white/10 backdrop-blur-md"
                            title="ออกจากระบบ"
                        >
                            <LogOut size={18} />
                        </button>

                        <button
                            onClick={handleNotify}
                            className="p-3 rounded-full text-white/90 transition-all hover:scale-110 shadow-[0_0_20px_rgba(59,130,246,0.4)] bg-gradient-to-br from-blue-600 to-indigo-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.8)] border border-white/20"
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
                    <div className="ml-auto flex items-center gap-3 bg-black/40 px-4 py-2 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)] animate-pulse">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        <div className="flex flex-col leading-none">
                            <span className="text-[9px] text-cyan-300 font-bold uppercase tracking-wider">Next</span>
                            <span className="text-sm font-bold text-white">
                                {nextManga.title.length > 15 ? nextManga.title.substring(0, 15) + '...' : nextManga.title}
                                <span className="text-cyan-400 ml-1 font-mono">({nextManga.timeLeft})</span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="ml-auto flex text-[10px] text-gray-400 font-mono bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
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
                <form onSubmit={handleSubmit} className="bg-gray-900 p-6 rounded-xl border border-gray-800 space-y-4 shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="ชื่อผู้รับผิดชอบ (Creator Name)"
                            className="bg-black border border-gray-700 p-3 rounded text-white w-full text-center border-blue-500/30"
                            value={formData.creator}
                            onChange={(e) => setFormData({ ...formData, creator: e.target.value })}
                            required
                        />
                        <input
                            type="text"
                            placeholder="ชื่อเรื่อง"
                            className="bg-black border border-gray-700 p-3 rounded text-white w-full"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                        <div className="bg-black border border-gray-700 p-3 rounded w-full">
                            <label className="block text-gray-400 text-sm mb-1">รูปภาพ (อัพโหลดไฟล์ หรือ ใส่ลิงก์)</label>
                            <div className="flex flex-col gap-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="text-white text-sm"
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
                                    className="bg-gray-800 border border-gray-600 p-2 rounded text-white text-xs w-full"
                                    value={formData.imageUrl}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                />
                            </div>
                        </div>
                        <input
                            type="text"
                            placeholder="ลิงก์อ่าน/ต้นฉบับ"
                            className="bg-black border border-gray-700 p-3 rounded text-white w-full"
                            value={formData.link}
                            onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <select
                                className="bg-black border border-gray-700 p-3 rounded text-white w-1/2"
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
                                        className="bg-black border border-gray-700 p-3 rounded text-white w-full text-center"
                                        value={formData.releaseInterval}
                                        onChange={(e) => setFormData({ ...formData, releaseInterval: e.target.value })}
                                        min="1"
                                        required
                                    />
                                    <span className="text-white text-sm whitespace-nowrap">วัน</span>
                                </div>
                            )}
                            {/* Custom 24H Time Picker (Desired: 22:00 Format) */}
                            <div className="flex w-1/2 gap-1 items-center">
                                <select
                                    className="bg-black border border-gray-700 p-3 rounded text-white w-full text-center appearance-none"
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
                                <span className="text-white font-bold">:</span>
                                <select
                                    className="bg-black border border-gray-700 p-3 rounded text-white w-full text-center appearance-none"
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
                            <h3 className="text-2xl font-bold text-white uppercase tracking-wider">
                                {groupName}
                            </h3>
                            <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">
                                {groupMangas.length} เรื่อง
                            </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {groupMangas.map((manga) => (
                                <div
                                    key={manga.id}
                                    className="group relative bg-[#1a1a1a]/40 backdrop-blur-md rounded-2xl overflow-hidden border border-white/5 transition-all duration-500 hover:scale-[1.02] hover:bg-[#1a1a1a]/60 hover:border-cyan-500/50 hover:shadow-[0_0_40px_rgba(6,182,212,0.15)] flex flex-col"
                                >
                                    {/* Glass Highlight */}
                                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                                    <div className="relative w-full aspect-[3/4] overflow-hidden">
                                        {manga.imageUrl ? (
                                            <>
                                                <img src={manga.imageUrl} alt={manga.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
                                            </>
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-gray-800 text-gray-500 text-xs">NO IMAGE</div>
                                        )}

                                        {/* Action Buttons (Floating) */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-2 translate-x-12 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                            <button
                                                onClick={() => handleReset(manga.id, manga.title)}
                                                className="bg-black/70 p-2 rounded-full text-white hover:bg-cyan-500 hover:shadow-[0_0_10px_rgba(6,182,212,0.8)] transition backdrop-blur-md"
                                                title="เริ่มตอนใหม่"
                                            >
                                                <RefreshCcw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(manga)}
                                                className="bg-black/70 p-2 rounded-full text-white hover:bg-blue-500 hover:shadow-[0_0_10px_rgba(59,130,246,0.8)] transition backdrop-blur-md"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(manga.id)}
                                                className="bg-black/70 p-2 rounded-full text-white hover:bg-red-500 hover:shadow-[0_0_10px_rgba(239,68,68,0.8)] transition backdrop-blur-md"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="absolute top-2 left-2">
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-lg backdrop-blur-md border ${manga.status === "WAITING" ? "bg-red-500/20 text-red-200 border-red-500/50" :
                                                manga.status === "PENDING" ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/50" :
                                                    "bg-teal-500/20 text-teal-200 border-teal-500/50"
                                                }`}>
                                                {manga.status === "WAITING" ? "WAITING" :
                                                    manga.status === "PENDING" ? "WORKING" :
                                                        "DONE"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 flex-1 flex flex-col gap-2">
                                        <h3 className="text-base font-bold text-white leading-tight line-clamp-2 group-hover:text-cyan-400 transition-colors" title={manga.title}>
                                            {manga.title}
                                        </h3>

                                        <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                            <Clock size={12} className="text-cyan-500" />
                                            <span className="bg-white/5 px-2 py-0.5 rounded text-white/70">
                                                {manga.releaseInterval
                                                    ? `Every ${manga.releaseInterval} days`
                                                    : `${DAY_TRANSLATION[manga.releaseDay || ""] || manga.releaseDay}`
                                                }
                                                {manga.releaseTime ? ` @ ${manga.releaseTime}` : ""}
                                            </span>
                                        </div>

                                        {manga.link && (
                                            <a href={manga.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition w-max">
                                                <ExternalLink size={10} /> Link
                                            </a>
                                        )}
                                    </div>

                                    <div className="mt-auto pt-3 border-t border-white/5">
                                        <div className="flex flex-col gap-2 bg-black/20 p-2 rounded-xl backdrop-blur-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Control</span>
                                            </div>
                                            <div className="flex gap-1 w-full justify-between">
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "WAITING")}
                                                    className={`flex-1 h-6 rounded-lg flex items-center justify-center transition-all duration-300 text-[9px] font-bold uppercase tracking-wider ${manga.status === "WAITING" ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] text-white" : "bg-white/5 text-gray-400 hover:bg-red-500/20 hover:text-red-200"}`}
                                                    title="ยังไม่ทำ"
                                                >
                                                    Wait
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "PENDING")}
                                                    className={`flex-1 h-6 rounded-lg flex items-center justify-center transition-all duration-300 text-[9px] font-bold uppercase tracking-wider ${manga.status === "PENDING" ? "bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] text-black" : "bg-white/5 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-200"}`}
                                                    title="กำลังดำเนินการ"
                                                >
                                                    WIP
                                                </button>
                                                <button
                                                    onClick={() => handleStatusChange(manga.id, "DONE")}
                                                    className={`flex-1 h-6 rounded-lg flex items-center justify-center transition-all duration-300 text-[9px] font-bold uppercase tracking-wider ${manga.status === "DONE" ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] text-white" : "bg-white/5 text-gray-400 hover:bg-green-500/20 hover:text-green-200"}`}
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
