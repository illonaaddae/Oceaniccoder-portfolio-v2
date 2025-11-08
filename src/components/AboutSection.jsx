import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaCode,
  FaHeart,
  FaUsers,
  FaMicrophone,
  FaStar,
  FaGraduationCap,
  FaAward,
  FaLightbulb,
  FaRocket,
  FaCertificate,
  FaDownload,
  FaMapMarkerAlt,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaPlay,
} from "react-icons/fa";

const AboutSection = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("story");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Image gallery data
  const galleryImages = [
    {
      src: "/images/Headshot.webp",
      alt: "Professional headshot of Illona, looking confident and composed, representing her current journey as a developer, leader, and creative thinker.",
      caption: "Focused. Growing. Aligned with purpose.",
    },
    {
      src: "/images/Best-Female-Student-In-STEM.webp",
      alt: "Illona Best Student In STEM award",
      caption:
        "Awarded Best Student in STEM under ATU SRC IDEAL WOMAN AWARDS 2023",
    },
    {

      src: "/images/Campus-Random-pic.webp",
      alt: "Candid photo of Illona standing casually on campus in front of an auditorium, relaxed and natural.",
      caption: "Just me - grounded, present, becoming.",
    },
    {
      src: "/images/Outstanding-student.webp",
      alt: "Tech conference",
      caption:
        "Excellence recognized Outstanding Student Of the Year, ATU CPS Level 100.",
    },
    {
      src: "/images/Akwaba-night.webp",
      alt: "Illona performing on stage at the university Aquaponite event, expressing confidence and artistic openness.",
      caption:
        "The courage to show upn- even before I understood where I was headed",
    },
    {
      src: "/images/Pagentry.webp",
      alt: "Illona in a pageantry gown, smiling confidently. A moment from her early journey before discovering her deeper calling in tech and leadership.",
      caption:
        "Before I found my direction, I was still learning who I could become.",
    },
  ];

  const stats = [
    {
      icon: <FaCode />,
      number: "15+",
      label: "Projects Completed",
      color: "text-cyan-400",
    },
    {
      icon: <FaUsers />,
      number: "40+",
      label: "Students Mentored",
      color: "text-green-400",
    },
    {
      icon: <FaMicrophone />,
      number: "2+",
      label: "Tech Talks Given",
      color: "text-purple-400",
    },
    {
      icon: <FaStar />,
      number: "2+",
      label: "Years Experience",
      color: "text-orange-400",
    },
  ];

  const values = [
    {
      icon: <FaHeart className="text-red-400" />,
      title: "Passion for Technology",
      description:
        "Driven by the transformative power of technology to create positive change in communities worldwide.",
      impact: "Led 15+ successful projects that transformed user experiences",
    },
    {
      icon: <FaUsers className="text-blue-400" />,
      title: "Inclusive Leadership",
      description:
        "Building diverse tech communities where everyone, regardless of background or gender, can thrive and succeed.",
      impact: "Mentored 100+ students, with 80% career advancement rate",
    },
    {
      icon: <FaLightbulb className="text-yellow-400" />,
      title: "Innovation & Problem-Solving",
      description:
        "Approaching challenges with creative solutions and cutting-edge technologies to deliver exceptional results.",
      impact: "Reduced development time by 40% through innovative workflows",
    },
    {
      icon: <FaGraduationCap className="text-green-400" />,
      title: "Continuous Learning",
      description:
        "Committed to staying at the forefront of technology while sharing knowledge with the next generation.",
      impact: "Completed 10+ certifications in emerging technologies",
    },
  ];

  const education = [
    {
      institution: "Accra Technical University",
      degree: "Bachelor of Technology (BTech) in Computer Science",
      period: "2025 - Present",
      achievement: "N/A",
      description:
        " Specializing in Software Engineering, Cloud Computing, Artificial Intelligence and Machine Learning ",
      icon: <FaGraduationCap className="text-blue-400" />,
    },
    {
      institution: "Accra Technical University",
      degree: "Higher National Diploma (HND) in Computer Science",
      period: "2023 - 2025",
      achievement: "First Class Honours",
      description:
        "Specialized in Software Engineering, Data Structures & Algorithms, and Network Systems.",
      icon: <FaGraduationCap className="text-blue-400" />,
    },
  ];

  const journey = [
    {
      role: "Frontend Developer (NSS) ",
      company: "AmaliTech",
      period: "2025 - Present",
      location: "Accra, Ghana",
      description:
        "Build beautiful, interactive user interfaces for web and mobile applications.",
      achievements: [
        "AmaliTech AWS re/Start Programme",
      ],
      color: "from-cyan-500 to-blue-500",
    },
     {
      role: "Executive Director",
      company: "Slint Tech",
      period: "2025 - Present",
      location: "Accra, Ghana",
      description:
        "Leading educational transformation through technology integration and community building.",
      achievements: [
        "Increased community engagement by 30%",
        "Built partnerships with 5+ international tech organizations",
        "Launched scholarship program supporting 50+ students",
      ],
      color: "from-cyan-500 to-blue-500",
    },
    {
      role: "Frontend Developer",
      company: "Freelance & Contract Work",
      period: "2025 - Present",
      location: "Remote & Ghana",
      description:
        "Building scalable web applications and mentoring aspiring developers.",
      achievements: [
        "Delivered 3+ successful client projects",
        "Maintained 98% client satisfaction rate",
        "Mentored 100+ junior developers",
      ],
      color: "from-green-500 to-cyan-500",
    },
    
    {
      role: "Software Projects Coordination Intern",
      company: "Facio Tech",
      period: "2025 - Present",
      location: "Remote",
      description:
        " Monitoring project timelines and ensured timely follow-ups on assigned tasks and deliverables to support the software development team.",
      achievements: [
        "Monitored project timelines",
        "Assisted in compiling progress reports ",
       
      ],
      color: "from-purple-500 to-pink-500",
    },
  ];

  const certifications = [
    {
      title: "Full-Stack Engineer Career Path",
      issuer: "Codecademy",
      date: "2025",
      credential: "Professional Certificate",
      skills: [
        "HTML",
        "CSS",
        "JavaScript",
        "Responsive Design",
        "API",
        "React",
        "Redux",
        "Web Performance",
        "Node.JS",
        "Express",
        "Web Performance",
        "Git / GitHub",
      ],
      platform: "Codecademy",
      downloadLink: "/files/certificates/meta-react-certificate.pdf",
      verifyLink: "https://coursera.org/verify/professional-cert/ABC123",
      platformColor: "text-blue-400",
    },
    {
      title: "Front-End Developer Career Path",
      issuer: "Scrimba",
      date: "2025",
      credential: "Professional Certificate",
      skills: [
        "HTML",
        "CSS",
        "JavaScript",
        "Responsive Design",
        "API",
        "React",
      ],
      platform: "Scrimba",
      downloadLink: "/files/certificates/google-marketing-certificate.pdf",
      verifyLink: "https://coursera.org/verify/professional-cert/DEF456",
      platformColor: "text-blue-400",
    },
    {
      title: "AWS Cloud Practitioner",
      issuer: "Amazon Web Services",
      date: "2022",
      credential: "Cloud Certification",
      skills: ["Cloud Computing", "AWS Services", "Security", "Architecture"],
      platform: "AWS Training",
      downloadLink: "/files/certificates/aws-cloud-practitioner.pdf",
      verifyLink: "https://aws.amazon.com/verification/GHI789",
      platformColor: "text-orange-400",
    },
    {
      title: "The Hard Parts of Asynchronous JavaScript",
      issuer: "Frontend Masters",
      date: "2025",
      credential: "Professional Certificate",
      skills: [
        "Callbacks",
        "Higher-Order Functions",
        "Closure",
        "asynchronous JavaScript",
        "Object-oriented JavaScript",
      ],
      platform: "Frontend Masters",
      downloadLink:
        "https://static.frontendmasters.com/ud/c/cfdc15c3e7/mKwIKFRvDi/javascript-new-hard-parts.pdf",
      verifyLink:
        "https://static.frontendmasters.com/ud/c/cfdc15c3e7/mKwIKFRvDi/javascript-new-hard-parts.pdf",
      platformColor: "text-green-400",
    },
    {
      title: "Complete Intro to Web Development, v3",
      issuer: "Frontend Masters",
      date: "2024",
      credential: "Professional Certificate",
      skills: ["HTML5", "CSS3", "JavaScript"],
      platform: "Frontend Masters",
      downloadLink:
        "https://static.frontendmasters.com/ud/c/091103566d/yBlPKcpCER/web-development-v3.pdf",
      verifyLink:
        "https://static.frontendmasters.com/ud/c/091103566d/yBlPKcpCER/web-development-v3.pdf",
      platformColor: "text-red-400",
    },
  ];

  const tabs = [
    { id: "story", label: "My Story", icon: <FaHeart /> },
    { id: "journey", label: "Career Journey", icon: <FaRocket /> },
    { id: "education", label: "Education", icon: <FaGraduationCap /> },
    { id: "values", label: "Core Values", icon: <FaLightbulb /> },
  ];

  // Image carousel functions
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % galleryImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + galleryImages.length) % galleryImages.length
    );
  };

  const goToSlide = (index) => {
    setCurrentImageIndex(index);
  };

  return (
    <section
      id="about"
      className="min-h-screen pt-28 pb-20 relative scroll-mt-28"
      style={{
        // ensure browsers without the Tailwind utility still respect anchor offsets
        scrollMarginTop: "7rem",
        background:
          "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)",
      }}
    >
      {/* Enhanced Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 right-10 w-96 h-96 bg-gradient-to-r from-purple-500/8 to-pink-500/10 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 left-10 w-80 h-80 bg-gradient-to-r from-green-500/6 to-cyan-500/8 blur-3xl"></div>
        <div className="liquid-morph absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-r from-blue-500/4 to-purple-500/6 blur-2xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Intro Hero: Headshot leading into the About content */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="w-48 h-48 rounded-full overflow-hidden shadow-2xl mb-4">
            <img
              src="/images/Headshot.webp"
              alt="Illona Addae Headshot"
              className="w-full h-full object-cover"
            />
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            Hello, I'm Illona
          </h3>
          <p className="text-gray-300 max-w-2xl">
            I'm a full-stack developer, community leader and mentor. Below is a
            deeper look at my story, work, and the impact I aim to create.
          </p>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => {
                try {
                  const el = document.getElementById("contact");
                  const nav = document.querySelector("nav");
                  const navHeight = (nav && nav.offsetHeight) || 80;

                  const scrollInto = (target) => {
                    const rect = target.getBoundingClientRect();
                    const top = rect.top + window.scrollY - navHeight - 12;
                    window.scrollTo({ top, left: 0, behavior: "smooth" });
                  };

                  if (location.pathname === "/contact") {
                    if (el) scrollInto(el);
                    return;
                  }

                  // Navigate to /contact then scroll after mount
                  navigate("/contact");
                  setTimeout(() => {
                    const el2 = document.getElementById("contact");
                    if (el2) scrollInto(el2);
                  }, 350);
                } catch (e) {
                  navigate("/contact");
                }
              }}
              className="glass-btn bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 px-5 py-2 rounded-lg font-medium"
            >
              Hire Me
            </button>
            <button
              onClick={() =>
                window.scrollTo({
                  top: window.scrollY + 400,
                  behavior: "smooth",
                })
              }
              className="glass-btn border border-white/20 text-white px-5 py-2 rounded-lg font-medium"
            >
              Learn More
            </button>
          </div>
        </div>
        {/* Enhanced Section Header */}
        <div
          className={`text-center mb-16 transition-all duration-1000 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
          }`}
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-cyan-600 to-green-600 dark:from-purple-400 dark:via-cyan-400 dark:to-green-400 bg-clip-text text-transparent">
              About Me
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            Empowering communities through technology and building bridges for
            inclusive innovation
          </p>

          {/* Enhanced Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div
                key={index}
                className={`glass-card p-6 text-center group hover:scale-105 transition-all duration-300 delay-${
                  index * 100
                }`}
              >
                <div
                  className={`text-4xl mb-3 group-hover:scale-110 transition-transform duration-300 ${stat.color}`}
                >
                  {stat.icon}
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {stat.number}
                </div>
                <div className="text-sm text-gray-300">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`glass-btn px-6 py-3 font-medium transition-all duration-300 flex items-center gap-2 ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-400 border border-cyan-500/40 scale-105"
                  : "text-gray-400 hover:text-white hover:bg-white/5 hover:scale-105"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Enhanced Content Sections */}
        <div className="max-w-6xl mx-auto">
          {/* My Story Tab */}
          {activeTab === "story" && (
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div className="space-y-8 px-2 sm:px-0">
                <div className="glass-card w-full max-w-none p-6 sm:p-8">
                  <h3 className="text-heading-xl text-white mb-6 flex items-center gap-3">
                    <FaHeart className="text-red-400" />
                    My Story
                  </h3>
                  <div className="space-y-6 text-gray-300 leading-relaxed">
                    <p className="text-story-lg">
                      I was raised{" "}
                      <strong className="text-cyan-400 text-strong">
                        by two remarkable women my mother and grandmother,
                      </strong>{" "}
                      who taught me that strength isn't loud, it's consistent.
                      After losing my father early, I learned resilience not as
                      a choice, but as a way of life. That spirit shaped how I
                      see the world: every problem is just a puzzle waiting for
                      a creative solution.
                    </p>
                    <p className="text-story-lg">
                      At{" "}
                      <strong className="text-green-400 text-strong">
                        Accra Technical University,
                      </strong>{" "}
                      I discovered technology, a language through which I could
                      build, solve, and empower. I fell in love with the beauty
                      of turning ideas into functional systems. From developing
                      my first real project to leading teams and mentoring
                      peers, I realized I wasn't just coding I was creating
                      impact. That realization gave birth to{" "}
                      <strong className="text-green-400 text-strong">
                        SLINT Tech,
                      </strong>{" "}
                      a youth-led organization I founded to empower the next
                      generation of African innovators. It's more than a tech
                      community; it's a leadership movement where we learn,
                      build, and give back.
                    </p>
                    <p className="text-story-lg">
                      Under my personal brand,{" "}
                      <strong className="text-cyan-400 text-strong">
                        Oceaniccoder,{" "}
                      </strong>{" "}
                      I'm a constantly evolving developer, designer, and leader
                      driven by purpose and curiosity. Whether I'm coding,
                      designing a user experience, or mentoring someone new to
                      tech, I build with empathy, intention, and vision. My
                      journey isn't just about writing code. It's about writing
                      change. One project, one person, one purpose at a time.
                    </p>
                  </div>

                  {/* Enhanced Quote */}
                  <div className="mt-8 p-6 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                    <blockquote className="text-cyan-300 quote-text">
                      "In a society where women are often underestimated, I am
                      determined to shift the conversation. Technology is for
                      everyone gender, wealth, or background should never limit
                      one's potential to innovate and succeed."
                    </blockquote>
                    <cite className="text-caption text-gray-400 mt-3 block">
                      — Illona Addae
                    </cite>
                  </div>
                </div>

                {/* Mission Statement */}
                <div className="glass-card w-full max-w-none p-6 sm:p-8 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                  <h3 className="text-heading-lg text-white mb-4 flex items-center gap-3">
                    <FaRocket className="text-purple-400" />
                    Mission Statement
                  </h3>
                  <p className="text-gray-300 text-story-lg">
                    To create a tech ecosystem where talent thrives regardless
                    of gender, background, or circumstance. Through education,
                    mentorship, and community building, I'm working to ensure
                    that the next generation of technologists reflects the
                    diversity of our world.
                  </p>
                </div>
              </div>

              {/* Image Gallery remains the same but with updated caption fonts */}
              <div className="space-y-8 px-2 sm:px-0">
                {/* Image gallery card also stretched a bit on mobile */}
                <div className="glass-card w-full max-w-none p-6">
                  <h3 className="text-heading-lg text-white mb-6 flex items-center gap-3">
                    <FaPlay className="text-cyan-400" />
                    My Journey in Pictures
                  </h3>

                  <div className="relative -mx-6 -mb-6">
                    <div className="relative overflow-hidden rounded-b-2xl shadow-2xl border border-cyan-400/30">
                      <div
                        className="relative"
                        style={{
                          paddingBottom: "85%",
                        }}
                      >
                        {/* Image remains the same */}
                        <img
                          loading="lazy"
                          decoding="async"
                          width="1200"
                          height="800"
                          src={galleryImages[currentImageIndex].src}
                          alt={galleryImages[currentImageIndex].alt}
                          className="absolute inset-0 w-full h-full object-cover bg-gradient-to-br from-gray-900 to-gray-800 transition-all duration-700 hover:scale-105"
                          style={{
                            objectPosition: "center",
                          }}
                          onError={(e) => {
                            // fallback to the optimized profile image
                            e.target.src = "/images/profile.webp";
                          }}
                        />

                        {/* Navigation arrows remain the same */}
                        <button
                          onClick={prevImage}
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 glass-btn bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full hover:scale-110 hover:bg-black/90 transition-all duration-300 group shadow-xl z-20"
                          aria-label="Previous image"
                        >
                          <FaChevronLeft className="w-3.5 h-3.5 group-hover:scale-110" />
                        </button>

                        <button
                          onClick={nextImage}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 glass-btn bg-black/80 backdrop-blur-sm text-white p-2.5 rounded-full hover:scale-110 hover:bg-black/90 transition-all duration-300 group shadow-xl z-20"
                          aria-label="Next image"
                        >
                          <FaChevronRight className="w-3.5 h-3.5 group-hover:scale-110" />
                        </button>

                        {/* Image counter with better font */}
                        <div className="absolute bottom-2 right-2 z-10">
                          <div className="glass-card bg-black/80 backdrop-blur-sm border border-white/20 rounded-lg px-2.5 py-1 shadow-lg">
                            <span className="text-white text-small font-medium">
                              {currentImageIndex + 1}/{galleryImages.length}
                            </span>
                          </div>
                        </div>

                        {/* Caption with proper font sizing */}
                        <div className="absolute bottom-2 left-2 right-14 z-10">
                          <div className="glass-card bg-black/60 backdrop-blur-sm border border-white/10 rounded-lg px-2.5 py-1.5 shadow-lg">
                            <p className="text-white text-caption font-medium leading-tight">
                              {galleryImages[currentImageIndex].caption}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation hints with better font */}
                    <div className="px-6 pt-3">
                      {/* Thumbnails remain the same */}
                      <div className="flex justify-center gap-1.5">
                        {galleryImages.map((image, index) => (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`relative overflow-hidden rounded-lg border-2 transition-all duration-300 ${
                              index === currentImageIndex
                                ? "border-cyan-400 scale-105 shadow-lg shadow-cyan-400/25"
                                : "border-white/20 hover:border-cyan-400/50 hover:scale-105"
                            }`}
                            style={{
                              width: "35px",
                              height: "35px",
                            }}
                          >
                            <img
                              loading="lazy"
                              decoding="async"
                              width="60"
                              height="60"
                              src={image.src}
                              alt={image.alt}
                              className="w-full h-full object-cover transition-transform duration-300"
                              onError={(e) => {
                                // fallback to the optimized profile image
                                e.target.src = "/images/profile.webp";
                              }}
                            />
                            {index === currentImageIndex && (
                              <div className="absolute inset-0 bg-cyan-400/20"></div>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Slide indicators remain the same */}
                      <div className="flex justify-center gap-1.5 mt-2">
                        {galleryImages.map((_, index) => (
                          <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`transition-all duration-300 ${
                              index === currentImageIndex
                                ? "w-5 h-1.5 bg-gradient-to-r from-cyan-400 to-blue-400 rounded-full scale-110"
                                : "w-1.5 h-1.5 bg-gray-500 rounded-full hover:bg-cyan-400/70 hover:scale-105"
                            }`}
                            aria-label={`Go to slide ${index + 1}`}
                          />
                        ))}
                      </div>

                      {/* Navigation hint with proper font */}
                      <div className="flex justify-center mt-2 mb-4">
                        <div className="glass-card bg-white/5 border border-white/10 rounded-lg px-2.5 py-0.5">
                          <span className="text-small text-gray-400">
                            ← Swipe or click to navigate →
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Quick Facts with better fonts */}
                <div className="glass-card w-full max-w-none p-6">
                  <h4 className="text-heading-lg text-white mb-4 flex items-center gap-2">
                    <FaStar className="text-yellow-400" />
                    Quick Facts
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
                      <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center">
                        <FaMapMarkerAlt className="text-red-400 text-xs" />
                      </div>
                      <span className="text-gray-300">
                        Based in Accra, Ghana
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
                      <div className="w-8 h-8 rounded-full bg-blue-400/20 flex items-center justify-center">
                        <FaCalendarAlt className="text-blue-400 text-xs" />
                      </div>
                      <span className="text-gray-300">2+ Years in Tech</span>
                    </div>
                    <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
                      <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center">
                        <FaUsers className="text-green-400 text-xs" />
                      </div>
                      <span className="text-gray-300">
                        40+ Students Mentored
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-caption group hover:scale-105 transition-transform duration-200">
                      <div className="w-8 h-8 rounded-full bg-yellow-400/20 flex items-center justify-center">
                        <FaAward className="text-yellow-400 text-xs" />
                      </div>
                      <span className="text-gray-300">
                        Multiple Certifications
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Career Journey Tab */}
          {activeTab === "journey" && (
            <div className="space-y-8">
              <div className="glass-card p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
                  <FaRocket className="text-cyan-400" />
                  Career Journey
                </h3>
                <div className="space-y-8">
                  {journey.map((item, index) => (
                    <div key={index} className="relative">
                      {/* Stack on mobile and show row on small+ screens so the card fills available width */}
                      {/* Ensure items align to the top so the timeline dot + line sit at the card top (not centered) */}
                      {/* keep items in a left-aligned row (wrap if needed) so timeline stays to the left
                          and doesn't stack above the card on very small screens */}
                      <div className="flex flex-row flex-wrap gap-6 items-start">
                        {/* Timeline column: slightly narrower on very small screens (w-10) so cards get more width
                            dot aligned to the card padding (top-6) so it sits at the same visual height as before
                            connector starts just below the dot and stretches to the bottom of the item */}
                        <div className="w-8 sm:w-12 flex-shrink-0 relative flex items-start justify-center self-stretch">
                          <div
                            className={`absolute left-1/2 -translate-x-1/2 top-5 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r ${item.color} rounded-full shadow-lg z-20`}
                          />

                          {index < journey.length - 1 && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-11 bottom-4 w-[2px] bg-gradient-to-b from-cyan-400/70 to-transparent opacity-95 z-10" />
                          )}
                        </div>

                        {/* content column: add a small horizontal padding so content doesn't touch the timeline */}
                        <div className="flex-1 glass-card p-3 sm:p-6 hover:scale-105 transition-all duration-300 min-w-0 sm:pl-4">
                          <div className="flex flex-wrap items-start justify-between mb-3">
                            <div>
                              <h4 className="text-xl font-bold text-white">
                                {item.role}
                              </h4>
                              <p className="text-cyan-400 font-medium">
                                {item.company}
                              </p>
                            </div>
                            <div className="text-right">
                              {/* Enhanced period text with better visibility */}
                              <p className="text-sm text-gray-200 font-medium bg-gray-700/30 px-2 py-1 rounded">
                                {item.period}
                              </p>
                              {/* Enhanced location text with better visibility */}
                              <p className="text-xs text-gray-300 flex items-center gap-1 mt-1">
                                <FaMapMarkerAlt className="w-3 h-3 text-cyan-400" />
                                <span className="bg-gray-700/20 px-1.5 py-0.5 rounded text-gray-200">
                                  {item.location}
                                </span>
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-300 mb-4 text-story-base">
                            {item.description}
                          </p>
                          <div className="space-y-2">
                            <h5 className="text-sm font-semibold text-white">
                              Key Achievements:
                            </h5>
                            <ul className="space-y-1">
                              {item.achievements.map((achievement, i) => (
                                <li
                                  key={i}
                                  className="text-caption text-gray-300 flex items-start gap-2"
                                >
                                  <span className="text-green-400 mt-1">•</span>
                                  {achievement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Education Tab */}
          {activeTab === "education" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaGraduationCap className="text-green-400" />
                  Education
                </h3>
                {education.map((edu, index) => (
                  <div
                    key={index}
                    className="glass-card w-full max-w-none p-6 hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">{edu.icon}</div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-white">
                          {edu.degree}
                        </h4>
                        <p className="text-cyan-400 font-medium">
                          {edu.institution}
                        </p>
                        <p className="text-sm text-gray-400 mb-2">
                          {edu.period}
                        </p>
                        <div className="inline-block bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 text-xs px-3 py-1 rounded-full border border-green-500/30 mb-3">
                          {edu.achievement}
                        </div>
                        <p className="text-gray-300 text-sm">
                          {edu.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <FaCertificate className="text-purple-400" />
                  Certifications
                </h3>
                {certifications.map((cert, index) => (
                  <div
                    key={index}
                    className="glass-card w-full max-w-none p-6 hover:scale-105 transition-all duration-300"
                  >
                    {/* Stack meta on small screens so long titles can use full width; align in a row on sm+ */}
                    <div className="flex flex-col sm:flex-row items-start justify-between mb-3 gap-3">
                      <div className="flex-1 min-w-0">
                        {/* responsive title: slightly larger on tablets to improve readability, allow wrapping */}
                        <h4 className="text-base sm:text-lg font-bold text-white">
                          {cert.title}
                        </h4>
                        <p className="text-purple-400 font-medium">
                          {cert.issuer}
                        </p>

                        {/* Platform Tag */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span
                            className={`inline-block text-xs px-2 py-1 rounded-full border border-current ${cert.platformColor} bg-current/10 font-medium`}
                          >
                            📚 {cert.platform}
                          </span>
                          <span className="text-xs text-gray-400">
                            {cert.date}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-0 sm:ml-4 flex-shrink-0">
                        <span className="inline-block text-xs bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30 sm:whitespace-nowrap">
                          {cert.credential}
                        </span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-2 mt-3 mb-4">
                      {cert.skills.map((skill, i) => (
                        <span
                          key={i}
                          className="text-xs bg-gray-700/50 text-gray-300 px-2 py-1 rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Action Buttons */}
                    {/* Stack buttons on mobile, inline on small+ screens */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={cert.downloadLink}
                        download
                        className="flex-1 glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-2 px-3 text-sm font-medium hover:scale-105 transition-all duration-300 inline-flex items-center justify-center gap-2"
                      >
                        <FaDownload className="w-3 h-3" />
                        Download
                      </a>

                      <a
                        href={cert.verifyLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 glass-btn border border-cyan-400/40 text-cyan-400 py-2 px-3 text-sm font-medium hover:scale-105 hover:bg-cyan-400/10 transition-all duration-300 inline-flex items-center justify-center gap-2"
                      >
                        <FaCertificate className="w-3 h-3" />
                        Verify
                      </a>
                    </div>
                  </div>
                ))}

                {/* Download CV Button */}
                <div className="glass-card p-6 text-center bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <h4 className="text-lg font-bold text-white mb-3">
                    Want to Know More?
                  </h4>
                  <a
                    href="/files/Illona-Addae-CV.pdf"
                    download
                    className="glass-btn bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 font-medium hover:scale-105 transition-all duration-300 inline-flex items-center gap-2"
                  >
                    <FaDownload className="w-4 h-4" />
                    Download Full CV
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Core Values Tab */}
          {activeTab === "values" && (
            <div className="space-y-8">
              <h3 className="text-2xl font-bold text-white mb-8 text-center flex items-center justify-center gap-3">
                <FaLightbulb className="text-yellow-400" />
                Core Values & Impact
              </h3>
              <div className="grid md:grid-cols-2 gap-8">
                {values.map((value, index) => (
                  <div
                    key={index}
                    className="glass-card p-8 group hover:scale-105 transition-all duration-300"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="text-3xl group-hover:scale-110 transition-transform duration-300">
                        {value.icon}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xl font-bold text-white mb-3">
                          {value.title}
                        </h4>
                        <p className="text-gray-300 leading-relaxed mb-4">
                          {value.description}
                        </p>
                        <p className="text-sm text-cyan-300 font-medium bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20 px-3 py-2">
                          Impact: {value.impact}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
