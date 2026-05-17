import React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/utils/money";
import { formatDate } from "@/utils/date";

interface Donation {
  id: string;
  amount: number;
  organization: string;
  date: string;
  status: "completed" | "pending";
}

const fetchRecentDonations = (): Promise<Donation[]> => {
  // Simulated API call
  return Promise.resolve([
    {
      id: "1",
      amount: 1000,
      organization: "Global Water Foundation",
      date: "2024-03-15",
      status: "completed",
    },
    {
      id: "2",
      amount: 500,
      organization: "Education for All",
      date: "2024-03-10",
      status: "completed",
    },
    {
      id: "3",
      amount: 750,
      organization: "Climate Action Now",
      date: "2024-03-05",
      status: "completed",
    },
    {
      id: "4",
      amount: 250,
      organization: "Animal Sanctuary",
      date: "2024-03-01",
      status: "completed",
    },
    {
      id: "5",
      amount: 1500,
      organization: "Healthcare Initiative",
      date: "2024-02-28",
      status: "completed",
    },
  ]);
};

/**
 * Renders a panel listing the most recent donations fetched via React Query.
 * @returns The recent donations panel element, or a loading indicator while data is fetched.
 */
export const RecentDonations: React.FC = () => {
  const { data: donations, isLoading } = useQuery({
    queryKey: ["recentDonations"],
    queryFn: fetchRecentDonations,
  });

  if (isLoading) return <div>Loading recent donations&hellip;</div>;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Recent Donations
      </h2>
      <div className="space-y-4">
        {donations?.map((donation) => (
          <div
            key={donation.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
          >
            <div>
              <p className="font-medium text-gray-900">
                {donation.organization}
              </p>
              <p className="text-sm text-gray-500">
                {formatDate(donation.date)}
              </p>
            </div>
            <span className="font-semibold text-gray-900">
              {formatCurrency(donation.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
