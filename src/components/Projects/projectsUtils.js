export const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "text-success-400 bg-success-400/10 border-success-400/30";
    case "In Progress":
      return "text-warning-400 bg-warning-400/10 border-warning-400/30";
    case "Planning":
      return "text-info-400 bg-info-400/10 border-info-400/30";
    default:
      return "text-gray-400 bg-gray-400/10 border-gray-400/30";
  }
};

export const getProjectSlug = (project) =>
  project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
