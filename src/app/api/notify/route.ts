import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export const dynamic = 'force-dynamic'; // Ensure it's not cached

export async function GET() {
    try {
        // Query DB for ALL pending manga
        const mangas = await prisma.manga.findMany({
            where: {
                status: {
                    not: "DONE"
                }
            }
        });

        // Filter for Custom Schedules
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const filteredMangas = mangas.filter(m => {
            if (m.releaseInterval) {
                // If custom interval, only show if Due Date is passed or today
                if (!m.nextReleaseDate) return true; // Fallback if no date set
                return new Date(m.nextReleaseDate) <= new Date(); // Compare timestamps (approx) - actually safer to compare start of day if we want "due today"
                // But simplified: date <= now is fine.
            }
            return true; // Keep weekly schedules as is (show all pending)
        });

        if (filteredMangas.length === 0) {
            return NextResponse.json({ success: true, notifiedCount: 0, message: "No manga due." });
        }

        // Sort by Day
        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "Everyday"];
        const grouped: Record<string, typeof mangas> = {};
        const customGroup: typeof mangas = [];

        filteredMangas.forEach(m => {
            if (m.releaseInterval) {
                customGroup.push(m);
            } else {
                const day = m.releaseDay || "Unknown";
                if (!grouped[day]) grouped[day] = [];
                grouped[day].push(m);
            }
        });

        // Construct Message
        let message = `📢 *งานแปลที่ต้องทำ (Manga Work)*\n`;

        daysOrder.forEach(day => {
            if (grouped[day] && grouped[day].length > 0) {
                message += `\n🗓 *${day}*\n`;
                grouped[day].forEach(m => {
                    message += `• *${m.title}* (${m.releaseTime})\n`;
                    if (m.link) message += `  [อ่านเลย](${m.link})\n`;
                });
            }
        });

        if (customGroup.length > 0) {
            message += `\n🗓 *กำหนดเอง (ถึงเวลาแล้ว)*\n`;
            customGroup.forEach(m => {
                message += `• *${m.title}* (${m.releaseTime})\n`;
                if (m.link) message += `  [อ่านเลย](${m.link})\n`;
            });
        }

        // Send
        const success = await sendTelegramMessage(message);

        return NextResponse.json({
            success,
            notifiedCount: mangas.length,
            mangas: mangas.map(m => m.title)
        });

    } catch (error) {
        console.error("Notify Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
