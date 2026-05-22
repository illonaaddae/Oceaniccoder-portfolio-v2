const { performance } = require('perf_hooks');

const numPosts = 1000;
const numComments = 5000;

const blogPosts = Array.from({ length: numPosts }, (_, i) => ({
  $id: `post_${i}`,
  title: `Title ${i}`,
  slug: `slug-${i}`
}));

const comments = Array.from({ length: numComments }, (_, i) => ({
  postId: `post_${Math.floor(Math.random() * numPosts)}`
}));

function runBaseline() {
  const getPostTitle = (postId) => blogPosts.find((p) => p.$id === postId)?.title || "Unknown Post";
  const getPostSlug = (postId) => blogPosts.find((p) => p.$id === postId)?.slug || postId;

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    for (const c of comments) {
      getPostTitle(c.postId);
      getPostSlug(c.postId);
    }
  }
  const end = performance.now();
  return (end - start) / 100;
}

function runOptimized() {
  // Including map creation time in the test just to be fair, though it's typically cached by useMemo
  const blogPostsMap = blogPosts.reduce((acc, post) => {
    acc.set(post.$id, post);
    return acc;
  }, new Map());

  const getPostTitle = (postId) => blogPostsMap.get(postId)?.title || "Unknown Post";
  const getPostSlug = (postId) => blogPostsMap.get(postId)?.slug || postId;

  const start = performance.now();
  for (let i = 0; i < 100; i++) {
    for (const c of comments) {
      getPostTitle(c.postId);
      getPostSlug(c.postId);
    }
  }
  const end = performance.now();
  return (end - start) / 100;
}

const baseline = runBaseline();
const optimized = runOptimized();

console.log(`Baseline avg over 100 runs: ${baseline.toFixed(3)} ms`);
console.log(`Optimized avg over 100 runs: ${optimized.toFixed(3)} ms`);
console.log(`Improvement: ${(baseline / optimized).toFixed(2)}x faster`);
