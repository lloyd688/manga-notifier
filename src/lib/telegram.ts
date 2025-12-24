const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function sendTelegramMessage(message: string): Promise<boolean> {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.error("Telegram credentials missing");
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const res = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: "Markdown", // Allows bold/italic
            }),
        });

        const data = await res.json();

        if (!data.ok) {
            console.error("Telegram API Error:", data);
            return false;
        }

        return true;
    } catch (error) {
        console.error("Failed to send Telegram message:", error);
        return false;
    }
}
