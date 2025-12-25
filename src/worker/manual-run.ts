
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
    console.log("🚀 Starting Manual Notification Check...");

    // On Local Machine, new Date() is ALREADY Thai Time.
    const now = new Date();
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const todayName = days[now.getDay()];

    console.log(`🕒 Current Time: ${now.toLocaleTimeString()} (${todayName})`);

    const mangas = await prisma.manga.findMany();
    // console.log(`📚 Total Mangas in DB: ${mangas.length}`);

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
                // console.log(`⏭️ ${m.title}: Already notified today.`);
                return false;
            }
        }

        return true;
    });

    console.log(`🔔 Mangas to Notify: ${toNotify.length}`);

    if (toNotify.length > 0) {
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
        console.log("😴 No mangas to notify right now.");
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
