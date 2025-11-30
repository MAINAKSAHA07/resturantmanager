'use client';

import { useState, useEffect } from 'react';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false); // Close mobile menu after navigation
  };

  // Shared class for the shiny text effect
  const shinyTextClass = "bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-flow bg-[length:200%_auto]";

  // Shared class for the shiny button effect
  const shinyButtonClass = "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 animate-flow bg-[length:200%_auto] text-white hover:shadow-lg hover:opacity-90 transition-all transform hover:-translate-y-0.5";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b ${isScrolled
          ? 'bg-white/90 backdrop-blur-md shadow-lg border-gray-100'
          : 'bg-white/80 backdrop-blur-sm border-transparent'
        }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => scrollToSection('hero')}
              className={`text-xl sm:text-2xl font-bold transition-colors hover:opacity-80 ${shinyTextClass}`}
            >
              RestaurantOS
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <button
              onClick={() => scrollToSection('product')}
              className={`font-medium text-sm lg:text-base transition-all hover:opacity-80 ${shinyTextClass}`}
            >
              Product
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className={`font-medium text-sm lg:text-base transition-all hover:opacity-80 ${shinyTextClass}`}
            >
              Features
            </button>
            <button
              onClick={() => scrollToSection('demo')}
              className={`font-medium text-sm lg:text-base transition-all hover:opacity-80 ${shinyTextClass}`}
            >
              Demo
            </button>
          </div>

          {/* Desktop CTA Button */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => scrollToSection('features')}
              className={`text-sm lg:text-base px-4 lg:px-6 py-2 lg:py-3 rounded-lg font-medium shadow-sm ${shinyButtonClass}`}
            >
              Book a Demo
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-gray-700 hover:text-accent-blue transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMobileMenuOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/90 backdrop-blur-md">
            <div className="px-4 pt-2 pb-4 space-y-1">
              <button
                onClick={() => scrollToSection('product')}
                className={`block w-full text-left px-4 py-3 rounded-lg transition-colors font-medium hover:bg-gray-50/50 ${shinyTextClass}`}
              >
                Product
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`block w-full text-left px-4 py-3 rounded-lg transition-colors font-medium hover:bg-gray-50/50 ${shinyTextClass}`}
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection('demo')}
                className={`block w-full text-left px-4 py-3 rounded-lg transition-colors font-medium hover:bg-gray-50/50 ${shinyTextClass}`}
              >
                Demo
              </button>
              <button
                onClick={() => scrollToSection('features')}
                className={`block w-full mt-4 text-center px-4 py-3 rounded-lg font-medium ${shinyButtonClass}`}
              >
                Book a Demo
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
