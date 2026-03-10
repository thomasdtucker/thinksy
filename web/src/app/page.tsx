import { getVideos } from "@/lib/db";
import VideoGrid from "@/components/VideoGrid";
import { CATEGORY_LABELS, type VideoItem } from "@/lib/types";

export default function HomePage() {
  const affiliateLink = process.env.AFFILIATE_LINK || "https://www.softwareadvice.com";
  let videos: VideoItem[] = [];
  try {
    videos = getVideos();
  } catch {
    videos = [];
  }

  const categories = [...new Set(videos.map((v) => v.category))];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <section className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">
          Find the Right Software for Your Business
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Watch short video guides about HR, accounting, and project management
          software. Then{" "}
          <a
            href={affiliateLink}
            className="text-blue-400 hover:underline"
          >
            talk to a free advisor
          </a>{" "}
          to find the perfect fit.
        </p>
      </section>

      {categories.length > 1 && (
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
          {categories.map((cat) => (
            <span
              key={cat}
              className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm"
            >
              {CATEGORY_LABELS[cat] || cat}
            </span>
          ))}
        </div>
      )}

      <VideoGrid videos={videos} />

      <section className="mt-16 text-center bg-gray-900 rounded-xl p-8 border border-gray-800">
        <h2 className="text-2xl font-bold text-white mb-3">
          Need Help Choosing Software?
        </h2>
        <p className="text-gray-400 mb-6">
          Our advisors at Software Advice can help you find the right tool — for
          free.
        </p>
        <a
          href={affiliateLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Talk to an Advisor
        </a>
      </section>
    </div>
  );
}
