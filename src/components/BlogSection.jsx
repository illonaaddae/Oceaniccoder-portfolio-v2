import React from "react";
import { FaExternalLinkAlt } from "react-icons/fa";
import { usePortfolio } from "../Context";

const placeholderPosts = [
  {
    id: "ph-1",
    title: "How I approach building inclusive tech communities",
    excerpt:
      "A short primer on community-first product development, outreach, and mentorship.",
    publishedAt: "2025-10-01",
    readTime: "6 min",
    image: "/images/blog-placeholder-1.svg",
  },
  {
    id: "ph-2",
    title: "Small wins that scale: onboarding contributors",
    excerpt:
      "Practical steps to reduce friction for new contributors and hires.",
    publishedAt: "2025-08-15",
    readTime: "4 min",
    image: "/images/blog-placeholder-2.svg",
  },
  {
    id: "ph-3",
    title: "Designing for resilience in product teams",
    excerpt: "Processes and rituals that keep teams shipping and learning.",
    publishedAt: "2025-06-20",
    readTime: "7 min",
    image: "/images/blog-placeholder-3.svg",
  },
];

const BlogSection = () => {
  const { navItems, blogs } = usePortfolio();
  const blogItem = navItems.find((n) => n.id === "blog");
  const blogHref =
    blogItem?.href ||
    process.env.REACT_APP_BLOG_URL ||
    "https://your-blog.example";

  const previewsSource =
    Array.isArray(blogs) && blogs.length > 0 ? blogs : placeholderPosts;
  const previews = previewsSource.slice(0, 3);

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <section
      id="blog"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold">
              <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
                Latest from the blog
              </span>
            </h2>
            <p className="text-gray-400 mt-2">
              Short previews — full posts live on the external blog.
            </p>
          </div>

          <div>
            <a
              href={blogHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 glass-btn bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:scale-105 transition-transform duration-150"
            >
              Visit Blog
              <FaExternalLinkAlt className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="grid blog-grid gap-6">
          {previews.map((post) => (
            <article
              key={post.id}
              className="glass-card overflow-hidden rounded-xl shadow-lg flex flex-col h-full"
            >
              <div className="relative h-36 sm:h-40 md:h-44">
                <img
                  loading="lazy"
                  decoding="async"
                  width="1200"
                  height="630"
                  src={post.image || "/images/blog-placeholder-1.svg"}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to placeholder if the provided image fails to load
                    const target = e.currentTarget;
                    if (!target.dataset.fallback) {
                      target.dataset.fallback = "1";
                      target.src = "/images/blog-placeholder-1.svg";
                    }
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{formatDate(post.publishedAt)}</span>
                  <span>{post.readTime || "—"}</span>
                </div>

                <h3 className="text-base sm:text-lg font-semibold text-white mb-2 line-clamp-2">
                  {post.title}
                </h3>
                <p className="text-sm sm:text-sm text-gray-300 mb-4 line-clamp-3 flex-1">
                  {post.excerpt}
                </p>

                <div className="flex justify-end mt-2">
                  <a
                    href={blogHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-cyan-400 hover:underline flex items-center gap-2"
                  >
                    Read on blog
                    <FaExternalLinkAlt className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
