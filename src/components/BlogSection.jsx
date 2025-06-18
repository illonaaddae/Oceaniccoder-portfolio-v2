import React, { useState } from "react";
import { FaCalendar, FaClock, FaTag, FaArrowRight } from "react-icons/fa";
import { usePortfolio } from "../Context"; // Fixed path

const BlogSection = () => {
  const { blogs } = usePortfolio();
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", ...new Set(blogs.map((blog) => blog.category))];

  const filteredBlogs =
    selectedCategory === "All"
      ? blogs
      : blogs.filter((blog) => blog.category === selectedCategory);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getCategoryColor = (category) => {
    const colors = {
      Leadership:
        "from-purple-500/20 to-pink-500/20 text-purple-400 border-purple-500/30",
      Development:
        "from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30",
      Technology:
        "from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30",
    };
    return (
      colors[category] ||
      "from-gray-500/20 to-gray-400/20 text-gray-400 border-gray-500/30"
    );
  };

  return (
    <section
      id="blog"
      className="min-h-screen py-20 relative"
      style={{
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-32 right-16 w-80 h-80 bg-gradient-to-r from-green-500/6 to-emerald-500/8 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-32 left-16 w-72 h-72 bg-gradient-to-r from-purple-500/5 to-blue-500/7 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-green-600 via-emerald-600 to-cyan-600 dark:from-green-400 dark:via-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent">
              Latest Insights
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            Thoughts on technology, leadership, and building inclusive
            communities
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`glass-btn px-6 py-3 font-medium transition-all duration-300 ${
                selectedCategory === category
                  ? "bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {filteredBlogs.map((blog) => (
            <article key={blog.id} className="card-hover group h-full">
              <div className="glass-card overflow-hidden h-full flex flex-col">
                {/* Blog Image */}
                <div className="relative overflow-hidden">
                  <img
                    src={blog.image}
                    alt={blog.title}
                    className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                  {/* Featured Badge */}
                  {blog.featured && (
                    <div className="absolute top-4 left-4">
                      <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-3 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    </div>
                  )}

                  {/* Category Badge */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-medium border bg-gradient-to-r ${getCategoryColor(
                        blog.category
                      )}`}
                    >
                      {blog.category}
                    </span>
                  </div>
                </div>

                {/* Blog Content */}
                <div className="p-6 flex-1 flex flex-col">
                  {/* Meta Information */}
                  <div className="flex items-center justify-between mb-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <FaCalendar className="w-3 h-3" />
                      {formatDate(blog.publishedAt)}
                    </div>
                    <div className="flex items-center gap-1">
                      <FaClock className="w-3 h-3" />
                      {blog.readTime}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors duration-300 line-clamp-2">
                    {blog.title}
                  </h3>

                  {/* Excerpt */}
                  <p className="text-gray-300 text-sm mb-4 leading-relaxed flex-1 line-clamp-3">
                    {blog.excerpt}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {blog.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="text-xs bg-gradient-to-r from-gray-500/20 to-gray-400/20 text-gray-300 px-2 py-1 rounded border border-gray-500/30 flex items-center gap-1"
                      >
                        <FaTag className="w-2 h-2" />
                        {tag}
                      </span>
                    ))}
                    {blog.tags.length > 3 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
                        +{blog.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Read More Button */}
                  <button className="glass-btn bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 text-sm font-medium hover:scale-105 transition-transform duration-300 flex items-center justify-center gap-2 mt-auto">
                    Read More
                    <FaArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="glass-card p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-white mb-4">Stay Updated</h3>
            <p className="text-gray-300 mb-6">
              Subscribe to my newsletter for the latest insights on technology,
              leadership, and building inclusive communities in tech.
            </p>
            <div className="flex gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 glass-input text-sm"
              />
              <button className="glass-btn bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-2 text-sm font-medium hover:scale-105 transition-transform duration-300">
                Subscribe
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
