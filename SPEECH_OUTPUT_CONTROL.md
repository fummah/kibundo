# Speech Output Control - Implementation Guide

## Overview

This document explains how to control what is spoken via text-to-speech (TTS) versus what is only displayed on screen. This is crucial for accessibility and user experience, especially when AI responses contain long lists, formatted content, or detailed instructions.

## Problem

Previously, the entire AI response was being spoken via TTS, which could be problematic for:
- Long lists of tasks or numbers
- Formatted content that's better read visually
- Mixed content where only a summary should be spoken

## Solution

We've implemented a system that allows the AI to specify what should be spoken using special markup tags in prompts. The system extracts and speaks only the designated portions while displaying the full response.

## How It Works

### 1. Prompt Instructions (Backend)

The AI is instructed via system prompts to format responses with `<SPEECH>...</SPEECH>` tags:

```text
🎤🎤🎤 KRITISCH - SPRACHAUSGABE-FORMATIERUNG (TTS) 🎤🎤🎤:
Speech output is very important for accessibility. You need to specify what should be SPOKEN vs what should only be DISPLAYED.

FORMATTING RULES:
1. For responses that contain both visual and spoken content:
   - Put the main spoken message inside <SPEECH>...</SPEECH> tags
   - Content outside these tags is for display only (lists, formatted text, etc.)

2. For simple responses (short, conversational):
   - If your entire response should be spoken, you don't need tags
   - The system will automatically speak the whole response

3. For complex responses with lists, tables, or formatted content:
   - ALWAYS wrap the spoken summary in <SPEECH>...</SPEECH> tags
   - Provide a brief, natural summary (30-50 words)
   - Focus on motivation and key points for speech
```

### 2. Example Response Format

**AI Response with Speech Tags:**
```
<SPEECH>Hallo Max! Du hast heute eine Matheaufgabe. Du musst Zahlen in einen Zahlenstrahl eintragen. Probiere die ersten beiden Aufgaben zu lösen!</SPEECH>

Schüler, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen:
1. Trage die Zahlen 11, 19, 31, 42, 57, 70, 86 und 94 in den Zahlenstrahl ein.
2. Trage die Zahlen 45, 63, 12, 36, 71, 54, 92 und 79 ein.
3. Überlege, welche Zahlen du eingetragen hast.
4. Denke nach, welche anderen Zahlen auch in den Zahlenstrahl passen könnten.
```

**What Gets Spoken:**
> "Hallo Max! Du hast heute eine Matheaufgabe. Du musst Zahlen in einen Zahlenstrahl eintragen. Probiere die ersten beiden Aufgaben zu lösen!"

**What Gets Displayed:**
The full response including the numbered list (speech tags are removed from display).

### 3. Backend Processing

The backend (`backend1/controllers/ai.controller.js`) automatically:
1. Extracts speech text from `<SPEECH>` tags
2. Returns it in a separate `speechText` field in the API response
3. Falls back to the full response for short answers (< 100 words)

**API Response Format:**
```json
{
  "answer": "<SPEECH>Hallo Max! ...</SPEECH>\n\n1. Trage die Zahlen...",
  "speechText": "Hallo Max! Du hast heute eine Matheaufgabe...",
  "agentName": "ChildAgent",
  "conversationId": 123
}
```

### 4. Frontend Processing

The frontend (`frontend/src/utils/extractSpeechText.js`) provides utilities:

**`extractSpeechText(response)`** - Extracts speech text from:
- Object responses: Checks for `speechText` field first, then `answer` field
- String responses: Parses `<SPEECH>` tags
- Short responses: Returns full text if < 100 words and no tags

**`removeSpeechTags(text)`** - Removes `<SPEECH>` tags from text for display

**Usage in Components:**
```javascript
import { extractSpeechText } from "@/utils/extractSpeechText";

// When AI response arrives
const speechText = extractSpeechText(response.data);
if (speechText && ttsEnabled) {
  speak(speechText); // Only speaks the extracted portion
}
```

## Configuration via Prompts

### Where to Configure

1. **Child Agent Prompt**: `backend1/controllers/ai.controller.js` - `buildChildPrompt()` function
2. **Parent Agent Prompt**: `backend1/controllers/ai.controller.js` - `buildParentPrompt()` function  
3. **Conversation Controller**: `backend1/controllers/conversationController.js` - System prompt
4. **Custom Agent Prompts**: Any custom system prompts in the database

### Prompt Structure

Add this section to your system prompts:

