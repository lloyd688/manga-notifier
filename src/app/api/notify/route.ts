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

        // Filter for "Today Only"
        const now = new Date();
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayName = days[now.getDay()];

        const filteredMangas = mangas.filter(m => {
            // 1. Custom Schedule
            if (m.releaseInterval && m.nextReleaseDate) {
                // Show if Due Date is passed or today
                return new Date(m.nextReleaseDate) <= now;
            }

            // 2. Weekly Schedule
            // Only show if day matches TODAY or is "Everyday"
            if (m.releaseDay === "Everyday") return true;
            return m.releaseDay === todayName;
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

        // Initialize header message? Maybe not needed if 1 per story. 
        // User asked for "1 per story", implying no big header needed, or maybe just the story details.

        let sentCount = 0;

        // 1. Send Standard Weekly Items
        for (const day of daysOrder) {
            if (grouped[day] && grouped[day].length > 0) {
                // Determine Day Name (Thai could be better here?)
                // Keep it English for now to match current logic.

                for (const m of grouped[day]) {
                    const creatorTxt = m.creator ? `\n👤 *รับผิดชอบโดย:* ${m.creator}` : "";
                    const msg = `📢 *${m.title}*
🗓 ${day} @ ${m.releaseTime}${creatorTxt}
🔗 [คลิกอ่านเลย](${m.link || "#"})`;

                    await sendTelegramMessage(msg);
                    sentCount++;
                }
            }
        }

        // 2. Send Custom Schedule Items
        if (customGroup.length > 0) {
            for (const m of customGroup) {
                const creatorTxt = m.creator ? `\n👤 *รับผิดชอบโดย:* ${m.creator}` : "";
                const msg = `📢 *${m.title}*
🗓 Custom Schedule @ ${m.releaseTime}${creatorTxt}
🔗 [คลิกอ่านเลย](${m.link || "#"})`;

                await sendTelegramMessage(msg);
                sentCount++;
            }
        }

        const success = sentCount > 0;

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
