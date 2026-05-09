import React from "react";
import { FaEnvelope } from "react-icons/fa";

const CallToAction = React.memo(({ resumeUrl }) => (
  <div className="mt-20 text-center">
    <div className="glass-card p-8 max-w-2xl mx-auto">
      <h3 className="text-2xl font-bold text-white mb-4">
        Ready to Build Something Amazing?
      </h3>
      <p className="text-gray-300 mb-6">
        Let's turn your ideas into reality. Whether it's a web application,
        mobile app, or innovative tech solution, I'm here to help bring your
        vision to life.
      </p>
      <div className="flex flex-wrap gap-4 justify-center">
        <a
          href="mailto:illona@oceaniccoder.dev"
          className="glass-btn bg-gradient-to-r from-oceanic-600 to-oceanic-900 text-white px-6 py-3 font-medium hover:scale-105 transition-transform duration-300 flex items-center gap-2"
        >
          <FaEnvelope className="w-4 h-4" />
          Email Me
        </a>
        <a
          href={
            resumeUrl ||
            "https://drive.google.com/file/d/1ewZVJPLATbvO5X0tgceWuGKgQIXSxBRX/view?usp=sharing"
          }
          target="_blank"
          rel="noopener noreferrer"
          className="glass-btn border border-white/20 text-white px-6 py-3 font-medium hover:scale-105 transition-transform duration-300"
        >
          Download CV
        </a>
      </div>
    </div>
  </div>
));

CallToAction.displayName = "CallToAction";

export default CallToAction;
