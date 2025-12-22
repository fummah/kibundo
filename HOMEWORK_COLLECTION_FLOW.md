# Homework Collection Flow - Based on Figma Design

## Overview
This document describes the homework collection and scanning flow as specified in the [Figma design](https://www.figma.com/design/pPMoR8IkrWf21lyT7PGFXZ/Kibundo-Design?node-id=69-8337&t=fRpa6pswFq1dP4y0-1).

## Primary Focus: Collecting and Scanning Homeworks

### Flow Priority
1. **Scanning is the primary method** - Children should first attempt to scan their homework
2. **Voice/Text as fallback** - If there's nothing to scan, the child should enter the homework description via voice or text

## Implementation Details

### Entry Point
- **Screen**: `large-tablet-Childscreen-07-collect Chat` (Figma node: `69:8337`)
- **Component**: `HomeworkCollectChat.jsx` (prototype) / `HomeworkChat.jsx` (production)

### Input Methods (in order of priority)

#### 1. Camera Button (Primary - Scanning)
- **Location**: Chat bar, left side (x:198, y:16)
- **Icon**: Camera icon (24x21)
- **Function**: Opens device camera to capture homework image
- **Behavior**: 
  - Captures image
  - Sends to backend for OCR processing
  - Extracts text and questions from homework

#### 2. Gallery/Image Button (Secondary - Scanning)
- **Location**: Chat bar, next to camera (x:268, y:16)
- **Icon**: Image/gallery icon (27x22)
- **Function**: Opens file picker to select existing image
- **Behavior**: Same as camera - processes image for OCR

#### 3. Voice Input (Fallback - When nothing to scan)
- **Location**: Chat bar, right side (x:964, y:16)
- **Icon**: Microphone icon (20x29)
- **Function**: Records voice input and converts to text
- **Behavior**:
  - Shows when text input is empty
  - Records audio using Web Speech API
  - Converts speech to text
  - Populates text input field
  - User can edit before sending

#### 4. Text Input (Fallback - When nothing to scan)
- **Location**: Chat bar, center (x:340, y:16, width:600, height:48)
- **Placeholder**: "Hausaufgabe beschreiben..."
- **Function**: Manual text entry for homework description
- **Behavior**:
  - Accepts typed input
  - Can be used with voice input (voice populates this field)
  - Send button appears when text is entered

### UI Components from Figma

#### Header Banner
- **Text**: "Hausaufgaben sammeln"
- **Background**: #E27474 (red)
- **Icon**: Pencil/pen icon (40x47)
- **Location**: Top of chat window

#### Chat Window
- **Background**: #E1EAAC (light green)
- **Clouds**: Decorative background with 50% opacity
- **Messages**: Speech bubbles for child (left) and Kibundo (right)

#### Chat Bar (Footer)
- **Background**: White (#FFFFFF)
- **Shadow**: 0px 0px 4px rgba(0, 0, 0, 0.5)
- **Notch**: Centered ellipse (84x63) in #D9D9D9
- **Input area**: #DDE2AA background layer

### Message Flow

1. **Initial Greeting**: Kibundo asks "Hallo Michael, hattest Du einen schönen Tag in der Schule?"
2. **Child Response**: Child can respond via text or voice
3. **Homework Collection Prompt**: Kibundo asks about homework
4. **Child Input**: 
   - **Preferred**: Scan homework (camera/gallery)
   - **Fallback**: Describe homework (voice/text)
5. **Processing**: 
   - If scanned: OCR extraction and question parsing
   - If text/voice: Direct description saved
6. **Confirmation**: Kibundo confirms homework saved and asks if more to add

### Technical Implementation

#### Current Components
- **Production**: `frontend/src/components/student/mobile/HomeworkChat.jsx`
  - Full implementation with OCR, voice, text input
  - Integrated with backend API
  - Supports conversation flow
  
- **Prototype**: `frontend/src/students/homework/HomeworkCollectChat.jsx`
  - Mock implementation matching Figma design
  - Used for design reference

#### Backend Endpoints
- **Upload/Scan**: `POST /api/ai/upload` - Handles image upload and OCR
- **Text/Voice**: `POST /api/conversations/message` - Handles text/voice input
- **Chat**: `POST /api/ai/chat` - Handles conversation flow

### Key Requirements

✅ **Fully Implemented**:
- Camera button for scanning (primary method)
- Gallery button for image selection (secondary scanning)
- Voice input (microphone button) - fallback when nothing to scan
- Text input field - fallback when nothing to scan
- OCR processing for scanned images
- Conversation flow with Kibundo
- Flow prioritizes scanning over text/voice (buttons ordered: camera → gallery → voice → text)
- UI placeholder text encourages scanning: "Frag etwas zur Aufgabe oder lade ein Bild über die Kamera/Galerie hoch…"
- Voice input converts to text and populates input field
- Smooth fallback to voice/text when no image available

### Implementation Status

The production component `HomeworkChat.jsx` fully implements the Figma design requirements:
- **Button Order**: Camera → Gallery → Voice → Text (matches priority)
- **Placeholder Text**: Encourages scanning first
- **Voice Input**: Uses Web Speech API, converts to text, populates input field
- **Text Input**: Available as fallback when no image to scan
- **Mobile Layout**: Separate row for scan buttons on mobile devices

### Design Specifications

- **Font**: Nunito
- **Primary Colors**:
  - Red banner: #E27474
  - Light green background: #E1EAAC
  - Orange buttons: #EF7C2E
  - White chat bar: #FFFFFF
- **Button Size**: 48x48px
- **Input Field**: 600x48px
- **Border Radius**: 8px for inputs, 18px for speech bubbles

## Next Steps

1. Ensure `HomeworkChat.jsx` follows this priority flow
2. Add UI hints/prompts encouraging scanning first
3. Test voice-to-text conversion and input population
4. Verify fallback behavior when no image is available

