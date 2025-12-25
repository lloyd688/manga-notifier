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
        // ------------------------------------------------------------------
        // NEW LOGIC: "Smart Daily Check"
        // 1. Get Today's Day
        // 2. Filter Mangas for Today
        // 3. Logic:
        //    - If "Everyday" -> Send if not sent today + Time passed
        //    - If "Weekly" (e.g. Tuesday) -> Send if not sent today + Time passed
        //    - If "Custom" -> Send if Date reached + Time passed
        // ------------------------------------------------------------------

        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMinute; // Minutes since midnight

        const isTimeReady = (releaseTimeStr: string | null) => {
            if (!releaseTimeStr) return true; // No time set? Send it early.
            const [h, m] = releaseTimeStr.split(":").map(Number);
            const targetTimeVal = h * 60 + m;
            return currentTimeVal >= targetTimeVal;
        };

        const isAlreadyNotifiedToday = (lastNotified: Date | null) => {
            if (!lastNotified) return false;
            const notificationDate = new Date(lastNotified);
            notificationDate.setHours(0, 0, 0, 0);
            return notificationDate.getTime() === todayStart.getTime();
        };

        const filteredMangas = mangas.filter(m => {
            // A. Check if it matches TODAY
            const matchesDay = m.releaseInterval
                ? (m.nextReleaseDate && new Date(m.nextReleaseDate) <= now) // Custom: Date Reached
                : (m.releaseDay === "Everyday" || m.releaseDay === todayName); // Weekly: Day Name

            if (!matchesDay) return false;

            // B. Check if Time is Reached
            if (!isTimeReady(m.releaseTime)) return false;

            // C. Check if Already Notified Today
            if (isAlreadyNotifiedToday(m.lastNotifiedAt)) return false;

            return true;
        });

        console.log(`[Notify] Found ${filteredMangas.length} manga to notify.`);

        let sentCount = 0;

        for (const m of filteredMangas) {
            const creatorTxt = m.creator ? `\n👤 *รับผิดชอบโดย:* ${m.creator}` : "";
            const msg = `📢 *${m.title}* (Ver. Smart: ${todayName})
🗓 ${m.releaseInterval ? 'Custom' : (m.releaseDay || 'Daily')} @ ${m.releaseTime || 'Anytime'}${creatorTxt}
🔗 [คลิกอ่านเลย](${m.link || "#"})`;

            const success = await sendTelegramMessage(msg);

            if (success) {
                sentCount++;
                // Update Database (Mark as Sent)
                // Use a simplified update to avoid locking issues, or just fire and forget await
                await prisma.manga.update({
                    where: { id: m.id },
                    data: { lastNotifiedAt: new Date() }
                });

                // If Custom Interval, verify/update next date
                if (m.releaseInterval && m.nextReleaseDate) {
                    const nextDate = new Date(m.nextReleaseDate);
                    nextDate.setDate(nextDate.getDate() + m.releaseInterval);
                    await prisma.manga.update({
                        where: { id: m.id },
                        data: { nextReleaseDate: nextDate }
                    });
                }
            }
        }

        return NextResponse.json({ success: true, notifiedCount: sentCount, message: `Sent ${sentCount} notifications` });

    } catch (error) {
        console.error("Notify Error:", error);
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}
