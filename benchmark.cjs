const { performance } = require('perf_hooks');

const blogPosts = Array.from({ length: 1000 }, (_, i) => ({
  $id: `post_${i}`,
  title: `Post ${i}`,
  slug: `post-${i}`
}));

const comments = Array.from({ length: 5000 }, (_, i) => ({
  postId: `post_${i % 1000}`
}));

function before() {
  const getPostTitle = (postId) => blogPosts.find((p) => p.$id === postId)?.title || "Unknown Post";
  const getPostSlug = (postId) => blogPosts.find((p) => p.$id === postId)?.slug || postId;

  for (const comment of comments) {
    getPostTitle(comment.postId);
    getPostSlug(comment.postId);
  }
}

function after() {
  const blogPostMap = new Map();
  for (const post of blogPosts) {
    blogPostMap.set(post.$id, post);
  }

  const getPostTitle = (postId) => blogPostMap.get(postId)?.title || "Unknown Post";
  const getPostSlug = (postId) => blogPostMap.get(postId)?.slug || postId;

  for (const comment of comments) {
    getPostTitle(comment.postId);
    getPostSlug(comment.postId);
  }
}

const start1 = performance.now();
for (let i = 0; i < 100; i++) before();
const end1 = performance.now();
console.log(`Before: ${(end1 - start1).toFixed(2)}ms`);

const start2 = performance.now();
for (let i = 0; i < 100; i++) after();
const end2 = performance.now();
console.log(`After: ${(end2 - start2).toFixed(2)}ms`);
console.log(`Improvement: ${((end1 - start1) / (end2 - start2)).toFixed(2)}x faster`);
