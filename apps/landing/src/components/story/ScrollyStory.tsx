'use client';

import { useState, useEffect, useRef } from 'react';
import HeroSystemGraph from '../viz/HeroSystemGraph';
import OrderJourneyTimeline from '../viz/OrderJourneyTimeline';
import MiniDashboardDemo from '../viz/MiniDashboardDemo';
import FloorPlanPreview from '../viz/FloorPlanPreview';
import MultiBrandNetwork from '../viz/MultiBrandNetwork';

interface Scene {
    id: string;
    title: string;
    description: string;
    component: React.ReactNode;
    bgGradient: string;
}

export default function ScrollyStory() {
    const [activeSceneIndex, setActiveSceneIndex] = useState(0);
    const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

    const scenes: Scene[] = [
        {
            id: 'floor-plan',
            title: 'It Starts on the Floor',
            description: 'Friday night chaos? Not anymore. Manage your tables visually. Drag, drop, and seat guests with a real-time floor plan that matches your actual restaurant layout.',
            component: <FloorPlanPreview />,
            bgGradient: 'from-blue-50 to-indigo-50',
        },
        {
            id: 'order-journey',
            title: 'The Perfect Order Journey',
            description: 'No more lost tickets. Orders flow instantly from the table to the kitchen. Every status update is tracked, timed, and transparent.',
            component: <OrderJourneyTimeline />,
            bgGradient: 'from-green-50 to-emerald-50',
        },
        {
            id: 'system-graph',
            title: 'A Connected Ecosystem',
            description: 'Everything talks to everything. Web ordering, KDS, Back Office, and Reports are all synced in real-time. One source of truth for your entire operation.',
            component: <HeroSystemGraph />,
            bgGradient: 'from-purple-50 to-fuchsia-50',
        },
        {
            id: 'dashboard',
            title: 'Real-Time Command Center',
            description: 'While you run the floor, your dashboard watches the numbers. Live sales, order counts, and revenue trends at your fingertips.',
            component: <MiniDashboardDemo />,
            bgGradient: 'from-orange-50 to-amber-50',
        },
        {
            id: 'multi-brand',
            title: 'Scale Without Limits',
            description: 'One location or one hundred. Fine dining or cloud kitchen. Manage multiple brands and outlets from a single login. Growth made simple.',
            component: <MultiBrandNetwork />,
            bgGradient: 'from-slate-50 to-gray-50',
        },
    ];

    useEffect(() => {
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        const observerOptions = {
            root: null,
            rootMargin: isMobile ? '-30% 0px -30% 0px' : '-40% 0px -40% 0px', // More lenient on mobile
            threshold: 0,
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    setActiveSceneIndex(index);
                }
            });
        }, observerOptions);

        stepRefs.current.forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => {
            stepRefs.current.forEach((ref) => {
                if (ref) observer.unobserve(ref);
            });
        };
    }, []);

    return (
        <section id="how-it-works" className="relative w-full bg-white overflow-visible pt-8 sm:pt-12 lg:pt-16">
            {/* Sticky Visualization Container */}
            <div className="sticky top-16 h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-4rem)] w-full flex items-center justify-center overflow-hidden z-0">
                <div className={`absolute inset-0 bg-gradient-to-br ${scenes[activeSceneIndex].bgGradient} transition-colors duration-1000`} />

                <div className="relative w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-12 h-full flex items-center justify-center lg:justify-end">
                    {/* We render ALL components but control opacity/visibility for smooth transitions */}
                    {scenes.map((scene, index) => (
                        <div
                            key={scene.id}
                            className={`absolute inset-0 flex items-center justify-center lg:justify-end lg:pr-8 transition-all duration-700 transform ${index === activeSceneIndex
                                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto z-10'
                                : 'opacity-0 translate-y-8 scale-95 pointer-events-none z-0'
                                }`}
                        >
                            <div className="w-full lg:w-1/2 xl:w-2/5 h-full flex items-center justify-center p-2 sm:p-4 lg:p-4 lg:pl-0">
                                {/* Add a glassmorphism card container for the viz */}
                                <div className="bg-white/90 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-2xl p-2 sm:p-4 lg:p-6 w-full max-w-2xl border border-gray-200 flex items-center justify-center">
                                    {scene.component}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Scrolling Text Steps */}
            <div className="relative z-20 -mt-[50vh] sm:-mt-[60vh] lg:-mt-[calc(100vh-4rem)]">
                {scenes.map((scene, index) => (
                    <div
                        key={scene.id}
                        data-index={index}
                        ref={(el) => { stepRefs.current[index] = el; }}
                        className="min-h-[50vh] sm:min-h-[60vh] lg:min-h-screen flex items-end pb-12 sm:pb-16 lg:pb-20 lg:items-center lg:pb-0 justify-center lg:justify-start px-4 sm:px-6 lg:px-12 max-w-7xl mx-auto pointer-events-none"
                    >
                        <div className="w-full max-w-md lg:max-w-sm xl:max-w-md bg-white/95 backdrop-blur-lg p-4 sm:p-6 lg:p-8 rounded-xl sm:rounded-2xl shadow-xl border border-gray-200 pointer-events-auto transform transition-all duration-500 hover:scale-105 lg:ml-8 lg:mr-auto">
                            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">
                                Step 0{index + 1}
                            </div>
                            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 lg:mb-4">
                                {scene.title}
                            </h2>
                            <p className="text-sm sm:text-base lg:text-lg text-gray-700 leading-relaxed">
                                {scene.description}
                            </p>
                        </div>
                    </div>
                ))}

                {/* Extra space at the bottom to allow scrolling past the last item */}
                <div className="h-[30vh] sm:h-[40vh] lg:h-[50vh]" />
            </div>
        </section>
    );
}
