'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Brand {
  id: string;
  name: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Location {
  id: string;
  name: string;
  brandId: string;
  type: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export default function MultiBrandNetwork() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 900;
    const height = 600;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const brands: Brand[] = [
      { id: 'brand1', name: 'Fine Dining', type: 'brand' },
      { id: 'brand2', name: 'Cloud Kitchen', type: 'brand' },
      { id: 'brand3', name: 'Café', type: 'brand' },
    ];

    const locations: Location[] = [
      { id: 'loc1', name: 'Downtown', brandId: 'brand1', type: 'location' },
      { id: 'loc2', name: 'Mall', brandId: 'brand1', type: 'location' },
      { id: 'loc3', name: 'Kitchen A', brandId: 'brand2', type: 'location' },
      { id: 'loc4', name: 'Kitchen B', brandId: 'brand2', type: 'location' },
      { id: 'loc5', name: 'Main St', brandId: 'brand3', type: 'location' },
      { id: 'loc6', name: 'Airport', brandId: 'brand3', type: 'location' },
    ];

    const allNodes = [...brands, ...locations];

    // Links from brands to their locations
    const brandLocationLinks = locations.map((loc) => ({
      source: loc.brandId,
      target: loc.id,
    }));

    // Interconnections between locations (as shown in the image)
    const locationLinks = [
      { source: 'loc2', target: 'loc5' }, // Mall to Main St
      { source: 'loc1', target: 'loc3' }, // Downtown to Kitchen A
      { source: 'loc6', target: 'loc4' }, // Airport to Kitchen B
    ];

    const links = [...brandLocationLinks, ...locationLinks];

    // Explicit positioning for all three brands - matching the image layout
    // Fine Dining: top center
    brands[0].x = width / 2;
    brands[0].y = 120;
    brands[0].fx = brands[0].x;
    brands[0].fy = brands[0].y;

    // Cloud Kitchen: bottom-right
    brands[1].x = width / 2 + 180;
    brands[1].y = height - 120;
    brands[1].fx = brands[1].x;
    brands[1].fy = brands[1].y;

    // Café: bottom-left
    brands[2].x = width / 2 - 180;
    brands[2].y = height - 120;
    brands[2].fx = brands[2].x;
    brands[2].fy = brands[2].y;

    const simulation = d3
      .forceSimulation(allNodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance((d: any) => {
            // Shorter distance for brand-location links, longer for location-location links
            return d.source.type === 'brand' ? 100 : 150;
          })
      )
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => (d.type === 'brand' ? 70 : 40)))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(height / 2).strength(0.03));

    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#9ca3af')
      .attr('stroke-width', 2)
      .attr('stroke-opacity', 0.6);

    const node = svg
      .selectAll('.node')
      .data(allNodes)
      .enter()
      .append('g')
      .attr('class', 'node');

    // Brand circles (larger) - ensure all brands are rendered
    const brandNodes = node.filter((d: any) => d.type === 'brand');

    brandNodes
      .append('circle')
      .attr('r', 50)
      .attr('fill', '#386cb0')
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('opacity', 1); // Ensure visibility

    brandNodes
      .append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 5)
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#fff')
      .style('pointer-events', 'none'); // Prevent text from blocking interactions

    // Location circles (smaller)
    const locationNodes = node.filter((d: any) => d.type === 'location');
    locationNodes
      .append('circle')
      .attr('r', 35)
      .attr('fill', '#7fc97f')
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    locationNodes
      .append('text')
      .text((d: any) => d.name)
      .attr('text-anchor', 'middle')
      .attr('dy', 45)
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#374151');

    simulation.on('tick', () => {
      // Keep brands locked in their positions - never move them
      brands.forEach((brand) => {
        if (brand.fx !== null && brand.fy !== null) {
          brand.x = brand.fx;
          brand.y = brand.fy;
        }
      });

      // Constrain location nodes to viewBox bounds but allow natural positioning
      locations.forEach((loc: any) => {
        const radius = 40;
        if (loc.x !== undefined && loc.y !== undefined) {
          loc.x = Math.max(radius, Math.min(width - radius, loc.x));
          loc.y = Math.max(radius, Math.min(height - radius, loc.y));
        }
      });

      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x || 0},${d.y || 0})`);
    });

    // Let simulation run to position locations, then lock brands
    const timeoutId = setTimeout(() => {
      // Ensure all brands stay locked
      brands.forEach((brand) => {
        if (brand.fx !== null && brand.fy !== null) {
          brand.x = brand.fx;
          brand.y = brand.fy;
        }
        brand.fx = brand.x;
        brand.fy = brand.y;
      });

      // Let locations continue to move but keep them in view
      locations.forEach((location) => {
        location.fx = null;
        location.fy = null;
      });

      // Continue simulation but with reduced alpha for fine-tuning
      simulation.alpha(0.3).restart();
    }, 1500);

    // Stop simulation after layout settles
    setTimeout(() => {
      simulation.stop();
    }, 3000);

    return () => {
      simulation.stop();
      clearTimeout(timeoutId);
      svg.selectAll('*').remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-4xl h-[600px] flex items-center justify-center text-gray-400">
          Loading network...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <svg
        ref={svgRef}
        viewBox="150 0 600 600"
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
      />
    </div>
  );
}

