'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface SalesData {
  date: Date;
  sales: number;
}

interface OrderStatusData {
  status: string;
  count: number;
}

export default function MiniDashboardDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !mounted) return;

    const container = d3.select(containerRef.current);
    container.selectAll('*').remove();

    const width = 900;
    const margin = { top: 30, right: 30, bottom: 50, left: 70 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = 300;

    // Mock sales data (last 7 days) - matching the image
    // Use fixed dates to avoid hydration issues
    const salesData: SalesData[] = [];
    const baseDate = new Date('2024-11-23'); // Fixed base date
    const salesValues = [48000, 50000, 32000, 45000, 68000, 50000, 50000];
    for (let i = 0; i < 7; i++) {
      const date = new Date(baseDate);
      date.setDate(baseDate.getDate() + i);
      salesData.push({
        date,
        sales: salesValues[i],
      });
    }

    // Mock order status data - matching the image
    const orderData: OrderStatusData[] = [
      { status: 'Placed', count: 11 },
      { status: 'Accepted', count: 8 },
      { status: 'In Kitchen', count: 15 },
      { status: 'Ready', count: 5 },
      { status: 'Served', count: 20 },
      { status: 'Completed', count: 42 },
    ];

    // Create container for charts
    const chartsContainer = container
      .append('div')
      .style('display', 'flex')
      .style('flex-direction', 'column')
      .style('gap', '40px')
      .style('align-items', 'center')
      .style('width', '100%');

    // Sales line chart
    const salesSvg = chartsContainer
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${chartHeight + margin.top + margin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    const salesG = salesSvg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3
      .scaleTime()
      .domain(d3.extent(salesData, (d) => d.date) as [Date, Date])
      .range([0, chartWidth]);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(salesData, (d) => d.sales) || 0] as [number, number])
      .nice()
      .range([chartHeight, 0]);

    const line = d3
      .line<SalesData>()
      .x((d) => xScale(d.date))
      .y((d) => yScale(d.sales))
      .curve(d3.curveMonotoneX);

    salesG
      .append('path')
      .datum(salesData)
      .attr('fill', 'none')
      .attr('stroke', '#386cb0')
      .attr('stroke-width', 4)
      .attr('d', line);

    salesG
      .selectAll('circle')
      .data(salesData)
      .enter()
      .append('circle')
      .attr('cx', (d) => xScale(d.date))
      .attr('cy', (d) => yScale(d.sales))
      .attr('r', 6)
      .attr('fill', '#386cb0');

    const xAxis = d3.axisBottom(xScale).tickFormat((d) => d3.timeFormat('%b %d')(d as Date));
    const yAxis = d3.axisLeft(yScale).tickFormat((d) => `₹${d3.format('.1s')(Number(d))}`);

    salesG
      .append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(xAxis)
      .selectAll('text')
      .style('font-size', '14px')
      .style('fill', '#6b7280');

    salesG.append('g').call(yAxis).selectAll('text').style('font-size', '14px').style('fill', '#6b7280');

    salesG
      .append('text')
      .attr('x', chartWidth / 2)
      .attr('y', chartHeight + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#1f2937')
      .text('Daily Sales (Last 7 Days)');

    // Orders by status bar chart - use same width as line chart for alignment
    const barChartWidth = width;
    const barChartHeight = 350;
    const barMargin = { top: 20, right: 30, bottom: 80, left: 70 };
    const barChartInnerWidth = barChartWidth - barMargin.left - barMargin.right;
    const barChartInnerHeight = barChartHeight - barMargin.top - barMargin.bottom;

    const barSvg = chartsContainer
      .append('svg')
      .attr('viewBox', `0 0 ${barChartWidth} ${barChartHeight + barMargin.top + barMargin.bottom}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto')
      .style('display', 'block');

    const barG = barSvg
      .append('g')
      .attr('transform', `translate(${barMargin.left},${barMargin.top})`);

    const xBarScale = d3
      .scaleBand()
      .domain(orderData.map((d) => d.status))
      .range([0, barChartInnerWidth])
      .padding(0.2);

    const yBarScale = d3
      .scaleLinear()
      .domain([0, d3.max(orderData, (d) => d.count) || 0] as [number, number])
      .nice()
      .range([barChartInnerHeight, 0]);

    const colors = ['#7fc97f', '#beaed4', '#fdc086', '#ffff99', '#386cb0', '#bf5b17'];

    barG
      .selectAll('rect')
      .data(orderData)
      .enter()
      .append('rect')
      .attr('x', (d) => xBarScale(d.status) || 0)
      .attr('y', (d) => yBarScale(d.count))
      .attr('width', xBarScale.bandwidth())
      .attr('height', (d) => barChartInnerHeight - yBarScale(d.count))
      .attr('fill', (d, i) => colors[i % colors.length])
      .attr('rx', 4);

    const xBarAxis = d3.axisBottom(xBarScale);
    const yBarAxis = d3.axisLeft(yBarScale).ticks(5);

    barG
      .append('g')
      .attr('transform', `translate(0,${barChartInnerHeight})`)
      .call(xBarAxis)
      .selectAll('text')
      .style('font-size', '13px')
      .style('fill', '#6b7280')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end')
      .attr('dx', '-0.5em')
      .attr('dy', '0.5em');

    barG.append('g').call(yBarAxis).selectAll('text').style('font-size', '14px').style('fill', '#6b7280');

    barG
      .append('text')
      .attr('x', barChartInnerWidth / 2)
      .attr('y', barChartInnerHeight + 75)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', '#1f2937')
      .text('Orders by Status');

    return () => {
      container.selectAll('*').remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-7xl flex flex-col items-center">
          <div className="w-full h-[600px] flex items-center justify-center text-gray-400">
            Loading dashboard...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div ref={containerRef} className="w-full max-w-7xl flex flex-col items-center overflow-x-auto" />
    </div>
  );
}

