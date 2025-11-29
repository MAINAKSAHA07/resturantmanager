'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export interface DailySalesData {
  date: string; // YYYY-MM-DD
  total: number; // in paise (smallest currency unit)
}

export interface OrdersByStatusData {
  status: string;
  count: number;
}

export interface DashboardChartsProps {
  dailySales: DailySalesData[];
  ordersByStatus: OrdersByStatusData[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  dailySales,
  ordersByStatus,
}) => {
  const salesRef = useRef<SVGSVGElement>(null);
  const statusRef = useRef<SVGSVGElement>(null);

  // Daily Sales Line Chart
  useEffect(() => {
    if (!salesRef.current) return;
    
    // Show empty state if no data
    if (dailySales.length === 0) {
      const svg = d3.select(salesRef.current);
      svg.selectAll('*').remove();
      svg
        .append('text')
        .attr('x', 210)
        .attr('y', 110)
        .attr('text-anchor', 'middle')
        .style('fill', 'currentColor')
        .style('font-size', '14px')
        .style('opacity', 0.5)
        .text('No sales data available');
      return;
    }

    const svg = d3.select(salesRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 420 - margin.left - margin.right;
    const height = 220 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Parse dates
    const parseDate = d3.timeParse('%Y-%m-%d');
    const data = dailySales.map((d) => ({
      date: parseDate(d.date)!,
      total: d.total / 100, // Convert paise to rupees
    }));

    // Scales
    const xScale = d3
      .scaleTime()
      .domain(d3.extent(data, (d) => d.date) as [Date, Date])
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => d.total)! * 1.1] as [number, number])
      .nice()
      .range([height, 0]);

    // Line generator
    const line = d3
      .line<{ date: Date; total: number }>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.total))
      .curve(d3.curveMonotoneX);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickFormat(d3.timeFormat('%b %d') as any)
      )
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'currentColor');

    // Y axis
    g.append('g')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickFormat((d) => `₹${d}`)
      )
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'currentColor');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${height})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(5)
          .tickSize(-height)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', 'currentColor')
      .style('stroke-opacity', 0.1)
      .style('stroke-dasharray', '2,2');

    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', 'currentColor')
      .style('stroke-opacity', 0.1)
      .style('stroke-dasharray', '2,2');

    // Line path
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'var(--accent-500, #F97316)')
      .attr('stroke-width', 2.5)
      .attr('d', line);

    // Data points
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.total))
      .attr('r', 4)
      .attr('fill', 'var(--accent-500, #F97316)')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);

    // Tooltip container
    const tooltip = d3
      .select('body')
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background', 'rgba(0, 0, 0, 0.8)')
      .style('color', 'white')
      .style('padding', '8px 12px')
      .style('border-radius', '6px')
      .style('font-size', '12px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');

    // Add hover interactions
    g.selectAll('.dot')
      .on('mouseover', function (event, d) {
        d3.select(this).attr('r', 6);
        tooltip
          .transition()
          .duration(200)
          .style('opacity', 1);
        tooltip
          .html(
            `<strong>${d3.timeFormat('%b %d, %Y')(d.date)}</strong><br/>₹${d.total.toFixed(2)}`
          )
          .style('left', `${event.pageX + 10}px`)
          .style('top', `${event.pageY - 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('r', 4);
        tooltip.transition().duration(200).style('opacity', 0);
      });

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [dailySales]);

  // Orders by Status Bar Chart
  useEffect(() => {
    if (!statusRef.current) return;
    
    // Show empty state if no data
    if (ordersByStatus.length === 0) {
      const svg = d3.select(statusRef.current);
      svg.selectAll('*').remove();
      svg
        .append('text')
        .attr('x', 210)
        .attr('y', 140)
        .attr('text-anchor', 'middle')
        .style('fill', 'currentColor')
        .style('font-size', '14px')
        .style('opacity', 0.5)
        .text('No order data available');
      return;
    }

    const svg = d3.select(statusRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const chartHeight = 280; // Total SVG height
    const margin = { top: 20, right: 20, bottom: 80, left: 50 }; // Increased bottom for rotated labels and legend
    const width = 420 - margin.left - margin.right;
    const height = chartHeight - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Color scale for statuses
    const statusColors: Record<string, string> = {
      placed: 'var(--brand-500, #878B95)',
      accepted: 'var(--status-info-500, #3B82F6)',
      in_kitchen: 'var(--status-warning-500, #F59E0B)',
      ready: 'var(--accent-500, #F97316)',
      served: 'var(--status-info-600, #2563EB)',
      completed: 'var(--status-success-500, #10B981)',
      canceled: 'var(--status-danger-500, #EF4444)',
      refunded: 'var(--status-danger-600, #DC2626)',
    };

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(ordersByStatus.map((d) => d.status))
      .range(
        ordersByStatus.map(
          (d) => statusColors[d.status] || 'var(--brand-400, #9FA2AA)'
        )
      );

    // Scales
    const xScale = d3
      .scaleBand()
      .domain(ordersByStatus.map((d) => d.status))
      .range([0, width])
      .padding(0.2);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(ordersByStatus, (d) => d.count)! * 1.1] as [
        number,
        number
      ])
      .nice()
      .range([height, 0]);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', 'currentColor')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .selectAll('text')
      .style('font-size', '11px')
      .style('fill', 'currentColor');

    // Grid lines
    g.append('g')
      .attr('class', 'grid')
      .call(
        d3
          .axisLeft(yScale)
          .ticks(5)
          .tickSize(-width)
          .tickFormat(() => '')
      )
      .selectAll('line')
      .style('stroke', 'currentColor')
      .style('stroke-opacity', 0.1)
      .style('stroke-dasharray', '2,2');

    // Bars
    g.selectAll('.bar')
      .data(ordersByStatus)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.status)!)
      .attr('width', xScale.bandwidth())
      .attr('y', (d) => yScale(d.count))
      .attr('height', (d) => height - yScale(d.count))
      .attr('fill', (d) => colorScale(d.status))
      .attr('rx', 4)
      .attr('ry', 4);

    // Labels on bars - only show if bar is tall enough
    g.selectAll('.bar-label')
      .data(ordersByStatus)
      .enter()
      .append('text')
      .attr('class', 'bar-label')
      .attr('x', (d) => xScale(d.status)! + xScale.bandwidth() / 2)
      .attr('y', (d) => {
        const barHeight = height - yScale(d.count);
        // Only show label if bar is tall enough (at least 20px)
        if (barHeight < 20) {
          return yScale(d.count) - 8; // Above the bar
        }
        return yScale(d.count) - 5; // Inside the bar
      })
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('fill', (d) => {
        const barHeight = height - yScale(d.count);
        // Use white text if bar is tall enough, otherwise use currentColor
        return barHeight >= 20 ? 'white' : 'currentColor';
      })
      .text((d) => d.count);

    // Legend - positioned below x-axis labels
    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(0,${height + 45})`); // Moved further down to avoid x-axis labels

    // Calculate spacing to fit all items
    const legendItemWidth = 70; // Width per legend item
    const totalLegendWidth = ordersByStatus.length * legendItemWidth;
    const legendStartX = Math.max(0, (width - totalLegendWidth) / 2); // Center the legend

    const legendItems = legend
      .selectAll('.legend-item')
      .data(ordersByStatus)
      .enter()
      .append('g')
      .attr('class', 'legend-item')
      .attr('transform', (d, i) => `translate(${legendStartX + i * legendItemWidth}, 0)`);

    legendItems
      .append('rect')
      .attr('width', 12)
      .attr('height', 12)
      .attr('rx', 2)
      .attr('fill', (d) => colorScale(d.status));

    legendItems
      .append('text')
      .attr('x', 16)
      .attr('y', 9)
      .style('font-size', '9px')
      .style('fill', 'currentColor')
      .text((d) => d.status.replace('_', ' '));
  }, [ordersByStatus]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Daily Sales Line Chart */}
      <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-brand-900">
          Daily Sales (Last 30 Days)
        </h3>
        <svg
          ref={salesRef}
          className="w-full"
          style={{ height: '220px' }}
          viewBox="0 0 420 220"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>

      {/* Orders by Status Bar Chart */}
      <div className="rounded-xl border border-brand-200 bg-white p-4 shadow-sm">
        <h3 className="mb-2 text-sm font-semibold text-brand-900">
          Orders by Status
        </h3>
        <svg
          ref={statusRef}
          className="w-full"
          style={{ height: '280px' }} // Increased height to accommodate legend
          viewBox="0 0 420 280"
          preserveAspectRatio="xMidYMid meet"
        />
      </div>
    </div>
  );
};

