import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaClock,
  FaTag,
  FaShare,
  FaTwitter,
  FaLinkedin,
  FaFacebook,
  FaLink,
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaCopy,
  FaCheck,
  FaThumbsUp,
  FaThumbsDown,
  FaRegThumbsUp,
  FaRegThumbsDown,
} from "react-icons/fa";
import { usePortfolioData } from "../hooks/usePortfolioData";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
// Use CJS imports to avoid dynamic import issues
import oneDark from "react-syntax-highlighter/dist/cjs/styles/prism/one-dark";
import oneLight from "react-syntax-highlighter/dist/cjs/styles/prism/one-light";
import {
  getPostReactions,
  getVisitorReaction,
  addReaction,
} from "../services/api";
import { LazyImage } from "./ui/LazyImage";
import BlogComments from "./BlogComments";

// Generate or retrieve visitor ID for tracking reactions
const getVisitorId = () => {
  let visitorId = localStorage.getItem("blog_visitor_id");
  if (!visitorId) {
    visitorId =
      "visitor_" +
      Math.random().toString(36).substring(2, 15) +
      Date.now().toString(36);
    localStorage.setItem("blog_visitor_id", visitorId);
  }
  return visitorId;
};

// Code Block component with copy functionality
const CodeBlock = ({ language, children, isDark }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(String(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative group my-6">
      {/* Language badge */}
      {language && (
        <div
          className={`absolute top-0 left-4 -translate-y-1/2 px-3 py-1 text-xs font-medium rounded-full border ${
            isDark
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
              : "bg-emerald-100 text-emerald-700 border-emerald-300"
          }`}
        >
          {language}
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`absolute top-3 right-3 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
          isDark
            ? "bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white"
            : "bg-black/5 hover:bg-black/10 text-gray-500 hover:text-gray-800"
        }`}
        title="Copy code"
      >
        {copied ? (
          <FaCheck className="text-emerald-500" />
        ) : (
          <FaCopy className="text-sm" />
        )}
      </button>

      <SyntaxHighlighter
        style={isDark ? oneDark : oneLight}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.75rem",
          padding: "1.5rem 1rem",
          paddingTop: language ? "2rem" : "1.5rem",
          fontSize: "0.875rem",
          background: isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(249, 250, 251, 1)",
          border: isDark
            ? "1px solid rgba(255, 255, 255, 0.1)"
            : "1px solid rgba(0, 0, 0, 0.1)",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          },
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  );
};

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { blogPosts, loading } = usePortfolioData();

  // Track theme state with MutationObserver for real-time updates
  const [isDark, setIsDark] = useState(true); // Default to dark

  // Initialize theme on mount and listen for changes
  useEffect(() => {
    // Set initial theme
    setIsDark(document.documentElement.classList.contains("dark"));

    // Listen for theme changes on the HTML element
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDark(document.documentElement.classList.contains("dark"));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  const [post, setPost] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [postNotFound, setPostNotFound] = useState(false);

  // Reactions state
  const [reactions, setReactions] = useState({ likes: 0, dislikes: 0 });
  const [userReaction, setUserReaction] = useState(null); // 'like', 'dislike', or null
  const [reactionLoading, setReactionLoading] = useState(false);

  // Fallback posts matching BlogSection
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

When I first started learning web development, I was overwhelmed by the choices. Vanilla JavaScript felt limiting for complex apps, and jQuery seemed dated. Then I discovered React, and everything clicked.

## Key Concepts I Mastered

### 1. Components - The Building Blocks

Components are the heart of React. Think of them as custom HTML elements that encapsulate their own logic and styling.

\`\`\`jsx
function WelcomeCard({ name, role }) {
  return (
    <div className="card">
      <h2>Hello, {name}!</h2>
      <p>You are a {role}</p>
    </div>
  );
}
\`\`\`

### 2. Props - Data Flow

Props are how components communicate. Data flows down from parent to child, making your app predictable and easy to debug.

### 3. State - Dynamic Data

State is what makes your app interactive. When state changes, React efficiently updates only what needs to change.

\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`

### 4. Hooks - Modern React

Hooks revolutionized React. useState, useEffect, useContext - they let you use state and other React features without writing classes.

## My Learning Journey

I started with the official React documentation, which is excellent. Then I built small projects:

1. **A todo app** - Classic but effective for learning state
2. **A weather app** - Great for learning API calls
3. **This portfolio** - Putting it all together

## Advice for Beginners

1. **Start small** - Don't try to build Facebook on day one
2. **Read the docs** - React's documentation is among the best
3. **Build projects** - Theory only gets you so far
4. **Join communities** - The React community is welcoming and helpful
5. **Be patient** - It takes time, and that's okay

## What's Next?

I'm now diving into Next.js and TypeScript. The learning never stops, and that's what makes this field exciting.

Happy coding! 🚀`,
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

In a society where women are often underestimated, I am determined to shift the conversation and demonstrate what's possible when determination meets opportunity.

## The Current Landscape

The numbers tell a sobering story:

- Women hold only **25%** of computing jobs
- Only **5%** of tech startups are founded by women
- Women occupy just **11%** of executive positions in Silicon Valley

But statistics don't define our potential. They highlight the opportunity for change.

## My Experience

When I first entered the tech world, I was often the only woman in the room. I faced subtle biases and sometimes not-so-subtle ones. Questions about my technical abilities that my male peers never received. Being talked over in meetings. Having my ideas repeated by others and then credited to them.

But I also found allies, mentors, and a community of incredible women who paved the way before me.

## Creating Change

Change doesn't happen by accident. It requires intentional action:

### For Organizations

1. **Audit your hiring process** - Remove bias from job descriptions and interviews
2. **Create mentorship programs** - Connect emerging talent with established leaders
3. **Establish clear advancement paths** - Make promotions transparent and equitable
4. **Foster inclusive culture** - It's not enough to hire diverse talent; you must retain them

### For Individuals

1. **Speak up** - Your voice matters
2. **Support others** - Lift as you climb
3. **Find your community** - You don't have to do this alone
4. **Document your achievements** - Don't let your work go unnoticed

## Role Models Who Inspire Me

- **Dr. Fei-Fei Li** - AI pioneer and advocate for diversity in tech
- **Reshma Saujani** - Founder of Girls Who Code
- **Kimberly Bryant** - Founder of Black Girls CODE
- **Megan Smith** - Former U.S. CTO and tech visionary

## My Mission

I believe in a world where:

- Opportunities are equal
- Dreams are boundless
- Success is driven by determination, not demographics

Every line of code I write, every community I build, every person I mentor is a step toward that world.

## Join the Movement

The future of tech is diverse. It has to be. The problems we're solving are too important to be tackled by only a fraction of humanity's talent.

Whether you're just starting your journey or you're an established leader, there's a role for you in this movement. 

**Let's build the future together.**`,
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

Creating a tech community that truly welcomes everyone takes intentional effort and consistent dedication. Here's what I've learned from building communities from the ground up.

## Start With Why

Before you write a single line of code or send a single invite, ask yourself:

- **Why does this community need to exist?**
- **What gap are you filling?**
- **Who are you trying to serve?**

The clearer your purpose, the easier every other decision becomes.

## Key Principles for Inclusive Communities

### 1. Accessibility First

Accessibility isn't an afterthought—it's a foundation.

- **Physical accessibility** - Choose venues that work for everyone
- **Financial accessibility** - Keep events free or low-cost when possible
- **Schedule accessibility** - Consider different time zones and work schedules
- **Content accessibility** - Provide captions, transcripts, and alternative formats

### 2. Mentorship at the Core

Every community member is on a journey. Create structures that connect:

- **Newcomers with experienced members**
- **Job seekers with hiring managers**
- **Idea-havers with implementers**

### 3. Safe Spaces for Questions

The fastest way to kill a community is to make people feel stupid for asking questions.

- Establish a strong code of conduct
- Model vulnerability by asking questions yourself
- Celebrate "beginner" questions as much as advanced ones

### 4. Diverse Leadership

Your leadership team should reflect the community you want to build. If all your organizers look the same, you're sending a message about who belongs.

## Practical Tips

### Getting Started

1. **Start small** - 5 engaged members beats 500 lurkers
2. **Be consistent** - Regular events build trust
3. **Listen more than you speak** - Let the community shape itself

### Growing Sustainably

1. **Delegate** - You can't do everything alone
2. **Document** - Create processes that others can follow
3. **Celebrate** - Recognize contributions publicly

### Handling Conflict

1. **Have clear policies** - Before you need them
2. **Act quickly** - Toxicity spreads fast
3. **Be transparent** - Explain your decisions

## Measuring Success

Success isn't just about numbers. Ask yourself:

- Do members feel like they belong?
- Are people making genuine connections?
- Is the community helping people achieve their goals?
- Would you want to be a member of your own community?

## The Ripple Effect

The most beautiful thing about community building is the ripple effect. One person you help today might help a hundred people tomorrow.

That's the real measure of impact.

## Final Thoughts

Building an inclusive community is hard work. It requires patience, empathy, and a willingness to constantly learn and adapt.

But when you see someone land their first job because of a connection they made in your community, or watch a nervous newcomer become a confident contributor—that's when you know it's worth it.

**Let's build communities that change lives.**`,
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

Glass morphism has taken the design world by storm, creating a frosted glass effect that adds depth and elegance to modern interfaces. Let's dive into how to create this effect with pure CSS.

## What is Glass Morphism?

Glass morphism (or "glassmorphism") is a design trend characterized by:

- Semi-transparent backgrounds
- Blur effects that show through to the content behind
- Subtle borders that catch light
- A sense of depth without harsh shadows

Think of it like looking through frosted glass.

## The Core CSS Properties

Here's the magic formula:

\`\`\`css
.glass-card {
  /* Semi-transparent background */
  background: rgba(255, 255, 255, 0.1);
  
  /* The blur effect - this is the key! */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  /* Subtle border for that glass edge */
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  /* Rounded corners look more natural */
  border-radius: 16px;
  
  /* Optional: subtle shadow for depth */
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
}
\`\`\`

## Step-by-Step Tutorial

### Step 1: Create the Background

Glass morphism works best over colorful or gradient backgrounds:

\`\`\`css
body {
  background: linear-gradient(
    135deg,
    #1a1a2e 0%,
    #16213e 50%,
    #0f3460 100%
  );
  min-height: 100vh;
}
\`\`\`

### Step 2: Build the Card

\`\`\`html
<div class="glass-card">
  <h2>Beautiful Glass Effect</h2>
  <p>This card has a stunning glass morphism effect.</p>
</div>
\`\`\`

### Step 3: Apply the Glass Effect

\`\`\`css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 2rem;
  color: white;
}
\`\`\`

## Best Practices

### 1. Contrast is Key

Ensure text remains readable against the blurred background. White or light text on dark glass usually works well.

### 2. Don't Overdo the Blur

A blur of 10-20px is usually sufficient. Too much blur loses the glass effect and can hurt performance.

### 3. Layer Your Elements

Glass morphism shines when you have multiple layers. The background, the glass element, and the content all work together.

### 4. Consider Browser Support

\`backdrop-filter\` isn't supported in all browsers. Always include a fallback:

\`\`\`css
@supports not (backdrop-filter: blur(10px)) {
  .glass-card {
    background: rgba(30, 30, 30, 0.95);
  }
}
\`\`\`

## Performance Considerations

Blur effects can be expensive. Keep in mind:

- Limit the number of glass elements on screen
- Use will-change sparingly
- Test on lower-end devices

## Real-World Examples

Glass morphism is used in:

- **Apple's macOS Big Sur** - Control Center and notifications
- **Windows 11** - Start menu and widgets
- **Modern web apps** - Cards, modals, and navigation

## Conclusion

Glass morphism, when used thoughtfully, creates interfaces that feel modern, elegant, and dimensional. The key is subtlety—let the effect enhance your design without overwhelming it.

Now go create something beautiful! ✨`,
      category: "Development",
      tags: ["CSS", "UI Design", "Frontend", "Tutorial"],
      publishedAt: "2024-12-20",
      readTime: "4 min read",
      image:
        "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883",
      featured: false,
    },
  ];

  // Memoize allPosts to prevent unnecessary re-renders
  const allPosts = useMemo(() => {
    return blogPosts && blogPosts.length > 0 ? blogPosts : fallbackPosts;
  }, [blogPosts]);

  useEffect(() => {
    // Don't search while still loading
    if (loading) return;

    const foundPost = allPosts.find((p) => p.slug === slug || p.$id === slug);

    if (foundPost) {
      setPost(foundPost);
      setPostNotFound(false);

      // Find related posts (same category, excluding current)
      const related = allPosts
        .filter(
          (p) =>
            p.$id !== foundPost.$id &&
            (p.category === foundPost.category ||
              p.tags?.some((t) => foundPost.tags?.includes(t)))
        )
        .slice(0, 3);
      setRelatedPosts(related);
    } else {
      setPost(null);
      setPostNotFound(true);
    }
  }, [slug, allPosts, loading]);

  // Load reactions for the current post
  const loadReactions = useCallback(async () => {
    if (!post?.$id) return;

    try {
      const [reactionsData, visitorReaction] = await Promise.all([
        getPostReactions(post.$id),
        getVisitorReaction(post.$id, getVisitorId()),
      ]);

      setReactions(reactionsData);
      setUserReaction(visitorReaction?.reaction || null);
    } catch (error) {
      console.error("Error loading reactions:", error);
    }
  }, [post?.$id]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  // Handle reaction click
  const handleReaction = async (reactionType) => {
    if (reactionLoading || !post?.$id) {
      return;
    }

    setReactionLoading(true);
    const visitorId = getVisitorId();

    // Optimistically update UI first for better UX
    const previousReaction = userReaction;
    const previousReactions = { ...reactions };

    if (userReaction === reactionType) {
      // Toggle off - removing reaction
      setUserReaction(null);
      setReactions((prev) => ({
        ...prev,
        [reactionType === "like" ? "likes" : "dislikes"]: Math.max(
          0,
          prev[reactionType === "like" ? "likes" : "dislikes"] - 1
        ),
      }));
    } else {
      // Adding or switching reaction
      if (userReaction) {
        // Switching from opposite reaction
        setReactions((prev) => ({
          likes:
            reactionType === "like"
              ? prev.likes + 1
              : Math.max(0, prev.likes - 1),
          dislikes:
            reactionType === "dislike"
              ? prev.dislikes + 1
              : Math.max(0, prev.dislikes - 1),
        }));
      } else {
        // New reaction
        setReactions((prev) => ({
          ...prev,
          [reactionType === "like" ? "likes" : "dislikes"]:
            prev[reactionType === "like" ? "likes" : "dislikes"] + 1,
        }));
      }
      setUserReaction(reactionType);
    }

    try {
      await addReaction(post.$id, visitorId, reactionType);
    } catch (error) {
      console.error("Error adding reaction:", error);
      // Revert optimistic update on error
      setUserReaction(previousReaction);
      setReactions(previousReactions);
    } finally {
      setReactionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const title = post?.title || "";

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        url
      )}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`,
    };

    if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      window.open(shareUrls[platform], "_blank", "width=600,height=400");
    }
    setShowShareMenu(false);
  };

  // Get current post index for navigation
  const currentIndex = allPosts.findIndex(
    (p) => p.slug === slug || p.$id === slug
  );
  const prevPost = currentIndex > 0 ? allPosts[currentIndex - 1] : null;
  const nextPost =
    currentIndex < allPosts.length - 1 ? allPosts[currentIndex + 1] : null;

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
          <p className="text-gray-400">Loading post...</p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section
        className="min-h-screen pt-28 pb-20 flex items-center justify-center"
        style={{
          background:
            "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 50%, var(--bg-secondary) 100%)",
        }}
      >
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Post Not Found</h1>
          <p className="text-gray-400 mb-8">
            The blog post you're looking for doesn't exist.
          </p>
          <Link
            to="/blog"
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors inline-flex items-center gap-2"
          >
            <FaArrowLeft /> Back to Blog
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
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

      <div className="container mx-auto px-4 sm:px-6 relative z-10 max-w-4xl">
        {/* Back button */}
        <button
          onClick={() => navigate("/blog")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <FaArrowLeft /> Back to Blog
        </button>

        {/* Article Header */}
        <header className="mb-8">
          {/* Category */}
          {post.category && (
            <span className="inline-block px-3 py-1 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-full mb-4">
              {post.category}
            </span>
          )}

          {/* Title */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            {post.title}
          </h1>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-gray-400 mb-6">
            <span className="flex items-center gap-2">
              <FaCalendarAlt className="text-emerald-400" />
              {formatDate(post.publishedAt)}
            </span>
            {post.readTime && (
              <span className="flex items-center gap-2">
                <FaClock className="text-emerald-400" />
                {post.readTime}
              </span>
            )}
            {/* Share button */}
            <div className="relative ml-auto">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <FaShare /> Share
              </button>

              {showShareMenu && (
                <div className="absolute right-0 top-full mt-2 glass-card rounded-lg p-2 min-w-[150px] z-20">
                  <button
                    onClick={() => handleShare("twitter")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <FaTwitter className="text-blue-400" /> Twitter
                  </button>
                  <button
                    onClick={() => handleShare("linkedin")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <FaLinkedin className="text-blue-500" /> LinkedIn
                  </button>
                  <button
                    onClick={() => handleShare("facebook")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <FaFacebook className="text-blue-600" /> Facebook
                  </button>
                  <button
                    onClick={() => handleShare("copy")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
                  >
                    <FaLink className="text-emerald-400" />
                    {copied ? "Copied!" : "Copy Link"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-white/5 text-gray-400 text-sm rounded-full flex items-center gap-1"
                >
                  <FaTag className="text-emerald-400 text-xs" /> {tag}
                </span>
              ))}
            </div>
          )}
        </header>

        {/* Featured Image */}
        {post.image && (
          <div className="relative h-64 md:h-96 lg:h-[450px] rounded-2xl overflow-hidden mb-10">
            <LazyImage
              src={post.image}
              alt={post.title}
              className="w-full h-full"
              placeholderColor="from-emerald-900/30 to-slate-900"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        )}

        {/* Article Content */}
        <article
          className={`prose prose-lg max-w-none mb-16 ${
            isDark ? "prose-invert" : ""
          }`}
        >
          <div
            className={`p-6 md:p-10 rounded-2xl ${
              isDark
                ? "glass-card"
                : "bg-white shadow-lg border border-gray-200"
            }`}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => (
                  <h1
                    className={`text-3xl font-bold mt-8 mb-4 first:mt-0 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2
                    className={`text-2xl font-bold mt-8 mb-4 pb-2 border-b ${
                      isDark
                        ? "text-white border-white/10"
                        : "text-gray-900 border-gray-200"
                    }`}
                  >
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3
                    className={`text-xl font-bold mt-6 mb-3 ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p
                    className={`leading-relaxed mb-4 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul
                    className={`list-disc list-inside mb-4 space-y-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    className={`list-decimal list-inside mb-4 space-y-2 ${
                      isDark ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className={isDark ? "text-gray-300" : "text-gray-700"}>
                    {children}
                  </li>
                ),
                strong: ({ children }) => (
                  <strong
                    className={`font-semibold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em
                    className={isDark ? "text-emerald-400" : "text-emerald-600"}
                  >
                    {children}
                  </em>
                ),
                blockquote: ({ children }) => (
                  <blockquote
                    className={`border-l-4 border-emerald-500 pl-4 italic my-4 ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    {children}
                  </blockquote>
                ),
                code(props) {
                  const { children, className, node, ...rest } = props;
                  // Check if it's inline code or a code block
                  const isInline =
                    !className && !String(children).includes("\n");

                  // Extract language from className (e.g., "language-javascript")
                  const match = /language-(\w+)/.exec(className || "");
                  let language = match ? match[1] : "";

                  // Auto-detect common languages if not specified
                  if (!language && !isInline) {
                    const code = String(children);
                    if (
                      code.includes("import ") ||
                      code.includes("export ") ||
                      code.includes("const ") ||
                      code.includes("function ")
                    ) {
                      language = "javascript";
                    } else if (
                      code.includes("def ") ||
                      code.includes("print(") ||
                      code.includes("import ")
                    ) {
                      language = "python";
                    } else if (
                      code.includes("<html") ||
                      code.includes("<div") ||
                      code.includes("</")
                    ) {
                      language = "html";
                    } else if (
                      code.includes("{") &&
                      code.includes(":") &&
                      code.includes(";")
                    ) {
                      language = "css";
                    }
                  }

                  return !isInline ? (
                    <CodeBlock language={language} isDark={isDark}>
                      {children}
                    </CodeBlock>
                  ) : (
                    <code
                      className={`px-2 py-0.5 rounded text-sm font-mono ${
                        isDark
                          ? "bg-white/10 text-emerald-400"
                          : "bg-gray-100 text-emerald-600"
                      }`}
                      {...rest}
                    >
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    className={`underline ${
                      isDark
                        ? "text-cyan-400 hover:text-cyan-300"
                        : "text-cyan-600 hover:text-cyan-700"
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {/* Normalize markdown content - replace smart quotes, HTML entities, and ensure proper line breaks */}
              {
                post.content
                  ?.replace(/[\u2018\u2019]/g, "'") // Replace smart single quotes
                  ?.replace(/[\u201C\u201D]/g, '"') // Replace smart double quotes
                  ?.replace(/\r\n/g, "\n") // Normalize line endings
                  ?.replace(/\\n/g, "\n") // Replace literal \n with newline
                  ?.replace(/&ast;/g, "*") // Replace HTML entity asterisks
                  ?.replace(/&#42;/g, "*") // Replace numeric entity asterisks
                  ?.replace(/\\\*/g, "*") // Replace escaped asterisks
              }
            </ReactMarkdown>
          </div>
        </article>

        {/* Reactions Section */}
        <div className="glass-card p-6 rounded-2xl mb-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-white mb-1">
                Did you find this article helpful?
              </h3>
              <p className="text-gray-400 text-sm">
                Let me know your thoughts!
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Like Button */}
              <button
                type="button"
                onClick={() => handleReaction("like")}
                disabled={reactionLoading}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer select-none ${
                  userReaction === "like"
                    ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 scale-105"
                    : "bg-white/5 text-gray-300 border border-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:border-emerald-500/30 hover:scale-105"
                } ${reactionLoading ? "opacity-50 cursor-wait" : ""}`}
              >
                {userReaction === "like" ? (
                  <FaThumbsUp className="text-lg" />
                ) : (
                  <FaRegThumbsUp className="text-lg" />
                )}
                <span className="font-bold">{reactions.likes}</span>
              </button>

              {/* Dislike Button */}
              <button
                type="button"
                onClick={() => handleReaction("dislike")}
                disabled={reactionLoading}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 cursor-pointer select-none ${
                  userReaction === "dislike"
                    ? "bg-red-500/30 text-red-400 border border-red-500/50 scale-105"
                    : "bg-white/5 text-gray-300 border border-white/10 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30 hover:scale-105"
                } ${reactionLoading ? "opacity-50 cursor-wait" : ""}`}
              >
                {userReaction === "dislike" ? (
                  <FaThumbsDown className="text-lg" />
                ) : (
                  <FaRegThumbsDown className="text-lg" />
                )}
                <span className="font-bold">{reactions.dislikes}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <BlogComments postId={post.$id} isDark={true} />

        {/* Post Navigation */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          {prevPost ? (
            <Link
              to={`/blog/${prevPost.slug || prevPost.$id}`}
              className="flex-1 glass-card p-4 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                <FaChevronLeft /> Previous Post
              </div>
              <h4 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-1">
                {prevPost.title}
              </h4>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}

          {nextPost ? (
            <Link
              to={`/blog/${nextPost.slug || nextPost.$id}`}
              className="flex-1 glass-card p-4 rounded-xl hover:bg-white/5 transition-colors group text-right"
            >
              <div className="flex items-center justify-end gap-2 text-gray-400 text-sm mb-2">
                Next Post <FaChevronRight />
              </div>
              <h4 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-1">
                {nextPost.title}
              </h4>
            </Link>
          ) : (
            <div className="flex-1"></div>
          )}
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              Related Posts
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.$id}
                  to={`/blog/${relatedPost.slug || relatedPost.$id}`}
                  className="glass-card group overflow-hidden rounded-xl hover:scale-[1.02] transition-all duration-300"
                >
                  <div className="relative h-32 overflow-hidden">
                    <LazyImage
                      src={relatedPost.image}
                      alt={relatedPost.title}
                      className="w-full h-full group-hover:scale-110 transition-transform duration-500"
                      placeholderColor="from-emerald-900/30 to-slate-900"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  </div>
                  <div className="p-4">
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-gray-400 text-sm mt-2">
                      {relatedPost.readTime}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogPost;