```
🎤🎤🎤 CRITICAL - SPEECH OUTPUT FORMATTING (TTS) 🎤🎤🎤:
Speech output is very important for accessibility. You need to specify what should be SPOKEN vs what should only be DISPLAYED.

FORMATTING RULES:
1. For responses with both visual and spoken content:
   - Put spoken content inside <SPEECH>...</SPEECH> tags
   - Content outside tags is for display only

2. For simple responses:
   - No tags needed - entire response will be spoken

3. For complex responses (lists, tables, formatted content):
   - ALWAYS wrap spoken summary in <SPEECH>...</SPEECH> tags
   - Keep speech content SHORT and NATURAL (30-50 words)
   - Focus on motivation and key points
   - Detailed lists should be outside tags (display only)
   - Always include student's name in speech portions
   - Use encouraging, conversational tone
```

## Best Practices

### ✅ DO:

1. **Use speech tags for complex content:**
   ```
   <SPEECH>Schüler, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen.</SPEECH>
   1. Erste Aufgabe...
   2. Zweite Aufgabe...
   ```

2. **Keep speech portions concise:**
   - 30-50 words for complex content
   - Focus on motivation and key points
   - Natural, conversational language

3. **Include student name in speech:**
   ```
   <SPEECH>Hallo Max! Du hast heute eine Matheaufgabe.</SPEECH>
   ```

4. **Provide summaries for lists:**
   ```
   <SPEECH>Du hast 4 Aufgaben zu erledigen. Probiere die ersten beiden zu lösen!</SPEECH>
   1. Aufgabe 1...
   2. Aufgabe 2...
   ```

### ❌ DON'T:

1. **Don't speak entire long lists:**
   ```
   ❌ <SPEECH>1. Zahl 11, 2. Zahl 19, 3. Zahl 31...</SPEECH>
   ```

2. **Don't forget speech tags for complex content:**
   ```
   ❌ Long numbered list without speech tags (entire list would be spoken)
   ```

3. **Don't make speech too verbose:**
   ```
   ❌ <SPEECH>Okay, lass mich dir erklären... [50+ words of preamble]</SPEECH>
   ```

## Testing

1. **Send a message** that triggers a response with lists or formatted content
2. **Check the console** for extracted speech text
3. **Verify TTS** only speaks the content inside `<SPEECH>` tags
4. **Verify display** shows full content without tags

## Files Modified

### Backend:
- `backend1/controllers/ai.controller.js` - Added prompt instructions and speech extraction
- `backend1/controllers/conversationController.js` - Added prompt instructions

### Frontend:
- `frontend/src/utils/extractSpeechText.js` - New utility functions
- `frontend/src/components/student/mobile/HomeworkChat.jsx` - Updated TTS calls

## Technical Details

### Speech Extraction Logic

1. **Priority Order:**
   - If `speechText` field exists in response object → use it
   - If `<SPEECH>` tags found → extract and join all matches
   - If no tags and text < 100 words → speak entire text
   - Otherwise → don't speak (null)

2. **Tag Parsing:**
   - Regex: `/<SPEECH>(.*?)<\/SPEECH>/gis`
   - Case-insensitive
   - Supports multiple `<SPEECH>` tags (joined with spaces)

3. **Display Cleaning:**
   - All `<SPEECH>` tags are removed from displayed content
   - Happens automatically in `parseResponseWithTips()` function

## Example Flow

**User asks:** "aber was muss ich tun"

**AI Response:**
```
<SPEECH>Schüler, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen.</SPEECH>
Schüler, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen:
1. Trage die Zahlen 11, 19, 31, 42, 57, 70, 86 und 94 in den Zahlenstrahl ein.
2. Trage die Zahlen 45, 63, 12, 36, 71, 54, 92 und 79 ein.
3. Überlege, welche Zahlen du eingetragen hast.
4. Denke nach, welche anderen Zahlen auch in den Zahlenstrahl passen könnten.

<SPEECH>Probiere zunächst, die ersten beiden Aufgaben zu lösen! Du kannst das schaffen! 💪</SPEECH>
```

**What gets spoken:**
"Schüler, du musst bei deiner Hausaufgabe folgende Aufgaben erledigen. Probiere zunächst, die ersten beiden Aufgaben zu lösen! Du kannst das schaffen! 💪"

**What gets displayed:**
The full message with numbered list (tags removed)

## Conclusion

This system provides fine-grained control over speech output while maintaining a natural conversation flow. By using simple markup tags in prompts, you can ensure that only appropriate content is spoken while full details remain visible for reading.

