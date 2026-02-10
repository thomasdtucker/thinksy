import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thinksy — Find the Right Business Software",
  description:
    "Watch short video guides about HR, accounting, and project management software. Talk to a free advisor at Software Advice to find the perfect solution.",
  openGraph: {
    title: "Thinksy — Find the Right Business Software",
    description:
      "Short video guides to help you find the best HR, accounting, and project management software for your business.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <header className="border-b border-gray-800">
          <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <a href="/" className="text-2xl font-bold text-white">
              Thinksy
            </a>
            <a
              href="https://www.softwareadvice.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Talk to an Advisor
            </a>
          </nav>
        </header>
        <main>{children}</main>
        <footer className="border-t border-gray-800 mt-16">
          <div className="max-w-6xl mx-auto px-4 py-8 text-center text-gray-500 text-sm">
            <p>
              Find the right software for your business.{" "}
              <a
                href="https://www.softwareadvice.com"
                className="text-blue-400 hover:underline"
              >
                Get free advice
              </a>{" "}
              from Software Advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
