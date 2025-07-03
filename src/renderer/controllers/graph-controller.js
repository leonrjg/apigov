(function() {
  'use strict';

  class GraphController {
    constructor() {
      this.width = 700;
      this.height = 500;
      this.nodeRadius = 48;
      this.colorMap = {
        'blue': '#60a5fa',
        'purple': '#a78bfa',
        'pink': '#f472b6',
        'green': '#34d399',
        'yellow': '#fbbf24',
        'red': '#f87171',
        'cyan': '#22d3ee'
      };
    }

    getNodeColor(colorName) {
      return this.colorMap[colorName] || this.colorMap['blue'];
    }

    prepareGraphData(components) {
      const nodes = components.map(comp => ({
        id: comp.name,
        componentId: comp.id,
        color: comp.color || 'blue'
      }));

      const links = components.flatMap(comp =>
        (comp.consumes || []).map(targetId => {
          const targetComp = components.find(c => c.id === targetId);
          return targetComp ? { source: comp.name, target: targetComp.name } : null;
        }).filter(link => link !== null)
      );

      return { nodes, links };
    }

    createDragBehavior(simulation) {
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }

      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
    }

    render(containerId, components) {
      const container = document.getElementById(containerId);
      if (!container) {
        console.error('Graph container not found:', containerId);
        return;
      }

      // Remove previous SVG if any
      const oldSvg = container.querySelector('svg');
      if (oldSvg) oldSvg.remove();

      const { nodes, links } = this.prepareGraphData(components);

      if (!nodes || nodes.length === 0) {
        container.innerText = 'No components';
      }

      // Create SVG
      const svg = d3.select(container)
        .append('svg')
        .attr('width', this.width)
        .attr('height', this.height);

      // Create simulation
      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(180))
        .force('charge', d3.forceManyBody().strength(-400))
        .force('center', d3.forceCenter(this.width / 2, this.height / 2));

      // Add arrow marker definition
      svg.append('defs').append('marker')
        .attr('id', 'arrow')
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 9)
        .attr('refY', 0)
        .attr('markerWidth', 8)
        .attr('markerHeight', 8)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-5L10,0L0,5')
        .attr('fill', '#666')
        .attr('stroke', '#666');

      // Draw links
      const link = svg.append('g')
        .attr('stroke', '#bbb')
        .attr('stroke-width', 2)
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('marker-end', 'url(#arrow)');

      // Draw nodes
      const node = svg.append('g')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .selectAll('circle')
        .data(nodes)
        .join('circle')
        .attr('r', this.nodeRadius)
        .attr('user-select', 'none')
        .attr('fill', d => this.getNodeColor(d.color))
        .call(this.createDragBehavior(simulation));

      // Node labels
      const label = svg.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 5)
        .attr('font-size', 14)
        .attr('fill', '#222')
        .text(d => d.id);

      // Simulation tick handler
      simulation.on('tick', () => {
        const nodeRadius = this.nodeRadius;
        link.each(function(d) {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const unitX = dx / distance;
          const unitY = dy / distance;
          
          d3.select(this)
            .attr('x1', d.source.x + unitX * nodeRadius)
            .attr('y1', d.source.y + unitY * nodeRadius)
            .attr('x2', d.target.x - unitX * nodeRadius)
            .attr('y2', d.target.y - unitY * nodeRadius);
        });

        node
          .attr('cx', d => d.x)
          .attr('cy', d => d.y);

        label
          .attr('x', d => d.x)
          .attr('y', d => d.y);
      });
    }
  }

  const graphController = new GraphController();

  if (typeof window.moduleRegistry !== 'undefined') {
    window.moduleRegistry.register('GraphController', graphController);
  } else {
    window.GraphController = graphController;
  }
})();