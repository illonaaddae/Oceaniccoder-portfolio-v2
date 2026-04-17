import React from "react";

const FormFields = React.memo(({ formData, handleInputChange }) => (
  <>
    {/* Hidden fields for Web3Forms */}
    <input
      type="hidden"
      name="access_key"
      value="e0faddf8-32ef-4a92-b097-8aec3e900163"
    />
    <input
      type="hidden"
      name="subject"
      value="New message from Oceaniccoder website"
    />
    <input
      type="text"
      name="website"
      tabIndex="-1"
      autoComplete="off"
      style={{
        position: "absolute",
        left: "-9999px",
        opacity: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />

    {/* Name Input */}
    <div>
      <label
        htmlFor="name"
        className="block text-sm font-medium text-white mb-2"
      >
        Your Name *
      </label>
      <input
        type="text"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleInputChange}
        required
        className="w-full glass-input"
        placeholder="Enter your full name"
      />
    </div>

    {/* Email Input */}
    <div>
      <label
        htmlFor="email"
        className="block text-sm font-medium text-white mb-2"
      >
        Email Address *
      </label>
      <input
        type="email"
        id="email"
        name="email"
        value={formData.email}
        onChange={handleInputChange}
        required
        className="w-full glass-input"
        placeholder="your.email@example.com"
      />
    </div>

    {/* Subject Input */}
    <div>
      <label
        htmlFor="subject"
        className="block text-sm font-medium text-white mb-2"
      >
        Subject *
      </label>
      <input
        type="text"
        id="subject"
        name="subject"
        value={formData.subject}
        onChange={handleInputChange}
        required
        className="w-full glass-input"
        placeholder="What's this about?"
      />
    </div>

    {/* Message Textarea */}
    <div>
      <label
        htmlFor="message"
        className="block text-sm font-medium text-white mb-2"
      >
        Message *{" "}
        <span className="text-gray-400 text-xs font-normal">
          (minimum 10 characters)
        </span>
      </label>
      <textarea
        id="message"
        name="message"
        value={formData.message}
        onChange={handleInputChange}
        required
        minLength={10}
        rows={6}
        className="w-full glass-input resize-none"
        placeholder="Tell me about your project or what you'd like to discuss... (minimum 10 characters)"
      />
    </div>
  </>
));

FormFields.displayName = "FormFields";

export default FormFields;
