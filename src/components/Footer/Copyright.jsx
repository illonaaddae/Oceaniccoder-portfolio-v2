import React from "react";

const Copyright = React.memo(() => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="text-center md:text-left">
      <p className="text-gray-200 text-sm">
        © {currentYear} Illona Addae (Oceaniccoder). All rights reserved.
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-200 mt-1">
        Building the future, one line of code at a time.
      </p>
    </div>
  );
});

Copyright.displayName = "Copyright";

export default Copyright;
