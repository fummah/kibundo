import React from 'react';

const Footer = ({
  showLinks = true,
  showCopyright = true,
  copyrightText = "© 2024 Kids Interest Survey Adventure. All rights reserved.",
  className = "",
  ...props
}) => {
  const footerLinks = [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
    { label: "Contact", href: "#contact" },
    { label: "Help", href: "#help" }
  ];

  return (
    <footer className={`w-full bg-secondary-background border-t border-border-primary mt-auto ${className}`} {...props}>
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 md:py-8">
          {/* Main Footer Content */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Footer Links */}
            {showLinks && (
              <nav className="flex flex-wrap items-center justify-center md:justify-start gap-4 md:gap-6">
                {footerLinks?.map((link, index) => (
                  <a
                    key={index}
                    href={link?.href}
                    className="text-sm text-text-secondary hover:text-text-primary transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent-teal rounded-sm px-2 py-1"
                  >
                    {link?.label}
                  </a>
                ))}
              </nav>
            )}

            {/* Social Links or Additional Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-muted">Made with</span>
                <span className="text-red-500 text-base">♥</span>
                <span className="text-sm text-text-muted">for kids</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          {showCopyright && (
            <div className="mt-4 pt-4 border-t border-border-secondary">
              <p className="text-xs md:text-sm text-text-muted text-center">
                {copyrightText}
              </p>
            </div>
          )}

          {/* Additional Footer Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-text-muted">
              A fun and engaging way for children to explore their interests and preferences
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

