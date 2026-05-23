import React from "react";
import {
  CharityPageTemplate,
  CharityProfileData,
} from "@/components/charity/CharityPageTemplate";

const charityData: CharityProfileData = {
  id: "2",
  walletAddress: "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75",
  name: "Education for All",
  description:
    "Supporting education in developing countries through innovative learning programs, teacher training, and infrastructure development.",
  category: "Education",
  image:
    "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800",
  verified: true,
  country: "Kenya",
  stats: {
    totalDonated: 620000,
    donorCount: 980,
    projectsCompleted: 25,
  },
  mission:
    "Our mission is to make quality education accessible to all children, regardless of their socioeconomic background.",
  impact: [
    "Built 50 schools in underserved communities",
    "Provided scholarships to 10,000+ students",
    "Trained 2,500 teachers in modern pedagogy",
    "Distributed 100,000 educational resources",
  ],
};

/**
 * Static charity page for Education For All.
 * @returns React element rendering the charity profile template
 */
const EducationForAll: React.FC = () => {
  return <CharityPageTemplate charity={charityData} />;
};

export default EducationForAll;
