import type { VideoItem } from "@/lib/types";
import VideoCard from "./VideoCard";

export default function VideoGrid({ videos }: { videos: VideoItem[] }) {
  if (videos.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">No videos yet.</p>
        <p className="text-sm mt-2">
          Run the Thinksy pipeline to generate your first video ads.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
