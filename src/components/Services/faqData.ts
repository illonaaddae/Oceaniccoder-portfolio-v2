export interface FAQItem {
  question: string;
  answer: string;
}

export const faqItems: FAQItem[] = [
  {
    question: "What's included in the revision rounds?",
    answer:
      "Each revision round covers feedback on design, functionality, or content changes. Major scope changes or new feature requests may require additional discussion and potentially an adjusted quote.",
  },
  {
    question: "How does the payment process work?",
    answer:
      "I typically require a 50% deposit to begin work, with the remaining 50% due upon project completion before the final handover. For larger projects, we can discuss milestone-based payments.",
  },
  {
    question: "Do you offer ongoing maintenance?",
    answer:
      "Yes! I offer monthly maintenance packages starting at $99/month which includes updates, backups, security monitoring, and minor content changes. Custom maintenance plans are also available.",
  },
  {
    question: "Can I upgrade my package later?",
    answer:
      "Absolutely! You can always add more features or upgrade to a higher tier. Any work already completed will be credited toward the upgrade cost.",
  },
  {
    question: "What technologies do you work with?",
    answer:
      "I specialize in React, TypeScript, Node.js, and modern web technologies. For mobile apps, I use React Native. Backend services include Express, PostgreSQL, MongoDB, and cloud services like AWS and Firebase.",
  },
  {
    question: "Do you provide source code?",
    answer:
      "Yes, upon full payment, you receive complete ownership of all source code and assets created for your project.",
  },
  {
    question: "What if I need something custom?",
    answer:
      "I love custom projects! If your needs don't fit these packages, let's chat. I'll provide a tailored quote based on your specific requirements.",
  },
  {
    question: "How do we communicate during the project?",
    answer:
      "I use a combination of email, video calls (Zoom/Google Meet), and project management tools like Notion or Trello. You'll have direct access to me throughout the project.",
  },
];
