'use client';

import Navbar from '@/components/Navbar';
import HeroSystemGraph from '@/components/viz/HeroSystemGraph';
import ScrollyStory from '@/components/story/ScrollyStory';
import FeaturesGrid from '@/components/FeaturesGrid';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Section 1: Hero */}
      <section id="hero" className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white to-gray-50/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue font-medium text-sm">
              🚀 Now available for multi-location chains
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-6 tracking-tight">
              The Operating System for <br className="hidden sm:block" />
              <span className="bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">Modern Restaurants</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              Streamline your entire operation from floor plan to kitchen display.
              One platform to manage orders, payments, and multi-brand menus.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center px-4">
              <button className="btn-primary text-lg px-8 py-4 shadow-lg shadow-accent-blue/20 hover:shadow-accent-blue/30 transition-all transform hover:-translate-y-1">
                Start Free Trial
              </button>
              <button className="btn-secondary text-lg px-8 py-4 hover:bg-gray-50 transition-all">
                View Live Demo
              </button>
            </div>
          </div>
          <div className="relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-accent-blue to-accent-purple rounded-2xl blur opacity-20"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <HeroSystemGraph />
            </div>
          </div>
        </div>
      </section>

      {/* Scrollytelling Experience */}
      <div id="product">
        <ScrollyStory />
      </div>

      {/* Features Grid */}
      <FeaturesGrid />

      {/* Who This Is For */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-16">
            Trusted by diverse food businesses
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: '🏪', title: 'Single Outlets', desc: 'Modernize your local favorite spot.' },
              { icon: '🏢', title: 'Multi-Location', desc: 'Centralized control for chains.' },
              { icon: '🍳', title: 'Cloud Kitchens', desc: 'Optimized for delivery-first models.' },
              { icon: '🏬', title: 'Food Courts', desc: 'Unified management for multiple vendors.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-8 text-center border border-gray-100">
                <div className="text-5xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing & CTA */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-accent-blue to-accent-purple rounded-3xl shadow-2xl overflow-hidden text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>

            <div className="relative p-12 sm:p-16 text-center">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
                Ready to transform your restaurant?
              </h2>
              <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
                Join hundreds of restaurants using RestaurantOS to streamline operations and delight customers.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button className="bg-white text-accent-blue px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-lg">
                  Book a Free Demo
                </button>
                <button className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-colors">
                  View Pricing
                </button>
              </div>

              <p className="mt-8 text-sm text-blue-200 opacity-80">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <h4 className="text-2xl font-bold mb-4 bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent inline-block">RestaurantOS</h4>
              <p className="text-gray-400 max-w-sm leading-relaxed">
                The complete operating system for modern restaurants. From chaos to calm, in minutes.
              </p>
            </div>
            <div>
              <h5 className="font-bold mb-4 text-gray-200">Product</h5>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#product" className="hover:text-white transition-colors">How it works</a></li>
                <li><a href="#demo" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4 text-gray-200">Company</h5>
              <ul className="space-y-3 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} RestaurantOS. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-white transition-colors">Twitter</a>
              <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
              <a href="#" className="hover:text-white transition-colors">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
