// The badge sits on the project image, so both themes need a solid fill to pass
// AA (4.5:1) whatever the image is: a 10% tint let light screenshots show
// through (1.0-1.7:1). Light uses 700 text on the 100 fill; dark uses 400 text
// on gray-900 (6.4-11.6:1).
// success and warning sit just above AA (4.57 and 4.58:1 on their 100 fill),
// so keep the fill solid: any transparency over the image drops them below.
export const getStatusColor = (status) => {
  switch (status) {
    case "Completed":
      return "text-success-700 bg-success-100 border-success-700/30 dark:text-success-400 dark:bg-gray-900 dark:border-success-400/30";
    case "In Progress":
      return "text-warning-700 bg-warning-100 border-warning-700/30 dark:text-warning-400 dark:bg-gray-900 dark:border-warning-400/30";
    case "Planning":
      return "text-info-700 bg-info-100 border-info-700/30 dark:text-info-400 dark:bg-gray-900 dark:border-info-400/30";
    default:
      return "text-gray-700 bg-gray-100 border-gray-700/30 dark:text-gray-400 dark:bg-gray-900 dark:border-gray-400/30";
  }
};

export const getProjectSlug = (project) =>
  project.slug || project.title.toLowerCase().replace(/\s+/g, "-");
