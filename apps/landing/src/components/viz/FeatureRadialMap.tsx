'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface FeatureNode {
  id: string;
  label: string;
  category: 'foh' | 'kitchen' | 'management';
  level: number;
  parent?: string;
}

export default function FeatureRadialMap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 600;
    const height = 600;
    const radius = Math.min(width, height) / 2 - 40;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Build hierarchical data structure
    const rootData: any = {
      id: 'root',
      label: 'Your Restaurant',
      category: 'root',
      level: 0,
      children: [
        {
          id: 'foh',
          label: 'Front of House',
          category: 'foh',
          level: 1,
          children: [
            { id: 'menu', label: 'Menu', category: 'foh', level: 2 },
            { id: 'orders', label: 'Orders', category: 'foh', level: 2 },
            { id: 'reservations', label: 'Reservations', category: 'foh', level: 2 },
            { id: 'floorplan', label: 'Floor Plan', category: 'foh', level: 2 },
          ],
        },
        {
          id: 'kitchen',
          label: 'Kitchen',
          category: 'kitchen',
          level: 1,
          children: [
            { id: 'kds', label: 'KDS', category: 'kitchen', level: 2 },
            { id: 'stations', label: 'Stations', category: 'kitchen', level: 2 },
            { id: 'tickets', label: 'Tickets', category: 'kitchen', level: 2 },
          ],
        },
        {
          id: 'management',
          label: 'Management',
          category: 'management',
          level: 1,
          children: [
            { id: 'invoices', label: 'Invoices', category: 'management', level: 2 },
            { id: 'reports', label: 'Reports', category: 'management', level: 2 },
            { id: 'gst', label: 'GST Reports', category: 'management', level: 2 },
          ],
        },
      ],
    };

    const colorMap: Record<string, string> = {
      foh: '#7fc97f',
      kitchen: '#fdc086',
      management: '#386cb0',
    };

    const partition = d3.partition().size([2 * Math.PI, radius]);

    const root = d3
      .hierarchy(rootData)
      .sum((d: any) => (d.level === 2 ? 1 : 0))
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    partition(root);

    const arc = d3
      .arc<any>()
      .startAngle((d) => d.x0)
      .endAngle((d) => d.x1)
      .innerRadius((d) => d.y0)
      .outerRadius((d) => d.y1);

    // Feature descriptions
    const featureDescriptions: Record<string, string> = {
      menu: 'Digital menu with images and descriptions',
      orders: 'Real-time order tracking and management',
      reservations: 'Table reservation system',
      floorplan: 'Visual floor plan with drag-and-drop tables',
      kds: 'Kitchen Display System for order tickets',
      stations: 'Station-based ticket routing',
      tickets: 'Real-time order tickets',
      invoices: 'GST-compliant invoice generation',
      reports: 'Daily sales and performance reports',
      gst: 'GST summary and breakdown reports',
      foh: 'Front of House: Customer-facing features',
      kitchen: 'Kitchen: Order preparation and KDS',
      management: 'Management: Reporting and analytics',
    };

    // Create tooltip
    const tooltip = d3
      .select('body')
      .append('div')
      .style('position', 'absolute')
      .style('padding', '12px 16px')
      .style('background', '#1f2937')
      .style('color', '#fff')
      .style('border-radius', '8px')
      .style('font-size', '13px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000)
      .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)')
      .style('max-width', '200px')
      .style('transition', 'opacity 0.2s');

    const paths = g
      .selectAll('path')
      .data(root.descendants().filter((d) => d.depth > 0))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => {
        if (d.depth === 1) {
          return colorMap[d.data.category] || '#666666';
        }
        return d3.color(colorMap[d.parent?.data.category || 'foh'])?.brighter(0.5).toString() || '#999';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('opacity', 0.8)
      .style('cursor', 'pointer')
      .style('transition', 'all 0.2s ease')
      .on('mouseover', function (event: any, d: any) {
        // Highlight this path
        const path = d3.select(this);
        path
          .style('opacity', 1)
          .attr('stroke-width', 4)
          .attr('stroke', '#fff')
          .transition()
          .duration(200)
          .style('filter', 'brightness(1.2) drop-shadow(0 4px 8px rgba(0,0,0,0.2))');

        // Highlight parent category
        if (d.depth === 2 && d.parent) {
          g.selectAll('path')
            .filter((p: any) => p.data.id === d.parent.data.id)
            .style('opacity', 1)
            .attr('stroke-width', 3);
        }

        // Show tooltip
        const description = featureDescriptions[d.data.id] || d.data.label;
        tooltip
          .html(`<div style="font-weight: 600; margin-bottom: 4px;">${d.data.label}</div><div style="font-size: 11px; opacity: 0.9;">${description}</div>`)
          .style('opacity', 1)
          .style('left', `${event.pageX + 15}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function (event: any, d: any) {
        // Reset this path
        const path = d3.select(this);
        path
          .style('opacity', 0.8)
          .attr('stroke-width', 2)
          .transition()
          .duration(200)
          .style('filter', 'none');

        // Reset parent category
        if (d.depth === 2 && d.parent) {
          g.selectAll('path')
            .filter((p: any) => p.data.id === d.parent.data.id)
            .style('opacity', 0.8)
            .attr('stroke-width', 2);
        }

        // Hide tooltip
        tooltip.style('opacity', 0);
      })
      .on('click', function (event: any, d: any) {
        // Add click animation with opacity pulse
        const path = d3.select(this);
        path
          .transition()
          .duration(100)
          .style('opacity', 0.5)
          .transition()
          .duration(100)
          .style('opacity', 1)
          .transition()
          .duration(100)
          .style('opacity', 0.8);
      });

    // Add labels for level 1 (categories) with interaction
    const categoryLabels = g
      .selectAll('.category-label')
      .data(root.children || [])
      .enter()
      .append('text')
      .attr('class', 'category-label')
      .attr('transform', (d: any) => {
        const x = ((d.x0 + d.x1) / 2) * (180 / Math.PI);
        const y = (d.y0 + d.y1) / 2;
        const rotate = x < 90 || x > 270 ? x : x + 180;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 90 || x > 270 ? 0 : 180})`;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1f2937')
      .style('cursor', 'pointer')
      .style('pointer-events', 'all')
      .text((d: any) => d.data.label)
      .on('mouseover', function (event: any, d: any) {
        d3.select(this)
          .attr('font-size', '16px')
          .attr('font-weight', '700')
          .attr('fill', colorMap[d.data.category]);

        // Highlight all features in this category
        g.selectAll('path')
          .filter((p: any) => p.parent?.data.id === d.data.id)
          .style('opacity', 1)
          .attr('stroke-width', 3);
      })
      .on('mouseout', function (event: any, d: any) {
        d3.select(this)
          .attr('font-size', '14px')
          .attr('font-weight', '600')
          .attr('fill', '#1f2937');

        // Reset features
        g.selectAll('path')
          .filter((p: any) => p.parent?.data.id === d.data.id)
          .style('opacity', 0.8)
          .attr('stroke-width', 2);
      });

    // Add center circle with interaction
    const centerCircle = g
      .append('circle')
      .attr('r', radius * 0.15)
      .attr('fill', '#f0027f')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('cursor', 'pointer')
      .on('mouseover', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', radius * 0.17)
          .attr('stroke-width', 4);
      })
      .on('mouseout', function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', radius * 0.15)
          .attr('stroke-width', 3);
      })
      .on('click', function () {
        // Reset all paths on center click
        paths
          .style('opacity', 0.8)
          .attr('stroke-width', 2)
          .transition()
          .duration(300)
          .attr('transform', 'scale(1)');
      });

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#fff')
      .text('Your Restaurant');

    return () => {
      svg.selectAll('*').remove();
      d3.select('body').selectAll('.d3-tooltip').remove();
      tooltip.remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-2xl h-[600px] flex items-center justify-center text-gray-400">
          Loading feature map...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-8">
      <svg
        ref={svgRef}
        viewBox="0 0 600 600"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-2xl h-auto"
      />
    </div>
  );
}

