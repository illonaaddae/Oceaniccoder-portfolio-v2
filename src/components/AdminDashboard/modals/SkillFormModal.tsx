import React, { useState, useEffect } from "react";
import { Modal } from "./Modal";
import { FaSave } from "react-icons/fa";
import type { Skill } from "@/types";

interface SkillFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (skill: Omit<Skill, "$id" | "$createdAt">) => Promise<void>;
  theme: "light" | "dark";
  editingSkill?: Skill | null;
}

export const SkillFormModal: React.FC<SkillFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  theme,
  editingSkill,
}) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    percentage: 80,
    category: "",
    icon: "",
  });

  useEffect(() => {
    if (editingSkill) {
      setForm({
        name: editingSkill.name || "",
        percentage: editingSkill.percentage || 80,
        category: editingSkill.category || "",
        icon: editingSkill.icon || "",
      });
    } else {
      setForm({
        name: "",
        percentage: 80,
        category: "",
        icon: "",
      });
    }
  }, [editingSkill, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      console.error("Error submitting skill:", err);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
    theme === "dark"
      ? "bg-gray-800/80 border-gray-700 text-white placeholder-gray-500 focus:border-cyan-500/60"
      : "bg-white/50 border-blue-200/50 text-slate-900 placeholder-slate-500"
  }`;

  const labelClass = `block text-sm font-semibold mb-2 ${
    theme === "dark" ? "text-slate-200" : "text-slate-700"
  }`;

  const categories = [
    "Frontend",
    "Backend",
    "Database",
    "DevOps",
    "Cloud",
    "Mobile",
    "AI/ML",
    "Data Science",
    "Cybersecurity",
    "Blockchain",
    "Game Dev",
    "Design",
    "Testing/QA",
    "Tools",
    "Soft Skills",
    "Other",
  ];

  const iconOptions = [
    // Frontend
    { value: "FaReact", label: "React" },
    { value: "SiReact", label: "React (Simple)" },
    { value: "FaVuejs", label: "Vue.js" },
    { value: "SiVuedotjs", label: "Vue.js (Simple)" },
    { value: "FaAngular", label: "Angular" },
    { value: "SiAngular", label: "Angular (Simple)" },
    { value: "FaJs", label: "JavaScript" },
    { value: "SiJavascript", label: "JavaScript (Simple)" },
    { value: "SiTypescript", label: "TypeScript" },
    { value: "FaHtml5", label: "HTML5" },
    { value: "FaCss3Alt", label: "CSS3" },
    { value: "FaSass", label: "Sass" },
    { value: "SiTailwindcss", label: "Tailwind CSS" },
    { value: "SiBootstrap", label: "Bootstrap" },
    { value: "SiNextdotjs", label: "Next.js" },
    { value: "SiNuxtdotjs", label: "Nuxt.js" },
    { value: "SiSvelte", label: "Svelte" },
    { value: "SiAstro", label: "Astro" },
    { value: "SiRemix", label: "Remix" },
    // Backend
    { value: "FaNodeJs", label: "Node.js" },
    { value: "SiNodedotjs", label: "Node.js (Simple)" },
    { value: "SiExpress", label: "Express.js" },
    { value: "SiNestjs", label: "NestJS" },
    { value: "FaPython", label: "Python" },
    { value: "SiPython", label: "Python (Simple)" },
    { value: "SiDjango", label: "Django" },
    { value: "SiFlask", label: "Flask" },
    { value: "SiFastapi", label: "FastAPI" },
    { value: "FaPhp", label: "PHP" },
    { value: "SiLaravel", label: "Laravel" },
    { value: "FaJava", label: "Java" },
    { value: "SiSpring", label: "Spring Boot" },
    { value: "FaRust", label: "Rust" },
    { value: "SiGo", label: "Go/Golang" },
    { value: "SiRuby", label: "Ruby" },
    { value: "SiRubyonrails", label: "Ruby on Rails" },
    { value: "SiCsharp", label: "C#" },
    { value: "SiDotnet", label: ".NET" },
    { value: "SiCplusplus", label: "C++" },
    { value: "SiC", label: "C" },
    { value: "SiKotlin", label: "Kotlin" },
    { value: "SiScala", label: "Scala" },
    { value: "SiElixir", label: "Elixir" },
    { value: "SiGraphql", label: "GraphQL" },
    // Database
    { value: "FaDatabase", label: "Database" },
    { value: "SiMongodb", label: "MongoDB" },
    { value: "SiPostgresql", label: "PostgreSQL" },
    { value: "SiMysql", label: "MySQL" },
    { value: "SiRedis", label: "Redis" },
    { value: "SiSqlite", label: "SQLite" },
    { value: "SiFirebase", label: "Firebase" },
    { value: "SiSupabase", label: "Supabase" },
    { value: "SiPrisma", label: "Prisma" },
    { value: "SiAppwrite", label: "Appwrite" },
    // DevOps & Cloud
    { value: "FaDocker", label: "Docker" },
    { value: "SiDocker", label: "Docker (Simple)" },
    { value: "SiKubernetes", label: "Kubernetes" },
    { value: "FaAws", label: "AWS" },
    { value: "SiAmazonaws", label: "AWS (Simple)" },
    { value: "FaGoogle", label: "Google Cloud" },
    { value: "SiGooglecloud", label: "Google Cloud (Simple)" },
    { value: "FaMicrosoft", label: "Azure" },
    { value: "SiMicrosoftazure", label: "Azure (Simple)" },
    { value: "SiVercel", label: "Vercel" },
    { value: "SiNetlify", label: "Netlify" },
    { value: "SiHeroku", label: "Heroku" },
    { value: "SiDigitalocean", label: "DigitalOcean" },
    { value: "SiCloudflare", label: "Cloudflare" },
    { value: "FaLinux", label: "Linux" },
    { value: "FaUbuntu", label: "Ubuntu" },
    { value: "FaCentos", label: "CentOS" },
    { value: "FaServer", label: "Server" },
    { value: "SiNginx", label: "Nginx" },
    { value: "SiApache", label: "Apache" },
    { value: "SiJenkins", label: "Jenkins" },
    { value: "SiGithubactions", label: "GitHub Actions" },
    { value: "SiCircleci", label: "CircleCI" },
    { value: "SiTerraform", label: "Terraform" },
    { value: "SiAnsible", label: "Ansible" },
    // Tools
    { value: "FaGitAlt", label: "Git" },
    { value: "FaGithub", label: "GitHub" },
    { value: "FaGitlab", label: "GitLab" },
    { value: "FaBitbucket", label: "Bitbucket" },
    { value: "FaNpm", label: "NPM" },
    { value: "FaYarn", label: "Yarn" },
    { value: "SiPnpm", label: "PNPM" },
    { value: "SiVite", label: "Vite" },
    { value: "SiWebpack", label: "Webpack" },
    { value: "SiEsbuild", label: "ESBuild" },
    { value: "SiRollup", label: "Rollup" },
    { value: "SiBabel", label: "Babel" },
    { value: "SiEslint", label: "ESLint" },
    { value: "SiPrettier", label: "Prettier" },
    { value: "SiJest", label: "Jest" },
    { value: "SiCypress", label: "Cypress" },
    { value: "SiPlaywright", label: "Playwright" },
    { value: "SiPostman", label: "Postman" },
    { value: "SiInsomnia", label: "Insomnia" },
    // Design
    { value: "FaFigma", label: "Figma" },
    { value: "SiFigma", label: "Figma (Simple)" },
    { value: "FaSketch", label: "Sketch" },
    { value: "SiAdobexd", label: "Adobe XD" },
    { value: "SiAdobephotoshop", label: "Photoshop" },
    { value: "SiAdobeillustrator", label: "Illustrator" },
    { value: "SiCanva", label: "Canva" },
    { value: "SiBlender", label: "Blender" },
    { value: "FaPaintBrush", label: "Design" },
    // Mobile
    { value: "FaApple", label: "iOS/Apple" },
    { value: "SiIos", label: "iOS" },
    { value: "SiSwift", label: "Swift" },
    { value: "FaAndroid", label: "Android" },
    { value: "SiAndroid", label: "Android (Simple)" },
    { value: "SiKotlin", label: "Kotlin (Android)" },
    { value: "FaMobile", label: "Mobile" },
    { value: "SiReact", label: "React Native" },
    { value: "SiExpo", label: "Expo" },
    { value: "SiFlutter", label: "Flutter" },
    { value: "SiDart", label: "Dart" },
    { value: "SiIonic", label: "Ionic" },
    { value: "SiCapacitor", label: "Capacitor" },
    { value: "SiXamarin", label: "Xamarin" },
    // AI/ML
    { value: "FaRobot", label: "AI/ML" },
    { value: "FaBrain", label: "Machine Learning" },
    { value: "SiTensorflow", label: "TensorFlow" },
    { value: "SiPytorch", label: "PyTorch" },
    { value: "SiOpenai", label: "OpenAI" },
    { value: "SiHuggingface", label: "Hugging Face" },
    { value: "SiJupyter", label: "Jupyter" },
    { value: "SiNumpy", label: "NumPy" },
    { value: "SiPandas", label: "Pandas" },
    { value: "SiScikitlearn", label: "Scikit-learn" },
    // Other
    { value: "FaCode", label: "Code" },
    { value: "FaTerminal", label: "Terminal" },
    { value: "FaCogs", label: "Settings/Config" },
    { value: "FaCloud", label: "Cloud" },
    { value: "FaLock", label: "Security" },
    { value: "FaChartLine", label: "Analytics" },
    { value: "FaNetworkWired", label: "Networking" },
    { value: "FaCube", label: "3D/Graphics" },
    { value: "FaGamepad", label: "Gaming" },
    { value: "SiUnity", label: "Unity" },
    { value: "SiUnrealengine", label: "Unreal Engine" },
    { value: "FaWordpress", label: "WordPress" },
    { value: "FaShopify", label: "Shopify" },
    { value: "SiWoocommerce", label: "WooCommerce" },
    { value: "FaStripe", label: "Stripe" },
    { value: "FaSlack", label: "Slack" },
    { value: "SiDiscord", label: "Discord" },
    { value: "FaTrello", label: "Trello" },
    { value: "FaJira", label: "Jira" },
    { value: "SiNotion", label: "Notion" },
    { value: "SiConfluence", label: "Confluence" },
    { value: "SiMarkdown", label: "Markdown" },
    { value: "SiJson", label: "JSON" },
    { value: "SiYaml", label: "YAML" },
    { value: "SiSolidity", label: "Solidity" },
    { value: "SiWeb3dotjs", label: "Web3.js" },
    { value: "SiEthereum", label: "Ethereum" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingSkill ? "Edit Skill" : "Add New Skill"}
      theme={theme}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Skill Name */}
        <div>
          <label className={labelClass}>Skill Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={inputClass}
            placeholder="e.g., React, TypeScript, Python"
          />
        </div>

        {/* Category */}
        <div>
          <label className={labelClass}>Category *</label>
          <select
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className={inputClass}
            title="Select skill category"
            aria-label="Select skill category"
          >
            <option value="">Select Category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Proficiency */}
        <div>
          <label className={labelClass}>Proficiency: {form.percentage}%</label>
          <input
            type="range"
            min="0"
            max="100"
            value={form.percentage}
            onChange={(e) =>
              setForm({ ...form, percentage: parseInt(e.target.value) })
            }
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            title="Skill proficiency percentage"
            aria-label="Skill proficiency percentage"
          />
          <div className="flex justify-between text-xs mt-1">
            <span
              className={theme === "dark" ? "text-slate-400" : "text-slate-600"}
            >
              Beginner
            </span>
            <span
              className={theme === "dark" ? "text-slate-400" : "text-slate-600"}
            >
              Expert
            </span>
          </div>
        </div>

        {/* Icon */}
        <div>
          <label className={labelClass}>Icon</label>
          <select
            value={
              iconOptions.some((opt) => opt.value === form.icon)
                ? form.icon
                : ""
            }
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className={inputClass}
            title="Select skill icon"
            aria-label="Select skill icon"
          >
            <option value="">Select Icon (Optional)</option>
            {iconOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <p
            className={`text-xs mt-1 ${
              theme === "dark" ? "text-slate-500" : "text-slate-500"
            }`}
          >
            Or enter a custom icon name below
          </p>
          <input
            type="text"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
            className={`${inputClass} mt-2`}
            placeholder="e.g., SiTypescript, SiNextdotjs, SiTailwindcss"
          />
          <p
            className={`text-xs mt-1 ${
              theme === "dark" ? "text-slate-500" : "text-slate-500"
            }`}
          >
            Use "Fa" prefix for Font Awesome or "Si" prefix for Simple Icons
          </p>
        </div>

        {/* Preview */}
        <div
          className={`p-4 rounded-xl border ${
            theme === "dark"
              ? "bg-white/5 border-white/10"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <p
            className={`text-sm font-medium mb-2 ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Preview
          </p>
          <div className="flex items-center justify-between">
            <span
              className={`font-medium ${
                theme === "dark" ? "text-white" : "text-slate-900"
              }`}
            >
              {form.name || "Skill Name"}
            </span>
            <span
              className={`text-sm ${
                theme === "dark" ? "text-cyan-400" : "text-cyan-600"
              }`}
            >
              {form.percentage}%
            </span>
          </div>
          <div className="mt-2 h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${form.percentage}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              theme === "dark"
                ? "bg-white/10 text-white hover:bg-white/20"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              loading
                ? "opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:from-blue-600 hover:to-cyan-500"
            }`}
          >
            <FaSave />
            {loading ? "Saving..." : editingSkill ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </Modal>
  );
};
