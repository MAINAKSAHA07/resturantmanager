import React from 'react';

const features = [
    {
        title: 'Multi-Tenant Platform',
        description: 'Manage multiple brands or locations from a single dashboard. Each tenant gets their own isolated data and branding.',
        icon: '🏢',
        color: 'bg-blue-100 text-blue-600',
    },
    {
        title: 'Interactive Floor Plan',
        description: 'Drag-and-drop table management with real-time status updates. See who is seated, ordering, or ready to pay instantly.',
        icon: '🪑',
        color: 'bg-purple-100 text-purple-600',
    },
    {
        title: 'Digital Menu & Ordering',
        description: 'Beautiful, responsive digital menu for customers. Includes playful "Floating Food Emojis" and a smooth cart experience.',
        icon: '📱',
        color: 'bg-green-100 text-green-600',
    },
    {
        title: 'Kitchen Display System',
        description: 'Replace paper tickets with a real-time KDS. Track order status from "In Kitchen" to "Ready" to "Served".',
        icon: '👨‍🍳',
        color: 'bg-orange-100 text-orange-600',
    },
    {
        title: 'Smart Coupon System',
        description: 'Create and manage discount codes. Automatic validation and tax calculation (GST/VAT) included.',
        icon: '🏷️',
        color: 'bg-pink-100 text-pink-600',
    },
    {
        title: 'Real-time Analytics',
        description: 'Track sales, popular items, and table turnover in real-time. Make data-driven decisions to grow your business.',
        icon: '📊',
        color: 'bg-indigo-100 text-indigo-600',
    },
];

export default function FeaturesGrid() {
    return (
        <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                        Everything you need to run a modern restaurant
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Powerful features built for speed, reliability, and growth.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <div
                            key={index}
                            className="group p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-accent-blue transition-colors">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
