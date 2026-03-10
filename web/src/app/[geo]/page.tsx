import { getGeoPage, getVideosByCategory } from "@/lib/db";
import { CATEGORY_LABELS, type VideoItem } from "@/lib/types";
import VideoGrid from "@/components/VideoGrid";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ geo: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { geo } = await params;
  const page = getGeoPage(geo);
  if (!page) return { title: "Not Found" };

  return {
    title: page.meta_title,
    description: page.meta_description,
    openGraph: {
      title: page.meta_title,
      description: page.meta_description,
      type: "website",
    },
    alternates: {
      canonical: `/${page.slug}`,
    },
  };
}

export default async function GeoPage({ params }: Props) {
  const { geo } = await params;
  const page = getGeoPage(geo);
  if (!page) notFound();
  const affiliateLink = process.env.AFFILIATE_LINK || "https://www.softwareadvice.com";

  const categoryLabel = CATEGORY_LABELS[page.category] || page.category;

  let videos: VideoItem[] = [];
  try {
    videos = getVideosByCategory(page.category);
  } catch {
    videos = [];
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: page.h1,
    description: page.meta_description,
    about: {
      "@type": "SoftwareApplication",
      applicationCategory: categoryLabel,
    },
    areaServed: {
      "@type": "City",
      name: page.city,
      containedInPlace: {
        "@type": "State",
        name: page.state,
        containedInPlace: {
          "@type": "Country",
          name: "United States",
        },
      },
    },
  };

  return (
    <article className="max-w-6xl mx-auto px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/" className="text-blue-400 hover:underline text-sm">
          <span aria-hidden="true">&larr;</span> All Videos
        </Link>
      </nav>

      <header className="mb-12">
        <span className="inline-block bg-blue-600 text-white text-xs px-2 py-1 rounded mb-3">
          {categoryLabel} &middot; {page.city}, {page.state}
        </span>
        <h1 className="text-4xl font-bold text-white mb-4 text-balance">
          {page.h1}
        </h1>
        <p className="text-gray-400 text-lg max-w-3xl leading-relaxed text-pretty">
          {page.intro}
        </p>

        {page.local_stat && (
          <aside
            className="mt-4 bg-gray-900 border border-gray-800 rounded-lg p-4 max-w-2xl"
            aria-label="Local business statistic"
          >
            <p className="text-gray-300 text-sm italic leading-relaxed">
              {page.local_stat}
            </p>
          </aside>
        )}
      </header>

      <section className="mb-12" aria-labelledby="benefits-heading">
        <h2 id="benefits-heading" className="text-2xl font-bold text-white mb-6 text-balance">
          Why {page.city} Businesses Choose the Right {categoryLabel}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {page.benefits.map((benefit, i) => (
            <div
              key={i}
              className="bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h3 className="text-lg font-semibold text-white mb-2">
                {benefit.title}
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {videos.length > 0 && (
        <section className="mb-12" aria-labelledby="videos-heading">
          <h2 id="videos-heading" className="text-2xl font-bold text-white mb-6">
            {categoryLabel} Video Guides
          </h2>
          <VideoGrid videos={videos} />
        </section>
      )}

      <section
        className="text-center bg-gray-900 rounded-xl p-8 border border-gray-800"
        aria-labelledby="cta-heading"
      >
        <h2 id="cta-heading" className="text-2xl font-bold text-white mb-3 text-balance">
          Find {categoryLabel} for Your {page.city} Business
        </h2>
        <p className="text-gray-400 mb-6 leading-relaxed">
          Our advisors at Software Advice help {page.city} businesses find the
          right tools — completely free.
        </p>
        <a
          href={affiliateLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          aria-label={`${page.cta_text || "Talk to a Free Advisor"} — opens Software Advice in a new tab`}
        >
          {page.cta_text || "Talk to a Free Advisor"}
        </a>
      </section>
    </article>
  );
}
