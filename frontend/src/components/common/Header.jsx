import React, { useState } from 'react';
import Button from '../ui/Button';

const Header = ({
  title = "Kids Interest Survey Adventure",
  showNavigation = true,
  showAudioControls = false,
  audioSrc = "",
  className = "",
  ...props
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const navigationItems = [
    { label: "Activity Preference", href: "/activity-preference" },
    { label: "Color Preference", href: "/color-preference" },
    { label: "Creative Activity", href: "/creative-activity-preference" },
    { label: "Dinosaurs vs Unicorns", href: "/dinosaurs-vs-unicorns" },
    { label: "Tree House vs Castle", href: "/tree-house-vs-castle" },
    { label: "Robot vs Magic", href: "/robot-vs-magic" }
  ];

  return (
    <header className={`w-full bg-primary-background ${className}`} {...props}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4 md:py-6">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-text-primary">
              {title}
            </h1>
          </div>

          {/* Hamburger Menu (Mobile) */}
          {showNavigation && (
            <button
              className="block lg:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {/* Desktop Navigation */}
          {showNavigation && (
            <nav className="hidden lg:flex items-center space-x-4">
              {navigationItems?.map((item, index) => (
                <Button
                  key={index}
                  text={item?.label}
                  variant="ghost"
                  size="small"
                  className="text-sm hover:bg-accent-green hover:text-text-primary transition-colors"
                  onClick={() => window.location.href = item?.href}
                />
              ))}
            </nav>
          )}

          {/* Audio Controls */}
          {showAudioControls && audioSrc && (
            <div className="hidden md:flex items-center">
              <audio controls className="h-8">
                <source src={audioSrc} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
            </div>
          )}
        </div>

        {/* Mobile Navigation Menu */}
        {showNavigation && (
          <nav className={`${menuOpen ? 'block' : 'hidden'} lg:hidden pb-4 border-t border-border-primary mt-4 pt-4`}>
            <div className="flex flex-col space-y-2">
              {navigationItems?.map((item, index) => (
                <Button
                  key={index}
                  text={item?.label}
                  variant="ghost"
                  size="medium"
                  className="text-left justify-start text-sm hover:bg-accent-green hover:text-text-primary transition-colors"
                  onClick={() => {
                    window.location.href = item?.href;
                    setMenuOpen(false);
                  }}
                />
              ))}
            </div>
            
            {/* Mobile Audio Controls */}
            {showAudioControls && audioSrc && (
              <div className="mt-4 pt-4 border-t border-border-primary">
                <audio controls className="w-full h-8">
                  <source src={audioSrc} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;

