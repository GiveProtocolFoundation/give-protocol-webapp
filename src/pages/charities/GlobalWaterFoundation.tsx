import React from "react";
import {
  CharityPageTemplate,
  CharityProfileData,
} from "@/components/charity/CharityPageTemplate";

const charityData: CharityProfileData = {
  id: "1",
  walletAddress: "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75",
  name: "Global Water Foundation",
  description:
    "Providing clean water solutions worldwide through innovative technology, community engagement, and sustainable infrastructure development.",
  category: "Water & Sanitation",
  image:
    "https://images.unsplash.com/photo-1538300342682-cf57afb97285?auto=format&fit=crop&w=800",
  verified: true,
  country: "United States",
  stats: {
    totalDonated: 750000,
    donorCount: 1250,
    projectsCompleted: 15,
  },
  mission:
    "Our mission is to ensure universal access to clean water through sustainable solutions and community empowerment.",
  impact: [
    "Provided clean water access to 500,000+ people",
    "Built 1,000+ sustainable water systems",
    "Trained 2,000+ local water technicians",
    "Reduced waterborne diseases by 60% in target areas",
  ],
};

/**
 * Static charity page for Global Water Foundation.
 * @returns React element rendering the charity profile template
 */
const GlobalWaterFoundation: React.FC = () => {
  return <CharityPageTemplate charity={charityData} />;
};

export default GlobalWaterFoundation;
