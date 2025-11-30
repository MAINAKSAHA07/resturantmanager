'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

type OrderStatus = 'placed' | 'accepted' | 'in-kitchen' | 'ready' | 'served' | 'completed';

interface StatusStep {
  id: OrderStatus;
  label: string;
  color: string;
}

export default function OrderJourneyTimeline() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 800;
    const height = 200;
    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const steps: StatusStep[] = [
      { id: 'placed', label: 'Placed', color: '#7fc97f' },
      { id: 'accepted', label: 'Accepted', color: '#beaed4' },
      { id: 'in-kitchen', label: 'In Kitchen', color: '#fdc086' },
      { id: 'ready', label: 'Ready', color: '#ffff99' },
      { id: 'served', label: 'Served', color: '#386cb0' },
      { id: 'completed', label: 'Completed', color: '#bf5b17' },
    ];

    const xScale = d3
      .scalePoint<OrderStatus>()
      .domain(steps.map((s) => s.id))
      .range([0, innerWidth])
      .padding(0.5);

    // Draw connecting line
    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => d.x)
      .y((d) => d.y)
      .curve(d3.curveLinear);

    const lineData = steps.map((step) => ({
      x: xScale(step.id) || 0,
      y: innerHeight / 2,
    }));

    g.append('path')
      .datum(lineData)
      .attr('fill', 'none')
      .attr('stroke', '#e5e7eb')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Draw step circles
    const circles = g
      .selectAll('circle')
      .data(steps)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.id) || 0)
      .attr('cy', innerHeight / 2)
      .attr('r', 20)
      .attr('fill', (d) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 3);

    // Draw labels
    g.selectAll('.step-label')
      .data(steps)
      .enter()
      .append('text')
      .attr('class', 'step-label')
      .attr('x', (d) => xScale(d.id) || 0)
      .attr('y', innerHeight / 2 + 50)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('fill', '#374151')
      .attr('font-weight', '500')
      .text((d) => d.label);

    // Animated marker
    const marker = g
      .append('circle')
      .attr('r', 8)
      .attr('fill', '#f0027f')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0);

    const animateMarker = () => {
      steps.forEach((step, i) => {
        setTimeout(() => {
          setCurrentStep(i);
          const x = xScale(step.id) || 0;
          marker
            .transition()
            .duration(800)
            .attr('cx', x)
            .attr('cy', innerHeight / 2)
            .style('opacity', 1);
        }, i * 1000);
      });

      setTimeout(() => {
        marker.transition().duration(500).style('opacity', 0);
        setTimeout(animateMarker, 1000);
      }, steps.length * 1000);
    };

    animateMarker();

    // Animate circles based on current step
    const updateCircles = () => {
      circles
        .transition()
        .duration(300)
        .attr('r', (d, i) => (i === currentStep ? 25 : 20))
        .attr('opacity', (d, i) => (i <= currentStep ? 1 : 0.5));
    };
    updateCircles();

    return () => {
      // Cleanup if needed
    };
  }, [currentStep, mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-4xl h-[200px] flex items-center justify-center text-gray-400">
          Loading timeline...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <svg
        ref={svgRef}
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-4xl h-auto min-h-[150px] sm:min-h-[180px] lg:min-h-[200px]"
      />
    </div>
  );
}

