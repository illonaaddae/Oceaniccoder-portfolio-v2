import React from "react";

const FooterQuote = React.memo(() => (
  <div className="mt-8 text-center">
    <div className="glass-card p-6 max-w-2xl mx-auto">
      <blockquote className="text-oceanic-500 italic">
        "Don't let anyone look down on you because you are young, but set an
        example for the believers in speech, in conduct, in love, in faith and
        in purity."
      </blockquote>
      <cite className="text-sm text-gray-400 mt-2 block">
        1 Timothy 4:12 NIV
      </cite>
    </div>
  </div>
));

FooterQuote.displayName = "FooterQuote";

export default FooterQuote;
