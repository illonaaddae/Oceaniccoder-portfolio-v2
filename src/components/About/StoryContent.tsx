import React from "react";
import { FaHeart, FaRocket } from "react-icons/fa";

const StoryContent = React.memo(() => (
  <div className="space-y-5 sm:space-y-6 lg:space-y-8">
    <div className="glass-card w-full p-4 sm:p-6 md:p-8 overflow-visible">
      <h3 className="text-heading-xl text-white mb-3 sm:mb-4 md:mb-6 flex items-center gap-2 sm:gap-3">
        <FaHeart className="text-red-400 flex-shrink-0 text-lg sm:text-xl" />
        <span>My Story</span>
      </h3>
      <div className="space-y-3 sm:space-y-4 md:space-y-6 text-gray-300 leading-relaxed">
        <p className="text-story-lg">
          I was raised{" "}
          <strong className="text-oceanic-500 text-strong">
            by two remarkable women my mother and grandmother,
          </strong>{" "}
          who taught me that strength isn't loud, it's consistent. After losing
          my father early, I learned resilience not as a choice, but as a way of
          life. That spirit shaped how I see the world: every problem is just a
          puzzle waiting for a creative solution.
        </p>
        <p className="text-story-lg">
          At{" "}
          <strong className="text-green-400 text-strong">
            Accra Technical University,
          </strong>{" "}
          I discovered technology, a language through which I could build,
          solve, and empower. I fell in love with the beauty of turning ideas
          into functional systems. From developing my first real project to
          leading teams and mentoring peers, I realized I wasn't just coding I
          was creating impact. That realization gave birth to{" "}
          <strong className="text-green-400 text-strong">SLINT Tech,</strong> a
          youth-led organization I founded to empower the next generation of
          African innovators. It's more than a tech community; it's a leadership
          movement where we learn, build, and give back.
        </p>
        <p className="text-story-lg">
          Under my personal brand,{" "}
          <strong className="text-oceanic-500 text-strong">Oceaniccoder, </strong>{" "}
          I'm a constantly evolving developer, designer, and leader driven by
          purpose and curiosity. Whether I'm coding, designing a user
          experience, or mentoring someone new to tech, I build with empathy,
          intention, and vision. My journey isn't just about writing code. It's
          about writing change. One project, one person, one purpose at a time.
        </p>
      </div>

      {/* Enhanced Quote */}
      <div className="mt-4 sm:mt-6 md:mt-8 p-3 sm:p-4 md:p-6 bg-gradient-to-r from-oceanic-500/10 to-blue-500/10 rounded-xl border border-oceanic-500/20">
        <blockquote className="text-oceanic-500 quote-text text-sm sm:text-base leading-relaxed">
          "In a society where women are often underestimated, I am determined to
          shift the conversation. Technology is for everyone, gender, wealth, or
          background should never limit one's potential to innovate and
          succeed."
        </blockquote>
        <cite className="text-caption text-gray-400 mt-2 block text-xs sm:text-sm">
          — Illona Addae
        </cite>
      </div>
    </div>

    {/* Mission Statement */}
    <div className="glass-card w-full p-4 sm:p-6 md:p-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 overflow-visible">
      <h3 className="text-heading-lg text-white mb-2 sm:mb-3 md:mb-4 flex items-center gap-2 sm:gap-3">
        <FaRocket className="text-purple-400 flex-shrink-0 text-base sm:text-lg" />
        <span>Mission Statement</span>
      </h3>
      <p className="text-gray-300 text-story-lg">
        To create a tech ecosystem where talent thrives regardless of gender,
        background, or circumstance. Through education, mentorship, and
        community building, I'm working to ensure that the next generation of
        technologists reflects the diversity of our world.
      </p>
    </div>
  </div>
));

StoryContent.displayName = "StoryContent";
export default StoryContent;
