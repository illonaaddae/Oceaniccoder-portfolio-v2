// The badge sits on the project image. Light theme uses a solid pale fill with
// 700 text so it passes AA (4.5:1) whatever the image is; the 400 text on a 10%
// tint measured 1.5-1.6:1 on white. Dark theme keeps the tinted look.
export const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "text-success-700 bg-success-100 border-success-700/30 dark:text-success-400 dark:bg-success-400/10 dark:border-success-400/30";
    case "In Progress":
      return "text-warning-700 bg-warning-100 border-warning-700/30 dark:text-warning-400 dark:bg-warning-400/10 dark:border-warning-400/30";
    case "Planning":
      return "text-info-700 bg-info-100 border-info-700/30 dark:text-info-400 dark:bg-info-400/10 dark:border-info-400/30";
    default:
      return "text-gray-700 bg-gray-100 border-gray-700/30 dark:text-gray-400 dark:bg-gray-400/10 dark:border-gray-400/30";
  }
};

export const getProjectSlug = (project) =>
  project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
