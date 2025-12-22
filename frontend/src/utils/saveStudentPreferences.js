// Utility function to save student preferences to the database
import api from "@/api/axios";

/**
 * Saves student preferences to the database
 * @param {Object} params
 * @param {string|number} params.studentId - The student ID
 * @param {Object} params.preferences - The preferences object (e.g., { robotVsMagic: 'robot', ... })
 * @param {Object} params.prompts - The prompts object (e.g., { robotVsMagic: 'Was gefällt Dir besser? Roboter oder Zauberei?', ... })
 * @param {Object} params.buddy - The selected buddy object
 * @param {Object} params.profile - The profile object (name, ttsEnabled, theme)
 * @returns {Promise<boolean>} - Returns true if successful, false otherwise
 */
export const saveStudentPreferences = async ({
  studentId,
  preferences = {},
  prompts = {},
  buddy = null,
  profile = null,
}) => {
  if (!studentId) {
    console.error("saveStudentPreferences: studentId is required");
    return false;
  }

  try {
    // Get the student record first - may need to retry if student was just created
    let match = null;
    let attempts = 0;
    const maxAttempts = 5;
    
    let all = []; // Initialize all to prevent ReferenceError
    
    while (!match && attempts < maxAttempts) {
      try {
        const allRes = await api.get("/allstudents", {
          validateStatus: (s) => s >= 200 && s < 500,
        });
        
        // Handle 401 Unauthorized - user not authenticated
        // Don't log error - this is expected during onboarding
        if (allRes.status === 401) {
          return false;
        }
        
        all = Array.isArray(allRes?.data) ? allRes.data : [];

        match = all.find(
          (s) =>
            s?.user?.id === studentId ||
            s?.user_id === studentId ||
            s?.id === studentId
        );

        if (!match && attempts < maxAttempts - 1) {
          // Wait a bit before retrying (student might have just been created)
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        } else {
          break;
        }
      } catch (error) {
        // Handle network errors or other API errors
        if (error.response?.status === 401) {
          // 401 is expected during onboarding - don't log error
          return false;
        }
        // Only log non-401 errors
        if (error.response?.status !== 401) {
          console.error("saveStudentPreferences: Error fetching students:", error);
        }
        // Continue to next attempt or break if last attempt
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        } else {
          break;
        }
      }
    }

    if (!match || !match.id) {
      console.error("saveStudentPreferences: Student not found after", attempts + 1, "attempts. studentId:", studentId);
      if (all.length > 0) {
        console.error("Available students:", all.map(s => ({ id: s?.id, userId: s?.user?.id, user_id: s?.user_id })));
      } else {
        console.error("No students found in response (may be due to authentication error)");
      }
      return false;
    }

    // Build the payload
    const payload = {};

    // Add preferences/interests if provided
    if (preferences && Object.keys(preferences).length > 0) {
      // Get existing interests from the student record to merge with new ones
      const existingInterests = Array.isArray(match.interests) ? match.interests : [];
      
      // Convert preferences object to array format
      // Format: [{ id: "robotVsMagic", value: "robot", prompt: "Was gefällt Dir besser? Roboter oder Zauberei?" }, ...]
      // Only save preferences where the student has selected a value
      const newInterestsArray = Object.entries(preferences)
        .filter(([key, value]) => {
          // Only include if value is not null/undefined (student has made a selection)
          return value != null && value !== undefined;
        })
        .map(([key, value]) => ({
          id: key,
          value: value, // The selected value
          prompt: prompts[key] || null // The prompt/question that was shown for this selection
        }))
        .filter(item => {
          // Only include items where we have both a value and a prompt
          // This ensures we only save complete preference data
          return item.value != null && item.prompt != null;
        });

      // Merge new interests with existing ones
      // If an interest with the same id exists, update it; otherwise, add it
      const mergedInterests = [...existingInterests];
      
      newInterestsArray.forEach(newInterest => {
        const existingIndex = mergedInterests.findIndex(
          existing => existing?.id === newInterest.id
        );
        
        if (existingIndex >= 0) {
          // Update existing interest
          mergedInterests[existingIndex] = newInterest;
        } else {
          // Add new interest
          mergedInterests.push(newInterest);
        }
      });

      if (mergedInterests.length > 0) {
        payload.interests = mergedInterests;
      }
    }

    // Map color preference to theme
    const colorToThemeMap = {
      "Rot": "rose",
      "Blau": "sky",
      "Grün": "emerald",
      "Gelb": "amber",
    };
    
    // Get existing profile to preserve other settings
    const existingProfile = match.profile || {};
    
    // Determine theme: use colorPreference if available, otherwise use existing theme or default
    let selectedTheme = existingProfile.theme || "indigo";
    if (preferences?.colorPreference) {
      const colorName = preferences.colorPreference;
      selectedTheme = colorToThemeMap[colorName] || selectedTheme;
    } else if (profile?.theme) {
      selectedTheme = profile.theme;
    }

    // Add buddy if provided (do NOT create buddy from characterSelection)
    // Character selection is just a preference, not the buddy
    if (buddy && buddy.id) {
      payload.buddy = {
        id: buddy.id,
        name: buddy.name || buddy.alt || `Character ${buddy.id}`,
        img: buddy.img || buddy.src || buddy.avatar || "",
      };
    }
    // Note: We do NOT create buddy from characterSelection - character selection is just a preference

    // Add profile - always include theme from color preference
    if (profile || preferences?.colorPreference) {
      payload.profile = {
        name: profile?.name ?? existingProfile.name ?? "",
        ttsEnabled: Boolean(profile?.ttsEnabled ?? existingProfile.ttsEnabled ?? true),
        theme: selectedTheme,
      };
    }

    // Only send request if there's something to update
    if (Object.keys(payload).length === 0) {
      return true; // Nothing to update, but not an error
    }

    // Save to API
    try {
      const response = await api.patch(`/student/${match.id}`, payload, {
        validateStatus: (status) => status >= 200 && status < 500,
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log("✅ Preferences saved successfully:", payload);
        return true;
      } else {
        console.error("❌ API returned non-success status:", response.status, response.data);
        return false;
      }
    } catch (apiError) {
      console.error("❌ API request failed:", apiError);
      if (apiError.response) {
        console.error("Response status:", apiError.response.status);
        console.error("Response data:", apiError.response.data);
      }
      throw apiError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("❌ Failed to save preferences:", error);
    if (error.response) {
      console.error("Error response:", error.response.status, error.response.data);
    }
    return false;
  }
};

