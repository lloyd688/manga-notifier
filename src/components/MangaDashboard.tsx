"use client";

import { useState } from "react";
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

    const filteredMangas = mangas.filter(m => {
        const matchesToday = !showTodayOnly || m.releaseDay === new Date().toLocaleDateString('en-US', { weekday: 'long' });
        const matchesCreator = selectedCreator === "All" || (m.creator || "ส่วนกลาง (Public)") === selectedCreator;
        return matchesToday && matchesCreator;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                        <h2 className="text-3xl font-extrabold flex items-center gap-2">
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                                {showTodayOnly ? "งานวันนี้" : "MANGA NOTIFIER"}
                            </span>
                            <span className="drop-shadow-none text-white filter-none">
                                {showTodayOnly ? "🔥" : "✨"}
                            </span>
                        </h2>
                        <p className="text-[10px] font-medium tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500 opacity-80 uppercase">
                            จัดการงานตารางแปลมังงะของคุณ
                        </p>
                    </div>

                    <button
                        onClick={handleLogout}
                        className="p-2.5 rounded-full text-white transition transform hover:scale-105 shadow-[0_0_15px_rgba(239,68,68,0.5)] bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-400 hover:to-orange-500"
                        title="ออกจากระบบ"
                    >
                        <LogOut size={20} />
                    </button>

                    <button
                        onClick={handleNotify}
                        className="p-2.5 rounded-full text-white transition transform hover:scale-105 shadow-[0_0_15px_rgba(59,130,246,0.5)] bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500"
                        title="แจ้งเตือน Telegram เดี๋ยวนี้"
                    >
                        <Bell size={20} />
                    </button>
                    <button
                        onClick={() => setShowTodayOnly(!showTodayOnly)}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition transform hover:scale-105 text-sm font-bold shadow-lg ${showTodayOnly
                            ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.5)]"
                            : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white"
                            }`}
                        title="แสดงเฉพาะงานวันนี้"
                    >
                        <Calendar size={18} />
                        <span>ตารางวันนี้</span>
                    </button>

                    <div className="relative group">
                        <select
                            value={selectedCreator}
                            onChange={(e) => setSelectedCreator(e.target.value)}
                            className="appearance-none bg-gray-800 text-white px-4 py-2 rounded-xl font-bold border border-gray-700 hover:border-gray-500 transition cursor-pointer pr-8"
                        >
                            <option value="All">ดูงานทุกคน 👥</option>
                            {creators.map(c => (
                                <option key={c} value={c}>{c} 👤</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            ▼
                        </div>
                    </div>
                </div>
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
                                    className="bg-gray-900/40 backdrop-blur-xl rounded-xl overflow-hidden shadow-lg border border-white/10 flex flex-col transition-all duration-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] hover:border-cyan-500/30 hover:-translate-y-1"
                                >
                                    <div className="relative w-full aspect-[480/623] bg-gray-800">
                                        {manga.imageUrl ? (
                                            <img src={manga.imageUrl} alt={manga.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-gray-500">ไม่มีรูปภาพ</div>
                                        )}
                                        <div className="absolute top-2 right-2 flex gap-1">
                                            <button
                                                onClick={() => handleReset(manga.id, manga.title)}
                                                className="bg-black/50 p-2 rounded-full text-white hover:bg-blue-600 transition"
                                                title="เริ่มตอนใหม่ (รีเซ็ตสถานะ)"
                                            >
                                                <RefreshCcw size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(manga)}
                                                className="bg-black/50 p-2 rounded-full text-blue-400 hover:bg-black transition"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button onClick={() => handleDelete(manga.id)} className="bg-black/50 p-2 rounded-full text-red-500 hover:bg-black transition">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-2 flex-1 flex flex-col">
                                        <h3 className="text-sm font-bold mb-1 truncate" title={manga.title}>{manga.title}</h3>
                                        <div className="flex items-center gap-1 text-gray-400 text-[10px] mb-1">
                                            <Clock size={10} />
                                            <span>
                                                {manga.releaseInterval
                                                    ? `ทุกๆ ${manga.releaseInterval} วัน`
                                                    : `${DAY_TRANSLATION[manga.releaseDay || ""] || manga.releaseDay}`
                                                }
                                                {manga.releaseTime ? ` ${manga.releaseTime} น.` : ""}
                                            </span>
                                        </div>
                                        {manga.link && (
                                            <a href={manga.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-400 hover:underline mb-1 text-[10px]">
                                                <ExternalLink size={10} /> ไปยังลิงก์
                                            </a>
                                        )}

                                        <div className="mt-auto pt-1 border-t border-gray-800">
                                            <div className="flex flex-col gap-1 bg-black/30 p-1.5 rounded-lg">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs text-gray-400">สถานะ:</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${manga.status === "WAITING" ? "bg-red-500/20 text-red-300 border border-red-500/50" :
                                                        manga.status === "PENDING" ? "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50" :
                                                            "bg-green-500/20 text-green-300 border border-green-500/50"
                                                        }`}>
                                                        {manga.status === "WAITING" ? "ยังไม่ทำ" :
                                                            manga.status === "PENDING" ? "กำลังทำ" :
                                                                "สำเร็จ"}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    {/* Status Buttons - Show for everyone? Or restrictive? Let's show for everyone for now as per "Public Dashboard" request */}
                                                    <div className="flex gap-1 w-full justify-between">
                                                        <button
                                                            onClick={() => handleStatusChange(manga.id, "WAITING")}
                                                            className={`flex-1 h-5 rounded flex items-center justify-center transition text-[8px] ${manga.status === "WAITING" ? "bg-red-900/50 text-red-200 border border-red-500" : "bg-gray-800 text-gray-500 border border-transparent hover:border-gray-600"}`}
                                                            title="ยังไม่ทำ"
                                                        >
                                                            ยังไม่ทำ
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(manga.id, "PENDING")}
                                                            className={`flex-1 h-5 rounded flex items-center justify-center transition text-[8px] ${manga.status === "PENDING" ? "bg-yellow-900/50 text-yellow-200 border border-yellow-500" : "bg-gray-800 text-gray-500 border border-transparent hover:border-gray-600"}`}
                                                            title="กำลังดำเนินการ"
                                                        >
                                                            กำลังทำ
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(manga.id, "DONE")}
                                                            className={`flex-1 h-5 rounded flex items-center justify-center transition text-[8px] ${manga.status === "DONE" ? "bg-green-900/50 text-green-200 border border-green-500" : "bg-gray-800 text-gray-500 border border-transparent hover:border-gray-600"}`}
                                                            title="สำเร็จ"
                                                        >
                                                            เสร็จแล้ว
                                                        </button>
                                                    </div>
                                                </div>
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
        </div>
    );
}
