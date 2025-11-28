/**
 * Extracts speech text from AI responses that may contain <SPEECH> tags
 * or have a separate speechText field.
 * 
 * @param {string|object} response - The AI response (string or object with answer/speechText fields)
 * @returns {string|null} - The text to speak, or null if no speech portion found
 */
export function extractSpeechText(response) {
  if (!response) return null;

  // If response is an object, check for speechText field first (highest priority)
  if (typeof response === "object") {
    if (response.speechText && typeof response.speechText === "string") {
      return response.speechText.trim();
    }
    // Fallback to answer field
    if (response.answer && typeof response.answer === "string") {
      return extractSpeechFromText(response.answer);
    }
    return null;
  }

  // If response is a string, parse it for <SPEECH> tags
  if (typeof response === "string") {
    return extractSpeechFromText(response);
  }

  return null;
}

/**
 * Extracts speech text from a string that may contain <SPEECH>...</SPEECH> tags.
 * If tags are found, returns only the content inside them.
 * If no tags are found, returns the original text (for simple responses).
 * 
 * @param {string} text - The text to parse
 * @returns {string|null} - The speech text, or null if empty
 */
function extractSpeechFromText(text) {
  if (!text || typeof text !== "string") return null;

  // Look for <SPEECH>...</SPEECH> tags (case-insensitive)
  const speechTagRegex = /<SPEECH>(.*?)<\/SPEECH>/gis;
  const matches = [...text.matchAll(speechTagRegex)];

  if (matches.length > 0) {
    // Extract all speech portions and join them with spaces
    const speechParts = matches.map(match => match[1]?.trim()).filter(Boolean);
    if (speechParts.length > 0) {
      return speechParts.join(" ").trim();
    }
  }

  // If no tags found, check if text is short enough to be spoken entirely
  // (simple responses without formatting)
  const cleanedText = text.trim();
  const wordCount = cleanedText.split(/\s+/).length;
  
  // For short responses (< 100 words), speak the whole thing
  // For longer responses without tags, return null (shouldn't speak)
  if (wordCount <= 100) {
    return cleanedText;
  }

  // For longer responses without speech tags, don't speak
  return null;
}

/**
 * Removes <SPEECH>...</SPEECH> tags from text for display purposes
 * 
 * @param {string} text - The text to clean
 * @returns {string} - The text with speech tags removed
 */
export function removeSpeechTags(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(/<SPEECH>.*?<\/SPEECH>/gis, "").trim();
}

