import React, { useState, useCallback } from "react";
import { useCharityProfile } from "@/hooks/useCharityProfile";
import ProfileForm from "./ProfileForm";
import CharityProfileCard from "./CharityProfileCard";
import { Button } from "@/components/ui/Button";

/**
 * Section that displays the charity profile and toggles between view and edit modes.
 * @returns The rendered charity profile section
 */
const CharityProfileSection: React.FC = () => {
  const { profile, updateProfile, loading, error } = useCharityProfile();
  const [isEditing, setIsEditing] = useState(false);

  const handleToggleEdit = useCallback(
    () => setIsEditing(!isEditing),
    [isEditing],
  );

  const handleFormSubmit = useCallback(
    async (data) => {
      await updateProfile(data);
      setIsEditing(false);
    },
    [updateProfile],
  );

  if (!profile) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Charity Profile
        </h2>
        <p className="text-gray-600">Loading profile&hellip;</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Charity Profile</h2>
        <Button onClick={handleToggleEdit} variant="secondary">
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      {isEditing ? (
        <ProfileForm
          profile={profile}
          onSubmit={handleFormSubmit}
          loading={loading}
          error={error}
        />
      ) : (
        <CharityProfileCard profile={profile} />
      )}
    </div>
  );
};

export default CharityProfileSection;
