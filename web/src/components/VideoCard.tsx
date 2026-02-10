import type { VideoItem } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";

export default function VideoCard({ video }: { video: VideoItem }) {
  const categoryLabel = CATEGORY_LABELS[video.category] || video.category;

  return (
    <a
      href={`/videos/${video.id}`}
      className="group block bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-blue-600 transition-colors"
    >
      <div className="aspect-[9/16] bg-gray-800 flex items-center justify-center relative">
        {video.video_path ? (
          <video
            src={`/videos/content_${video.content_id}.mp4`}
            className="w-full h-full object-cover"
            muted
            preload="metadata"
          />
        ) : (
          <div className="text-gray-600 text-4xl">▶</div>
        )}
        <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          {categoryLabel}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
          {video.title || video.hook}
        </h3>
        <p className="text-gray-400 text-sm mt-2 line-clamp-2">{video.script}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          {video.youtube_video_id && <span>YouTube</span>}
          {video.instagram_media_id && <span>Instagram</span>}
          <span>{new Date(video.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </a>
  );
}
