import React from "react";
import { FaLightbulb } from "react-icons/fa";

const ResponseTimeNote = React.memo(() => (
  <div className="mt-6 space-y-3">
    <div className="p-4 bg-gradient-to-r from-oceanic-500/10 to-blue-500/10 rounded-lg border border-oceanic-500/20">
      <p className="text-sm text-oceanic-500 flex items-start gap-2">
        <FaLightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <span>
          <strong>Quick Response:</strong> I typically respond to messages
          within 24 hours. For urgent inquiries, feel free to reach out via
          LinkedIn or email directly.
        </span>
      </p>
    </div>
    <div className="p-3 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-500/10">
      <p className="text-xs text-gray-400">
        <strong>Tip:</strong> Please take your time filling out the form and
        ensure your message is detailed (at least 10 characters). This helps
        prevent spam and ensures I receive your message properly.
      </p>
    </div>
  </div>
));

ResponseTimeNote.displayName = "ResponseTimeNote";

export default ResponseTimeNote;
