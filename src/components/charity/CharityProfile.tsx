import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Editor } from "@/components/ui/Editor";
import { useCharityProfile } from "@/hooks/useCharityProfile";

/**
 * Form for editing the current charity's profile details.
 * @returns The rendered charity profile editor
 */
export const CharityProfile: React.FC = () => {
  const { profile, updateProfile, loading, error } = useCharityProfile();
  const [name, setName] = useState(profile?.name || "");
  const [description, setDescription] = useState(profile?.description || "");
  const [category, setCategory] = useState(profile?.category || "");
  const [imageUrl, setImageUrl] = useState(profile?.image_url || "");

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
    },
    [],
  );

  const handleCategoryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCategory(e.target.value);
    },
    [],
  );

  const handleImageUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setImageUrl(e.target.value);
    },
    [],
  );

  const handleDescriptionChange = useCallback((content: string) => {
    setDescription(content);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await updateProfile({ name, description, category, image_url: imageUrl });
    },
    [updateProfile, name, description, category, imageUrl],
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Charity Profile
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Charity Name"
          value={name}
          onChange={handleNameChange}
          required
        />
        <div>
          <label
            htmlFor="charity-description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <Editor
            id="charity-description"
            content={description}
            onChange={handleDescriptionChange}
            placeholder="Describe your charity's mission and impact..."
            className="min-h-[200px]"
          />
        </div>
        <Input
          label="Category"
          value={category}
          onChange={handleCategoryChange}
          required
        />
        <Input
          label="Image URL"
          type="url"
          value={imageUrl}
          onChange={handleImageUrlChange}
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
};
