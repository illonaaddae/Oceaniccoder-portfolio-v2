import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FaSearch,
  FaClock,
  FaCalendarAlt,
  FaTag,
  FaArrowRight,
  FaFilter,
  FaTimes,
  FaBookOpen,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { usePortfolioData } from "../hooks/usePortfolioData";

const POSTS_PER_PAGE = 6;

const BlogSection = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { blogPosts, loading } = usePortfolioData();

  // Local state
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState(
    searchParams.get("category") || "All"
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Fallback posts if database is empty
  const fallbackPosts = [
    {
      $id: "intro-to-react",
      title: "Getting Started with React: A Beginner's Journey",
      slug: "getting-started-react",
      excerpt:
        "My experience learning React and the key concepts every beginner should know. From components to hooks, I share insights from my learning path.",
      content: `# Getting Started with React

React has transformed how I build web applications. Here's what I learned as a beginner...

## Why React?

React's component-based architecture makes building complex UIs manageable. Each piece of your UI becomes a reusable building block.

## Key Concepts I Mastered

1. **Components** - The building blocks of React
2. **Props** - How data flows between components
3. **State** - Managing dynamic data
4. **Hooks** - useState, useEffect, and more

## My Advice for Beginners

Start small. Build something simple, then gradually add complexity. Don't try to learn everything at once.`,
      category: "Development",
      tags: ["React", "JavaScript", "Frontend", "Web Development"],
      publishedAt: "2025-01-15",
      readTime: "5 min read",
      image:
        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883",
      featured: true,
    },
    {
      $id: "women-in-tech",
      title: "Breaking Barriers: Women in Tech Leadership",
      slug: "women-in-tech-leadership",
      excerpt:
        "Exploring the challenges and opportunities for women in technology leadership roles, and how we can create more inclusive environments.",
      content: `# Breaking Barriers: Women in Tech Leadership

In a society where women are often underestimated, I am determined to shift the conversation...

## The Current Landscape

Despite making up nearly half of the workforce, women hold only 25% of computing jobs. The statistics are even more stark in leadership roles.

## Creating Change

Change begins with recognition, continues with action, and succeeds through persistence.

## My Mission

I believe in a world where opportunities are equal, dreams are boundless, and success is driven by determination.`,
      category: "Leadership",
      tags: ["Women in Tech", "Leadership", "Diversity", "Inclusion"],
      publishedAt: "2025-01-10",
      readTime: "6 min read",
      image:
        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf000057a457f95/view?project=6943431e00253c8f9883",
      featured: true,
    },
    {
      $id: "building-communities",
      title: "Building Inclusive Tech Communities From Scratch",
      slug: "building-inclusive-tech-communities",
      excerpt:
        "Lessons learned from founding and growing tech communities that welcome everyone regardless of background or experience level.",
      content: `# Building Inclusive Tech Communities

Creating a tech community that truly welcomes everyone takes intentional effort...

## Start With Why

Why does your community exist? What gap are you filling?

## Key Principles

1. **Accessibility** - Remove barriers to entry
2. **Mentorship** - Connect newcomers with experienced members
3. **Safe Spaces** - Create environments where questions are welcomed

## Measuring Success

Success isn't just about numbers. It's about the impact on individual lives.`,
      category: "Community",
      tags: ["Community Building", "Tech", "Mentorship", "Inclusion"],
      publishedAt: "2025-01-05",
      readTime: "7 min read",
      image:
        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cf00032bc7780ff/view?project=6943431e00253c8f9883",
      featured: false,
    },
    {
      $id: "glass-morphism-css",
      title: "Creating Stunning Glass Morphism Effects with CSS",
      slug: "glass-morphism-css-tutorial",
      excerpt:
        "A deep dive into creating beautiful glass morphism effects using pure CSS. Learn the techniques behind modern UI design.",
      content: `# Glass Morphism with CSS

Glass morphism creates a frosted glass effect that adds depth and elegance to your designs...

## The Core Properties

\`\`\`css
.glass-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
}
\`\`\`

## Best Practices

- Use subtle transparency
- Add appropriate blur values
- Consider performance implications`,
      category: "Development",
      tags: ["CSS", "UI Design", "Frontend", "Tutorial"],
      publishedAt: "2024-12-20",
      readTime: "4 min read",
      image:
        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883",
      featured: false,
    },
  ];

  const posts = blogPosts && blogPosts.length > 0 ? blogPosts : fallbackPosts;

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(posts.map((post) => post.category).filter(Boolean));
    return ["All", ...Array.from(cats)];
  }, [posts]);

  // Filter posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        !searchQuery ||
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.tags?.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [posts, searchQuery, selectedCategory]);

  // Featured posts
  const featuredPosts = useMemo(
    () => posts.filter((post) => post.featured),
    [posts]
  );

  // Pagination
  const totalPages = Math.ceil(filteredPosts.length / POSTS_PER_PAGE);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * POSTS_PER_PAGE,
    currentPage * POSTS_PER_PAGE
  );

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategory !== "All") params.set("category", selectedCategory);
    setSearchParams(params);
  }, [searchQuery, selectedCategory, setSearchParams]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePostClick = (post) => {
    navigate(`/blog/${post.slug || post.$id}`);
  };

  if (loading) {
    return (
      <section
        className="min-h-screen pt-28 pb-20 flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
        }}
      >
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading blog posts...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      id="blog"
      className="min-h-screen pt-28 pb-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 right-10 w-96 h-96 bg-gradient-to-r from-green-500/8 to-emerald-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-cyan-500/6 to-blue-500/8 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-green-400 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
              Blog & Insights
            </span>
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Thoughts on development, leadership, community building, and my
            journey in tech.
          </p>
        </div>

        {/* Featured Posts */}
        {featuredPosts.length > 0 && currentPage === 1 && !searchQuery && (
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <FaBookOpen className="text-emerald-400" />
              Featured Posts
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {featuredPosts.slice(0, 2).map((post) => (
                <article
                  key={post.$id}
                  onClick={() => handlePostClick(post)}
                  className="glass-card group cursor-pointer overflow-hidden rounded-2xl hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative h-48 md:h-56 overflow-hidden">
                    <img
                      src={post.image}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src =
                          "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-emerald-500/90 text-white text-xs font-semibold rounded-full">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <FaCalendarAlt className="text-emerald-400" />
                        {formatDate(post.publishedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FaClock className="text-emerald-400" />
                        {post.readTime}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                      {post.title}
                    </h3>
                    <p className="text-gray-400 line-clamp-2 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-400 text-sm font-medium">
                        {post.category}
                      </span>
                      <span className="text-cyan-400 flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                        Read More <FaArrowRight />
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="glass-card p-4 mb-8 rounded-xl">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Category Filter - Desktop */}
            <div className="hidden md:flex gap-2 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-emerald-500 text-white"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Category Filter Toggle - Mobile */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white"
            >
              <FaFilter />
              Filter by Category
            </button>
          </div>

          {/* Mobile Categories */}
          {showFilters && (
            <div className="md:hidden flex gap-2 flex-wrap mt-4 pt-4 border-t border-white/10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setShowFilters(false);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-emerald-500 text-white"
                      : "bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results info */}
        {(searchQuery || selectedCategory !== "All") && (
          <p className="text-gray-400 mb-6">
            Found {filteredPosts.length} post
            {filteredPosts.length !== 1 ? "s" : ""}
            {searchQuery && ` for "${searchQuery}"`}
            {selectedCategory !== "All" && ` in ${selectedCategory}`}
          </p>
        )}

        {/* Blog Posts Grid */}
        {paginatedPosts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {paginatedPosts.map((post) => (
              <article
                key={post.$id}
                onClick={() => handlePostClick(post)}
                className="glass-card group cursor-pointer overflow-hidden rounded-xl hover:scale-[1.02] transition-all duration-300 flex flex-col"
              >
                <div className="relative h-44 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src =
                        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883";
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  {post.category && (
                    <span className="absolute top-3 left-3 px-2 py-1 bg-emerald-500/80 text-white text-xs font-medium rounded">
                      {post.category}
                    </span>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    <span className="flex items-center gap-1">
                      <FaCalendarAlt className="text-emerald-400" />
                      {formatDate(post.publishedAt)}
                    </span>
                    {post.readTime && (
                      <span className="flex items-center gap-1">
                        <FaClock className="text-emerald-400" />
                        {post.readTime}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {post.title}
                  </h3>

                  <p className="text-gray-400 text-sm line-clamp-3 mb-4 flex-1">
                    {post.excerpt}
                  </p>

                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded flex items-center gap-1"
                        >
                          <FaTag className="text-emerald-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center text-cyan-400 text-sm font-medium group-hover:gap-3 transition-all gap-2 mt-auto">
                    Read Article <FaArrowRight />
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FaBookOpen className="text-6xl text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No posts found
            </h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search or filter criteria
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-3 glass-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              <FaChevronLeft className="text-white" />
            </button>

            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      currentPage === page
                        ? "bg-emerald-500 text-white"
                        : "glass-card text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    {page}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-3 glass-card rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
            >
              <FaChevronRight className="text-white" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
