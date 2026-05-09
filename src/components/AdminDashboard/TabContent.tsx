import React from "react";
import { TabContentMain } from "./TabContentMain";
import { TabContentExtra } from "./TabContentExtra";
import type { TabContentProps } from "./TabContentProps";

export const TabContent: React.FC<TabContentProps> = (props) => (
  <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
    <TabContentMain {...props} />
    <TabContentExtra {...props} />
  </div>
);
