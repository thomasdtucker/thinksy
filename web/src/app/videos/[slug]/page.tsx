import { getVideoBySlug } from "@/lib/db";
import { CATEGORY_LABELS } from "@/lib/types";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const video = getVideoBySlug(slug);
  if (!video) return { title: "Video Not Found" };

  const title = video.seo_title || video.title || video.hook;
  const description = video.seo_description || video.yt_description || video.script;
  const ogTitle = video.og_title || title;
  const ogDescription = video.og_description || description;

  return {
    title: `${title} | Thinksy`,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      type: "video.other",
    },
  };
}

export default async function VideoPage({ params }: Props) {
  const { slug } = await params;
  const video = getVideoBySlug(slug);
  if (!video) notFound();
  const affiliateLink = process.env.AFFILIATE_LINK || "https://www.softwareadvice.com";

  const title = video.title || video.hook;
  const description = video.yt_description || video.script;
  const categoryLabel = CATEGORY_LABELS[video.category] || video.category;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: title,
    description,
    thumbnailUrl: video.youtube_video_id
      ? `https://i.ytimg.com/vi/${video.youtube_video_id}/hqdefault.jpg`
      : undefined,
    uploadDate: video.created_at,
    duration: `PT${Math.round(video.duration_seconds)}S`,
    contentUrl: video.youtube_video_id
      ? `https://youtube.com/shorts/${video.youtube_video_id}`
      : video.video_path || undefined,
    publisher: {
      "@type": "Organization",
      name: "Thinksy",
    },
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mb-4">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          &larr; All Videos
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="aspect-[9/16] bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
          {video.youtube_video_id ? (
            <iframe
              title={title}
              src={`https://www.youtube.com/embed/${video.youtube_video_id}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : video.video_path ? (
            <video
              src={video.video_path}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              Video unavailable
            </div>
          )}
        </div>

        <div>
          <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mb-3">
            {categoryLabel}
          </span>
          <h1 className="text-3xl font-bold text-white mb-4">{title}</h1>
          <p className="text-gray-400 mb-6">{video.script}</p>

          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 mb-6">
            <p className="text-sm text-gray-400 mb-2">Call to Action</p>
            <p className="text-white font-medium">{video.cta}</p>
          </div>

          <a
            href={affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Talk to a Free Advisor
          </a>

          <div className="mt-8 flex flex-wrap gap-3">
            {video.youtube_video_id && (
              <a
                href={`https://youtube.com/shorts/${video.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                Watch on YouTube
              </a>
            )}
            {video.instagram_permalink && (
              <a
                href={video.instagram_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>
                Watch on Instagram
              </a>
            )}
            <span className="self-center text-sm text-gray-500">{new Date(video.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
