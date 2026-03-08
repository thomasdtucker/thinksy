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
      : "",
    uploadDate: video.created_at,
    duration: `PT${Math.round(video.duration_seconds)}S`,
    contentUrl: video.youtube_video_id
      ? `https://youtube.com/shorts/${video.youtube_video_id}`
      : "",
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
            href="https://www.softwareadvice.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Talk to a Free Advisor
          </a>

          <div className="mt-8 flex gap-4 text-sm text-gray-500">
            {video.youtube_video_id && (
              <a
                href={`https://youtube.com/shorts/${video.youtube_video_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-blue-400"
              >
                Watch on YouTube
              </a>
            )}
            <span>{new Date(video.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
