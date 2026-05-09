export interface ServiceFeature {
  name: string;
  included: boolean;
  additionalCost?: string;
}

export interface ServicePackage {
  id: string;
  name: string;
  description: string;
  price: string;
  priceNote?: string;
  popular?: boolean;
  icon: string;
  color: string;
  features: ServiceFeature[];
  deliveryTime: string;
  revisions: string;
  support: string;
}

export interface AddonService {
  name: string;
  description: string;
  price: string;
}

export const servicePackages: ServicePackage[] = [
  {
    id: "starter",
    name: "Starter",
    description:
      "Perfect for small businesses or personal projects needing a professional web presence.",
    price: "$299",
    priceNote: "Starting from",
    icon: "FaRocket",
    color: "from-blue-500 to-oceanic-500",
    deliveryTime: "7-10 days",
    revisions: "2 rounds",
    support: "1 week post-launch",
    features: [
      { name: "Responsive Landing Page", included: true },
      { name: "Up to 5 Sections", included: true },
      { name: "Contact Form Integration", included: true },
      { name: "Basic SEO Setup", included: true },
      { name: "Mobile Responsive Design", included: true },
      { name: "Social Media Integration", included: true },
      { name: "Custom Animations", included: false, additionalCost: "+$100" },
      { name: "CMS Integration", included: false, additionalCost: "+$200" },
      { name: "E-commerce Features", included: false, additionalCost: "+$300" },
      { name: "API Integration", included: false, additionalCost: "+$150" },
    ],
  },
  {
    id: "professional",
    name: "Professional",
    description:
      "Comprehensive solution for businesses requiring a full-featured website with advanced functionality.",
    price: "$799",
    priceNote: "Starting from",
    popular: true,
    icon: "FaCode",
    color: "from-oceanic-500 to-oceanic-900",
    deliveryTime: "2-4 weeks",
    revisions: "4 rounds",
    support: "1 month post-launch",
    features: [
      { name: "Multi-Page Website (up to 10 pages)", included: true },
      { name: "Custom UI/UX Design", included: true },
      { name: "Advanced SEO Optimization", included: true },
      { name: "Contact Form with Dashboard", included: true },
      { name: "CMS Integration (Blog/Content)", included: true },
      { name: "Custom Animations & Transitions", included: true },
      { name: "Performance Optimization", included: true },
      { name: "Analytics Setup", included: true },
      { name: "E-commerce (Basic)", included: false, additionalCost: "+$500" },
      {
        name: "Custom API Development",
        included: false,
        additionalCost: "+$300",
      },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    description:
      "Full-scale web application with custom features, integrations, and ongoing support.",
    price: "$1,999",
    priceNote: "Starting from",
    icon: "FaServer",
    color: "from-blue-500 to-green-500",
    deliveryTime: "4-8 weeks",
    revisions: "Unlimited",
    support: "3 months post-launch",
    features: [
      { name: "Custom Web Application", included: true },
      { name: "Full-Stack Development", included: true },
      { name: "Database Design & Setup", included: true },
      { name: "User Authentication System", included: true },
      { name: "Admin Dashboard", included: true },
      { name: "API Development & Integration", included: true },
      { name: "E-commerce (Full-Featured)", included: true },
      { name: "Payment Gateway Integration", included: true },
      { name: "Cloud Deployment (AWS/Azure)", included: true },
      { name: "24/7 Priority Support", included: true },
    ],
  },
];

export const addonServices: AddonService[] = [
  {
    name: "Mobile App Development",
    description: "Native or cross-platform mobile applications (iOS/Android)",
    price: "From $2,499",
  },
  {
    name: "UI/UX Design Only",
    description: "Complete design mockups and prototypes in Figma",
    price: "From $399",
  },
  {
    name: "Website Maintenance",
    description: "Monthly updates, backups, security patches, and monitoring",
    price: "$99/month",
  },
  {
    name: "SEO Optimization Package",
    description:
      "Comprehensive SEO audit, keyword research, and implementation",
    price: "From $299",
  },
  {
    name: "Content Writing",
    description: "Professional copywriting for your website pages",
    price: "$50/page",
  },
  {
    name: "Logo Design",
    description: "Professional logo design with multiple concepts",
    price: "From $149",
  },
  {
    name: "Performance Audit",
    description: "In-depth analysis and optimization recommendations",
    price: "$199",
  },
  {
    name: "Hosting Setup & Management",
    description: "Domain, hosting configuration, and SSL setup",
    price: "$99 one-time",
  },
];
