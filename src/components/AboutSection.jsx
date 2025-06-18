import React from 'react';
import { FaCode, FaHeart, FaUsers, FaMicrophone, FaStar, FaGraduationCap } from 'react-icons/fa';

const AboutSection = () => {
  const stats = [
    { icon: <FaCode />, number: "15+", label: "Projects Completed" },
    { icon: <FaUsers />, number: "100+", label: "Students Mentored" },
    { icon: <FaMicrophone />, number: "20+", label: "Tech Talks Given" },
    { icon: <FaStar />, number: "5+", label: "Years Experience" },
  ];

  const values = [
    {
      icon: <FaHeart className="text-red-400" />,
      title: "Passion for Technology",
      description: "Driven by the transformative power of technology to create positive change in communities worldwide."
    },
    {
      icon: <FaUsers className="text-blue-400" />,
      title: "Inclusive Leadership",
      description: "Building diverse tech communities where everyone, regardless of background or gender, can thrive and succeed."
    },
    {
      icon: <FaGraduationCap className="text-green-400" />,
      title: "Continuous Learning",
      description: "Committed to staying at the forefront of technology while sharing knowledge with the next generation."
    },
  ];

  return (
    <section 
      id="about" 
      className="min-h-screen py-20 relative"
      style={{
        background: "linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 50%, var(--bg-primary) 100%)"
      }}
    >
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="liquid-morph absolute top-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/5 to-pink-500/5 blur-3xl"></div>
        <div className="liquid-morph absolute bottom-20 left-10 w-72 h-72 bg-gradient-to-r from-green-500/5 to-cyan-500/5 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="bg-gradient-to-r from-purple-600 via-cyan-600 to-green-600 dark:from-purple-400 dark:via-cyan-400 dark:to-green-400 bg-clip-text text-transparent">
              About Me
            </span>
          </h2>
          <p className="text-xl leading-relaxed max-w-3xl mx-auto text-gray-700 dark:text-gray-300">
            Empowering communities through technology and building bridges for inclusive innovation
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">My Story</h3>
              <div className="space-y-4 text-gray-300 leading-relaxed">
                <p>
                  I'm the <strong className="text-cyan-400">Founder and Executive Director at Slint Tech</strong> 🎖️ 
                  and a software engineer focused on harnessing technology to make significant impacts in the tech 
                  industry and building communities that embrace everyone regardless of background or gender.
                </p>
                <p>
                  I am driven by a vision where <strong className="text-green-400">women are recognized for their 
                  brilliance and impact in tech</strong> 💪. Growing up in Ghana, I witnessed how access to technology 
                  could transform lives and empower communities. This ignited my passion for breaking barriers in tech 
                  and advocating for a more inclusive, diverse tech world.
                </p>
                <p>
                  I believe in a world where opportunities are equal, dreams are boundless, and success is driven by 
                  determination, hard work, and talent—<strong className="text-purple-400">not defined by gender</strong>.
                </p>
                <div className="mt-6 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-lg border border-cyan-500/20">
                  <p className="text-cyan-300 font-medium italic">
                    "In a society where women are often underestimated, I am determined to shift the conversation. 
                    Technology is for everyone—gender, wealth, or background should never limit one's potential to innovate and succeed."
                  </p>
                  <p className="text-sm text-gray-400 mt-2">1 Timothy 4:12 NIV</p>
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-white">Core Values</h3>
              {values.map((value, index) => (
                <div key={index} className="glass-card p-6 group hover:scale-105 transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {value.icon}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">{value.title}</h4>
                      <p className="text-gray-300">{value.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats & Journey */}
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="glass-card p-6 text-center group hover:scale-105 transition-all duration-300">
                  <div className="text-3xl text-cyan-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.number}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Journey Timeline */}
            <div className="glass-card p-8">
              <h3 className="text-2xl font-bold text-white mb-6">My Journey</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">Executive Director - Slint Tech</h4>
                    <p className="text-cyan-400 text-sm mb-2">2023 - Present</p>
                    <p className="text-gray-300">
                      Leading educational transformation through technology integration and community building.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-cyan-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">Full-Stack Developer</h4>
                    <p className="text-green-400 text-sm mb-2">2020 - Present</p>
                    <p className="text-gray-300">
                      Building scalable web applications and mentoring aspiring developers.
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">Community Tech Leader</h4>
                    <p className="text-purple-400 text-sm mb-2">2019 - Present</p>
                    <p className="text-gray-300">
                      Advocating for women in tech and creating inclusive tech communities.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mission Statement */}
            <div className="glass-card p-8 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <h3 className="text-xl font-bold text-white mb-4">Mission Statement</h3>
              <p className="text-gray-300 leading-relaxed">
                To create a tech ecosystem where talent thrives regardless of gender, background, or circumstance. 
                Through education, mentorship, and community building, I'm working to ensure that the next generation 
                of technologists reflects the diversity of our world.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;