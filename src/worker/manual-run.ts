
import { PrismaClient } from "@prisma/client";
import * as dotenv from 'dotenv';
import path from 'path';
// Load from .env.local because that is where the secrets are!
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const prisma = new PrismaClient();
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(message: string) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log("❌ Missing Telegram Creds");
        return;
    }
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: "Markdown" }),
        });
        console.log("✅ Telegram Sent!");
    } catch (e) {
        console.error("❌ Telegram Failed", e);
    }
}

async function main() {
    // console.log("🚀 Starting Manual Notification Check...");

    // On Local Machine, new Date() is ALREADY Thai Time.
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[now.getDay()];

    // console.log(`🕒 Current Time: ${now.toLocaleTimeString()} (${todayName})`);

    const mangas = await prisma.manga.findMany();

    const toNotify = mangas.filter(m => {
        // 1. Check Day
        const isDayMatch = m.releaseInterval
            ? (m.nextReleaseDate && new Date(m.nextReleaseDate) <= now)
            : (m.releaseDay === "Everyday" || m.releaseDay === todayName);

        if (!isDayMatch) return false;

        // 2. Check Time
        if (!m.releaseTime) return true;

        const [h, min] = m.releaseTime.split(":").map(Number);
        const releaseTimeDate = new Date();
        releaseTimeDate.setHours(h, min, 0, 0);

        if (now < releaseTimeDate) return false;

        // 3. Check Duplicate (Already Sent Today?)
        if (m.lastNotifiedAt) {
            const last = new Date(m.lastNotifiedAt);
            if (last.getDate() === now.getDate() && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()) {
                return false;
            }
        }

        return true;
    });

    if (toNotify.length > 0) {
        console.log(`🔔 Triggering ${toNotify.length} Notifications...`);
        for (const m of toNotify) {
            console.log(`Sending alert for: ${m.title}`);
            const msg = `✨ *${m.title}* \n\n🚀 ตอนใหม่มาแล้วครับ! \n🔗 [อ่านเลย](${m.link || "#"}) \n🕒 เวลา: ${m.releaseTime || "ตอนนี้"}`;

            await sendTelegram(msg);

            // Update DB
            await prisma.manga.update({
                where: { id: m.id },
                data: { lastNotifiedAt: now }
            });
        }
    } else {
        // CONFIDENCE DASHBOARD
        // Calculate next upcoming manga for TODAY
        const upcoming = mangas.filter(m => {
            // Check if it's for today
            const isDayMatch = m.releaseInterval
                ? (m.nextReleaseDate && new Date(m.nextReleaseDate) <= now)
                : (m.releaseDay === "Everyday" || m.releaseDay === todayName);

            if (!isDayMatch) return false;

            // Check if processed already
            if (m.lastNotifiedAt) {
                const last = new Date(m.lastNotifiedAt);
                if (last.getDate() === now.getDate() && last.getMonth() === now.getMonth() && last.getFullYear() === now.getFullYear()) return false;
            }

            // Check if future time
            if (!m.releaseTime) return false;
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
            const diffMs = target.getTime() - now.getTime();
            const diffMins = Math.ceil(diffMs / 60000); // Minutes remaining

            console.log(`✅ [${now.toLocaleTimeString()}] System Active | 🎯 Next Queue: '${next.title}' in ${diffMins} mins (@ ${next.releaseTime})`);
        } else {
            console.log(`✅ [${now.toLocaleTimeString()}] System Active | 💤 No more schedule for today. Waiting for tomorrow.`);
        }
    }
}

// Run immediately on start
main().catch(e => console.error(e));

// Then run every 1 minute
console.log("⏱️ Standing by... Checking every 60 seconds.");
setInterval(() => {
    main().catch(e => console.error(e));
}, 60 * 1000);

// Keep process alive
process.stdin.resume();
