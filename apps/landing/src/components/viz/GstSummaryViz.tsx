'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface TaxData {
  type: string;
  amount: number;
  color: string;
}

export default function GstSummaryViz() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 600;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 60, left: 60 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const data: TaxData[] = [
      { type: 'CGST', amount: 12500, color: '#7fc97f' },
      { type: 'SGST', amount: 12500, color: '#beaed4' },
      { type: 'IGST', amount: 8500, color: '#fdc086' },
    ];

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.type))
      .range([0, innerWidth])
      .padding(0.3);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.amount) || 0] as [number, number])
      .nice()
      .range([innerHeight, 0]);

    // Draw bars
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', (d) => xScale(d.type) || 0)
      .attr('y', (d) => yScale(d.amount))
      .attr('width', xScale.bandwidth())
      .attr('height', (d) => innerHeight - yScale(d.amount))
      .attr('fill', (d) => d.color)
      .attr('rx', 6)
      .attr('ry', 6)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('opacity', 0.8);
      })
      .on('mouseout', function () {
        d3.select(this).attr('opacity', 1);
      });

    // Add value labels on bars
    g.selectAll('.bar-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d) => (xScale(d.type) || 0) + xScale.bandwidth() / 2)
      .attr('y', (d) => yScale(d.amount) - 5)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .attr('fill', '#1f2937')
      .text((d) => `₹${d3.format(',')(d.amount)}`);

    // X axis
    const xAxis = d3.axisBottom(xScale);
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '14px')
      .style('fill', '#6b7280')
      .style('font-weight', '500');

    // Y axis
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => `₹${d3.format('.1s')(Number(d))}`);
    g.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6b7280');

    // Title
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '18px')
      .style('font-weight', '600')
      .style('fill', '#1f2937')
      .text('GST Breakdown (Monthly)');

    // Total label
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#1f2937')
      .text(`Total GST: ₹${d3.format(',')(total)}`);

    return () => {
      svg.selectAll('*').remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-2xl h-[300px] flex items-center justify-center text-gray-400">
          Loading GST summary...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-8">
      <svg
        ref={svgRef}
        viewBox="0 0 600 300"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-2xl h-auto"
      />
    </div>
  );
}

