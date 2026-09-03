import React, { useEffect, useMemo, useState } from "react";
import { FaBookReader } from "react-icons/fa";
import { getAllBlogViewStats } from "@/services/api/blogViews";
import { getBlogPosts } from "@/services/api/blog";
import { formatCount, pluralize } from "@/utils/formatCount";
import type { BlogPost, BlogViewStats } from "@/types";

interface Props {
  theme: "light" | "dark";
}

interface RankedPost {
  id: string;
  title: string;
  readers: number;
  reads: number;
}

const TOP_POSTS = 5;

/**
 * Blog readership: totals across every post plus the ranking that answers
 * "which posts are actually being read". Readers is the primary number
 * everywhere — reads only says how often the same people came back.
 */
export const BlogReadershipSection: React.FC<Props> = ({ theme }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [stats, setStats] = useState<Record<string, BlogViewStats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([getBlogPosts(), getAllBlogViewStats()])
      .then(([allPosts, viewStats]) => {
        if (!active) return;
        setPosts(allPosts);
        setStats(viewStats);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const { totalReaders, totalReads, avgReaders, ranked } = useMemo(() => {
    const rows: RankedPost[] = posts.map((post) => ({
      id: post.$id,
      title: post.title,
      readers: stats[post.$id]?.readers ?? 0,
      reads: stats[post.$id]?.reads ?? 0,
    }));

    const readers = rows.reduce((sum, r) => sum + r.readers, 0);
    const reads = rows.reduce((sum, r) => sum + r.reads, 0);

    return {
      totalReaders: readers,
      totalReads: reads,
      avgReaders: rows.length > 0 ? Math.round(readers / rows.length) : 0,
      ranked: [...rows].sort((a, b) => b.readers - a.readers || b.reads - a.reads),
    };
  }, [posts, stats]);

  const top = ranked.slice(0, TOP_POSTS);
  const busiest = top[0]?.readers ?? 0;
  const muted = theme === "dark" ? "text-slate-400" : "text-slate-500";
  const strong = theme === "dark" ? "text-white" : "text-slate-900";

  return (
    <div className="glass-card p-6">
      <div className="mb-5">
        <h3 className={`text-lg font-bold flex items-center gap-2 ${strong}`}>
          <FaBookReader className="text-brand-link dark:text-oceanic-400" />
          Blog Readership
        </h3>
        <p className={`mt-1 text-sm ${muted}`}>
          Unique readers per post, and how often they come back. A refresh by the same person counts
          as a read, not a new reader.
        </p>
      </div>

      {loading ? (
        <p className={muted}>Loading readership…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              { label: "Unique readers", value: totalReaders },
              { label: "Total reads", value: totalReads },
              { label: "Avg readers / post", value: avgReaders },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`rounded-xl border p-4 ${
                  theme === "dark"
                    ? "border-white/10 bg-white/5"
                    : "border-oceanic-200/40 bg-white/50"
                }`}
              >
                <p className={`text-2xl font-bold ${strong}`}>{formatCount(stat.value)}</p>
                <p className={`text-xs mt-1 ${muted}`}>{stat.label}</p>
              </div>
            ))}
          </div>

          <h4 className={`text-sm font-bold mb-3 ${strong}`}>Most read posts</h4>
          {top.length === 0 || busiest === 0 ? (
            <p className={`text-sm ${muted}`}>
              No reads recorded yet. Counts start the moment someone opens a post.
            </p>
          ) : (
            <ol className="space-y-3">
              {top.map((post, index) => (
                <li key={post.id}>
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span className={`text-sm truncate ${strong}`}>
                      <span className={`font-mono text-xs mr-2 ${muted}`}>{index + 1}.</span>
                      {post.title}
                    </span>
                    <span className={`text-xs whitespace-nowrap ${muted}`}>
                      {formatCount(post.readers)} {pluralize(post.readers, "reader")}
                      {post.reads > post.readers && ` · ${formatCount(post.reads)} reads`}
                    </span>
                  </div>
                  <div
                    className={`h-1.5 rounded-full overflow-hidden ${
                      theme === "dark" ? "bg-white/10" : "bg-slate-200"
                    }`}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-oceanic-600 to-oceanic-400"
                      style={{ width: `${Math.max(4, (post.readers / busiest) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
};

export default BlogReadershipSection;
