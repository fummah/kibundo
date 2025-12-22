import React from 'react';
import Header from './Header';
import Footer from './Footer';

const Layout = ({
  children,
  title,
  showHeader = true,
  showFooter = true,
  headerProps = {},
  footerProps = {},
  backgroundImage,
  backgroundColor = "bg-background-main",
  className = "",
  ...props
}) => {
  const layoutStyles = backgroundImage ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: 'fixed'
  } : {};

  return (
    <div 
      className={`min-h-screen flex flex-col ${backgroundColor} ${className}`}
      style={layoutStyles}
      {...props}
    >
      {/* Header */}
      {showHeader && (
        <Header 
          title={title}
          {...headerProps}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 w-full">
        <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 md:py-8 lg:py-12">
            {children}
          </div>
        </div>
      </main>

      {/* Footer */}
      {showFooter && (
        <Footer {...footerProps} />
      )}

      {/* Background Overlay for better text readability when background image is used */}
      {backgroundImage && (
        <div className="fixed inset-0 bg-white bg-opacity-80 -z-10" />
      )}
    </div>
  );
};

export default Layout;

