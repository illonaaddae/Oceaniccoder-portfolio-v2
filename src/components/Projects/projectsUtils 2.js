export const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "text-green-400 bg-green-400/10 border-green-400/30";
    case "In Progress":
      return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    case "Planning":
      return "text-blue-400 bg-blue-400/10 border-blue-400/30";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/30";
  }
};

export const getProjectSlug = (project) =>
  project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
