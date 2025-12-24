import { prisma } from "@/lib/prisma";
import MangaDashboard from "@/components/MangaDashboard";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const creator = cookieStore.get("creator_name")?.value;

  // Auto-reset "DONE" tasks after 24 hours
  await prisma.manga.updateMany({
    where: {
      status: "DONE",
      updatedAt: {
        lt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Older than 24 hours
      }
    },
    data: {
      status: "WAITING"
    }
  });

  const mangasData = await prisma.manga.findMany({
    // where: creator ? { creator } : {}, // Removed filter: User wants to see ALL, grouped by creator
    orderBy: { createdAt: 'desc' },
  });

  // Explicitly map to ensure serialization matches the client component expectation
  const mangas = mangasData.map((m) => ({
    id: m.id,
    title: m.title,
    imageUrl: m.imageUrl,
    link: m.link,
    releaseDay: m.releaseDay,
    releaseTime: m.releaseTime,
    releaseInterval: m.releaseInterval ?? null,
    nextReleaseDate: m.nextReleaseDate ? m.nextReleaseDate.toISOString() : null,
    status: m.status,
    isFinished: m.isFinished,
    creator: m.creator,
    // Add these if used, converted to string
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return (
    <div className="py-8">
      <header className="mb-8 text-center">
        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-2 drop-shadow-lg glitch-effect">
          MANGA NOTIFIER
        </h1>
        <p className="text-gray-400 text-lg">จัดการงานตารางแปลมังงะของคุณ</p>
      </header>

      <MangaDashboard initialManga={mangas} />
    </div>
  );
}
