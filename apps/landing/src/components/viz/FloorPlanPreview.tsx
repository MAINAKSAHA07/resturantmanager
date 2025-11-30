'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Table {
  id: string;
  x: number;
  y: number;
  seats: number;
  status: 'available' | 'seated' | 'cleaning' | 'held';
  orders?: number;
}

export default function FloorPlanPreview() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 700;
    const height = 500;
    const margin = 40;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin},${margin})`);

    // Mock floor plan with tables
    const tables: Table[] = [
      { id: 'T1', x: 100, y: 100, seats: 2, status: 'available' },
      { id: 'T2', x: 250, y: 100, seats: 4, status: 'seated', orders: 2 },
      { id: 'T3', x: 400, y: 100, seats: 2, status: 'available' },
      { id: 'T4', x: 550, y: 100, seats: 6, status: 'seated', orders: 1 },
      { id: 'T5', x: 100, y: 250, seats: 4, status: 'cleaning' },
      { id: 'T6', x: 250, y: 250, seats: 2, status: 'available' },
      { id: 'T7', x: 400, y: 250, seats: 4, status: 'held' },
      { id: 'T8', x: 550, y: 250, seats: 2, status: 'seated', orders: 1 },
      { id: 'T9', x: 175, y: 350, seats: 8, status: 'seated', orders: 3 },
      { id: 'T10', x: 400, y: 350, seats: 4, status: 'available' },
    ];

    const statusColors: Record<string, string> = {
      available: '#7fc97f',
      seated: '#386cb0',
      cleaning: '#ffff99',
      held: '#fdc086',
    };

    const statusLabels: Record<string, string> = {
      available: 'Available',
      seated: 'Seated',
      cleaning: 'Cleaning',
      held: 'Held',
    };

    // Draw tables
    const tableGroups = g
      .selectAll('g.table')
      .data(tables)
      .enter()
      .append('g')
      .attr('class', 'table')
      .attr('transform', (d) => `translate(${d.x},${d.y})`);

    tableGroups
      .append('rect')
      .attr('width', 60)
      .attr('height', 60)
      .attr('rx', 8)
      .attr('fill', (d) => statusColors[d.status])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('stroke-width', 4).attr('opacity', 0.8);
      })
      .on('mouseout', function (event, d) {
        d3.select(this).attr('stroke-width', 2).attr('opacity', 1);
      });

    tableGroups
      .append('text')
      .attr('x', 30)
      .attr('y', 25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#fff')
      .text((d) => d.id);

    tableGroups
      .append('text')
      .attr('x', 30)
      .attr('y', 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('fill', '#fff')
      .text((d) => `${d.seats} seats`);

    // Tooltip
    const tooltip = d3
      .select('body')
      .append('div')
      .style('position', 'absolute')
      .style('padding', '8px 12px')
      .style('background', '#1f2937')
      .style('color', '#fff')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('z-index', 1000);

    tableGroups.on('mouseover', function (event, d) {
      tooltip
        .style('opacity', 1)
        .html(
          `<strong>${d.id}</strong><br/>${d.seats} seats<br/>${statusLabels[d.status]}${d.orders ? `<br/>${d.orders} active order${d.orders > 1 ? 's' : ''}` : ''}`
        )
        .style('left', `${event.pageX + 10}px`)
        .style('top', `${event.pageY - 10}px`);
    });

    tableGroups.on('mouseout', function () {
      tooltip.style('opacity', 0);
    });

    // Legend
    const legend = g
      .append('g')
      .attr('transform', `translate(${width - 200},${height - 150})`);

    const legendItems = Object.entries(statusLabels);

    legendItems.forEach(([status, label], i) => {
      const legendItem = legend
        .append('g')
        .attr('transform', `translate(0,${i * 25})`);

      legendItem
        .append('rect')
        .attr('width', 20)
        .attr('height', 20)
        .attr('rx', 4)
        .attr('fill', statusColors[status]);

      legendItem
        .append('text')
        .attr('x', 30)
        .attr('y', 15)
        .attr('font-size', '12px')
        .attr('fill', '#374151')
        .text(label);
    });

    return () => {
      tooltip.remove();
      svg.selectAll('*').remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-3xl h-[500px] flex items-center justify-center text-gray-400 bg-gray-50 rounded-lg">
          Loading floor plan...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <svg
        ref={svgRef}
        viewBox="0 0 700 500"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-3xl h-auto min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] bg-gray-50 rounded-lg"
      />
    </div>
  );
}

