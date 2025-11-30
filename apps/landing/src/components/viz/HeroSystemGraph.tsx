'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Node {
  id: string;
  label: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

interface Link {
  source: string | Node;
  target: string | Node;
}

export default function HeroSystemGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !mounted) return;

    const width = 900;
    const height = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Define nodes with hierarchical positions
    // Customer can order through Web Ordering OR Floor Plan (QR codes)
    const nodes: Node[] = [
      { id: 'customer', label: 'Customer', x: 100, y: height / 2 },
      { id: 'web', label: 'Web Ordering', x: 250, y: height / 2 - 80 },
      { id: 'floorplan', label: 'Floor Plan', x: 250, y: height / 2 + 80 },
      { id: 'orders', label: 'Orders', x: 400, y: height / 2 },
      { id: 'kds', label: 'KDS', x: 550, y: height / 2 - 80 },
      { id: 'backoffice', label: 'Back Office', x: 550, y: height / 2 + 80 },
      { id: 'reports', label: 'Reports', x: 750, y: height / 2 },
    ];

    // Flow: Customer -> (Web Ordering OR Floor Plan) -> Orders -> (KDS AND Back Office) -> Reports
    // Back Office also manages Floor Plan
    const links: Link[] = [
      { source: 'customer', target: 'web' },
      { source: 'customer', target: 'floorplan' },
      { source: 'web', target: 'orders' },
      { source: 'floorplan', target: 'orders' },
      { source: 'orders', target: 'kds' },
      { source: 'orders', target: 'backoffice' },
      { source: 'backoffice', target: 'floorplan' }, // Back Office manages Floor Plan
      { source: 'kds', target: 'reports' },
      { source: 'backoffice', target: 'reports' },
    ];

    // Lock node positions for a clean layout
    nodes.forEach((node) => {
      node.fx = node.x;
      node.fy = node.y;
    });

    const simulation = d3
      .forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d: any) => d.id)
          .distance(150)
      )
      .force('charge', d3.forceManyBody().strength(-200))
      .force('collision', d3.forceCollide().radius(60));

    const link = svg
      .append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#cbd5e1')
      .attr('stroke-width', 2.5)
      .attr('stroke-opacity', 0.5)
      .attr('marker-end', 'url(#arrowhead)');

    const node = svg
      .append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .call(
        d3
          .drag<SVGGElement, Node>()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended)
      );

    node
      .append('circle')
      .attr('r', 40)
      .attr('fill', (d) => {
        const colors: Record<string, string> = {
          customer: '#7fc97f',
          web: '#beaed4',
          orders: '#fdc086',
          kds: '#ffff99',
          backoffice: '#386cb0',
          floorplan: '#f0027f',
          reports: '#bf5b17',
        };
        return colors[d.id] || '#666666';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 3)
      .style('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))');

    node
      .append('text')
      .text((d) => d.label)
      .attr('text-anchor', 'middle')
      .attr('dy', 55)
      .attr('font-size', '13px')
      .attr('fill', '#1f2937')
      .attr('font-weight', '600');

    const arrowMarker = svg
      .append('defs')
      .append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 40)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto');

    arrowMarker
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8')
      .attr('opacity', 0.7);

    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>) {
      if (!event.active) simulation.alphaTarget(0);
      // Keep nodes locked after drag for stability
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Stop simulation after initial layout
    setTimeout(() => {
      simulation.stop();
    }, 1000);

    return () => {
      simulation.stop();
      svg.selectAll('*').remove();
    };
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="w-full flex justify-center py-8">
        <div className="w-full max-w-5xl h-[500px] flex items-center justify-center text-gray-400">
          Loading system graph...
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <svg
        ref={svgRef}
        viewBox="0 0 900 500"
        preserveAspectRatio="xMidYMid meet"
        className="w-full max-w-5xl h-auto min-h-[300px] sm:min-h-[400px] lg:min-h-[500px]"
      />
    </div>
  );
}

