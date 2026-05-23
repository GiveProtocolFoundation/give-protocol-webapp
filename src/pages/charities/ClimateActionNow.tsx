import React from "react";
import {
  CharityPageTemplate,
  CharityProfileData,
} from "@/components/charity/CharityPageTemplate";

const charityData: CharityProfileData = {
  id: "3",
  walletAddress: "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75",
  name: "Climate Action Now",
  description:
    "Fighting climate change globally through renewable energy initiatives, reforestation projects, and sustainable community development.",
  category: "Environment",
  image:
    "https://images.unsplash.com/photo-1498925008800-019c7d59d903?auto=format&fit=crop&w=800",
  verified: false,
  country: "United Kingdom",
  stats: {
    totalDonated: 450000,
    donorCount: 780,
    projectsCompleted: 12,
  },
  mission:
    "Our mission is to combat climate change through direct action, education, and sustainable community development.",
  impact: [
    "Planted 1 million trees worldwide",
    "Installed solar panels in 100 communities",
    "Reduced carbon emissions by 50,000 tons",
    "Educated 25,000 people on climate action",
  ],
};

/**
 * Static charity page for Climate Action Now.
 * @returns React element rendering the charity profile template
 */
const ClimateActionNow: React.FC = () => {
  return <CharityPageTemplate charity={charityData} />;
};

export default ClimateActionNow;
