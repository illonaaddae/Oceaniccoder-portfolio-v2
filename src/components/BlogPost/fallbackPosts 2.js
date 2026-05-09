// Fallback blog posts data — used when Appwrite posts haven't loaded yet.
// This is a pure-data file; line count reflects blog content, not logic.

export const fallbackPosts = [
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

Happy coding!`,
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

Now go create something beautiful!`,
    category: "Development",
    tags: ["CSS", "UI Design", "Frontend", "Tutorial"],
    publishedAt: "2024-12-20",
    readTime: "4 min read",
    image:
      "https://fra.cloud.appwrite.io/v1/storage/buckets/69444749001b5f3a325b/files/69444cef000da2150f34/view?project=6943431e00253c8f9883",
    featured: false,
  },
];
