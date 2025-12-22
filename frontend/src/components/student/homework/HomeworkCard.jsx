import React from 'react';

import icon01Url from '@/assets/icons/icon-01.svg'; // calculator / task
import icon05Url from '@/assets/icons/icon-05.svg'; // book
import icon07Url from '@/assets/icons/icon-07.svg'; // page
import icon24Url from '@/assets/icons/icon-24.svg'; // calendar

import iconMathUrl from '@/assets/icons/icon-math.png';
import iconDeutschUrl from '@/assets/icons/icon-deutsch.png';
import iconSonstigesUrl from '@/assets/icons/icon-sonstiges.png';

import iconEditButtonUrl from '@/assets/icons/icon-edit-button.svg';
import iconDeleteButtonUrl from '@/assets/icons/icon-delete-button.svg';

const HomeworkCard = ({
  scan = {},
  isPortrait = false,
  onCardClick,
  onEditClick,
  onDeleteClick
}) => {
  const scanId = scan.id || scan.scanId;

  /* ---------------- SUBJECT DETECTION ---------------- */
  const rawText = (scan.raw_text || '').toLowerCase();

  const isMath =
    rawText.includes('mathe') ||
    rawText.includes('math') ||
    rawText.includes('rechnen') ||
    rawText.includes('plus') ||
    rawText.includes('minus') ||
    rawText.includes('mal') ||
    rawText.includes('geteilt') ||
    rawText.includes('multiplikation') ||
    rawText.includes('addition') ||
    rawText.includes('subtraktion') ||
    rawText.includes('division');

  const isGerman =
    rawText.includes('deutsch') ||
    rawText.includes('lesen') ||
    rawText.includes('schreiben') ||
    rawText.includes('satz') ||
    rawText.includes('wort');

  const subjectName = isMath ? 'Mathe' : isGerman ? 'Deutsch' : 'Sonstiges';
  const subjectIcon = isMath ? iconMathUrl : isGerman ? iconDeutschUrl : iconSonstigesUrl;

  /* ---------------- TASK TITLE ---------------- */
  let taskTitle = 'Hausaufgabe';

  if (scan.task_type) {
    taskTitle = scan.task_type.slice(0, 40);
  } else if (scan.raw_text) {
    taskTitle = scan.raw_text.split(/\s+/).slice(0, 5).join(' ');
  }

  /* ---------------- PAGE / SOURCE ---------------- */
  let sourceText = 'Arbeitsblatt';
  const pageMatch = scan.raw_text?.match(/(?:seite|page|s\.|p\.)\s*(\d+)/i);
  if (pageMatch) sourceText = `Seite ${pageMatch[1]}`;

  /* ---------------- DATE ---------------- */
  let dateText = 'bis diesen Mittwoch';
  const now = new Date();

  if (scan.created_at) {
    const due = new Date(new Date(scan.created_at).getTime() + 3 * 86400000);
    const diff = Math.ceil((due - now) / 86400000);

    if (diff <= 0) dateText = 'bis heute';
    else if (diff === 1) dateText = 'bis morgen';
    else if (diff <= 7) {
      const days = ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'];
      dateText = `bis diesen ${days[due.getDay()]}`;
    } else {
      dateText = 'bis nächste Woche';
    }
  }

  /* ---------------- CARD CLICK ---------------- */
  const handleCardClick = () => {
    onCardClick?.(scanId);
  };

  // Determine background color based on subject
  const backgroundColor = isMath 
    ? '#E8F7F5'  // Light blue for Math
    : isGerman 
    ? '#EFD5D5'  // Light pink for Deutsch
    : 'rgb(219, 239, 206)';  // Light green for Sonstiges

  // Check if homework is completed - only grey out if status is explicitly 'completed'
  // This ensures "Do it later" cards are not greyed out
  const isCompleted = scan.status === 'completed';

  return (
    <div
      onClick={handleCardClick}
      className={`relative transition cursor-pointer hover:opacity-90`}
      style={{ 
        height: isPortrait ? 220 : 200,
        border: '5px solid white',
        borderRadius: '16px',
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'relative',
        pointerEvents: 'auto'
      }}
    >
      {/* Completed Checkmark - Top Right (Circular, overlapping border) - positioned relative to outer card */}
      {isCompleted && (
        <div
          style={{
            position: 'absolute',
            top: '-8px', // Slightly overlapping the card border
            right: '-8px', // Slightly overlapping the card border
            width: '60px',
            height: '60px',
            borderRadius: '50%', // Circular
            backgroundColor: '#FF7831',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
            opacity: 1 // Full opacity - not affected by card greying
          }}
        >
          <svg width="30" height="30" viewBox="0 0 14 14" fill="none">
            <path d="M11.6667 3.5L5.25 9.91667L2.33334 7" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* BACKGROUND */}
      <div 
        className="relative h-full rounded-xl overflow-hidden p-4" 
        style={{ 
          backgroundColor,
          opacity: isCompleted ? 0.6 : 1 // Apply opacity only to background
        }}
      >
        {/* TITLE */}
        <h2 className="text-center font-extrabold text-2xl" style={{ fontFamily: 'Nunito', color: '#1a1a1a',fontSize: '16px' }}>
          {subjectName}
        </h2>

        <hr className="my-2" style={{ borderColor: '#1a1a1a' }} />

        <div className="flex gap-4 mt-3">

          {/* SUBJECT ICON */}
          <div className="w-20 h-20 bg-white border-2 border-gray-500 rounded-full flex items-center justify-center">
            <img src={subjectIcon} alt={subjectName} className="w-14 h-14 object-contain" />
          </div>

          {/* DETAILS */}
          <div className="flex-1 flex flex-col gap-2">

            {/* TASK */}
            <div className="flex items-center gap-2">
              <img src={icon01Url} className="w-4 h-4" />
              <span className="text-sm" style={{ fontFamily: 'Nunito', color: '#1a1a1a', fontSize: '16px' }}>{taskTitle}</span>
            </div>

            {/* SOURCE */}
            <div className="flex items-center gap-2">
              <img src={icon07Url} className="w-4 h-4" />
              <span className="text-sm" style={{ fontFamily: 'Nunito', color: '#1a1a1a', fontSize: '16px' }}>{sourceText}</span>
            </div>

            {/* DATE */}
            <div className="relative flex items-center gap-2">
              <div className="absolute inset-0 bg-white rounded-lg" />
              <img src={icon24Url} className="w-4 h-4 z-10 ml-2" />
              <span className="z-10 font-bold text-sm px-2 py-1" style={{ fontFamily: 'Nunito', color: '#1a1a1a', fontSize: '16px' }}>
                {dateText}
              </span>
            </div>

          </div>
        </div>

      </div>

      {/* ACTION BUTTONS - positioned to overlap border at bottom right (same as completed badge) */}
      {/* Buttons are visible even for completed cards */}
      <div 
        className="absolute flex gap-2" 
        style={{ 
          bottom: '-8px', // Overlapping the card border (same as completed badge)
          right: '-8px',  // Overlapping the card border (same as completed badge)
          zIndex: 20,
          pointerEvents: 'auto'
        }}
      >
        {/* EDIT - disabled for completed homework */}
        <button
          onClick={(e) => {
            if (e && e.stopPropagation) {
              e.stopPropagation();
            }
            if (!isCompleted) {
              onEditClick?.(scanId, e);
            }
          }}
          disabled={isCompleted}
          className={`flex items-center justify-center ${isCompleted ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            width: '48px',
            height: '48px',
            pointerEvents: isCompleted ? 'none' : 'auto',
            opacity: isCompleted ? 0.5 : 1
          }}
        >
          <img 
            src={iconEditButtonUrl} 
            alt="Edit" 
            className="w-full h-full object-contain"
          />
        </button>

        {/* DELETE */}
        <button
          onClick={(e) => {
            if (e && e.stopPropagation) {
              e.stopPropagation();
            }
            onDeleteClick?.(scanId, e);
          }}
          className="flex items-center justify-center"
          style={{
            width: '48px',
            height: '48px'
          }}
        >
          <img 
            src={iconDeleteButtonUrl} 
            alt="Delete" 
            className="w-full h-full object-contain"
          />
        </button>
      </div>
    </div>
  );
};

export default HomeworkCard;
