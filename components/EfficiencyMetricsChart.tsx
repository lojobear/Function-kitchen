/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

export interface EfficiencyData {
  actualSteps: number;
  defaultPathSteps: number;
  stepsSaved: number;
  efficiencyScore: number;
  compressionRatio: number;
  speedup: number;
  materialsCount: number;
  toolsCount: number;
  grade: string;
  rarity: string;
  themeColor: string;
}

export function calculateEfficiency(
  toolsUsed: string[],
  ingredientsUsed: string[],
  rarity: string = 'Common',
  themeColor: string = '#10b981'
): EfficiencyData {
  const actualSteps = Math.max(1, toolsUsed.length);
  const materialsCount = Math.max(1, ingredientsUsed.length);

  // In traditional sequential single-action processing:
  // Each material requires gathering + preparation (1 step per material)
  // Plus rarity tier refinement steps (Legendary +3, Epic +2, Rare +1)
  // Plus final fusion assembly (1 step)
  const rarityBonus = rarity === 'Legendary' ? 3 : rarity === 'Epic' ? 2 : rarity === 'Rare' ? 1 : 0;
  const defaultPathSteps = Math.max(actualSteps + 1, Math.round(materialsCount * 1.5 + rarityBonus + 1));
  const stepsSaved = Math.max(1, defaultPathSteps - actualSteps);

  // Score calculation: percentage reduction in step complexity + high-batching bonus
  const rawRatio = (stepsSaved / defaultPathSteps) * 100;
  const efficiencyScore = Math.min(99, Math.max(65, Math.round(rawRatio + 20)));

  const compressionRatio = parseFloat((materialsCount / actualSteps).toFixed(1));
  const speedup = parseFloat((defaultPathSteps / actualSteps).toFixed(1));

    let grade = 'A+ Optimal';
  if (efficiencyScore >= 90) grade = 'S+ Mastercraft';
  else if (efficiencyScore >= 80) grade = 'A+ Artisan';
  else if (efficiencyScore >= 70) grade = 'A Logical Sequence';
  else grade = 'B Structured';

  return {
    actualSteps,
    defaultPathSteps,
    stepsSaved,
    efficiencyScore,
    compressionRatio,
    speedup,
    materialsCount,
    toolsCount: actualSteps,
    grade,
    rarity,
    themeColor,
  };
}

interface EfficiencyMetricsChartProps {
  data: EfficiencyData;
  compact?: boolean;
}

export function EfficiencyMetricsChart({ data, compact = false }: EfficiencyMetricsChartProps) {
  const gaugeRef = useRef<SVGSVGElement | null>(null);
  const barChartRef = useRef<SVGSVGElement | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown'>('overview');

  // Render D3 Gauge Arc Chart
  useEffect(() => {
    if (!gaugeRef.current) return;

    const svg = d3.select(gaugeRef.current);
    svg.selectAll('*').remove();

    const width = compact ? 80 : 110;
    const height = compact ? 80 : 110;
    const margin = 6;
    const radius = Math.min(width, height) / 2 - margin;

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${width / 2}, ${height / 2})`);

    // Background track arc (full circle or 240 deg gauge)
    const arcBackground = d3
      .arc<any>()
      .innerRadius(radius - (compact ? 6 : 9))
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .endAngle(Math.PI * 0.75)
      .cornerRadius(compact ? 3 : 5);

    g.append('path')
      .datum({})
      .attr('d', arcBackground as any)
      .attr('fill', '#e2e8f0');

    // Foreground progress arc
    const targetAngle = -Math.PI * 0.75 + (data.efficiencyScore / 100) * (Math.PI * 1.5);

    const arcForeground = d3
      .arc<any>()
      .innerRadius(radius - (compact ? 6 : 9))
      .outerRadius(radius)
      .startAngle(-Math.PI * 0.75)
      .cornerRadius(compact ? 3 : 5);

    const colorScale = d3
      .scaleLinear<string>()
      .domain([60, 80, 95])
      .range(['#3b82f6', '#10b981', '#f59e0b']);

    const strokeColor = data.themeColor || colorScale(data.efficiencyScore);

    const path = g
      .append('path')
      .datum({ endAngle: -Math.PI * 0.75 })
      .attr('fill', strokeColor)
      .attr('d', arcForeground as any);

    // Animate arc fill
    path
      .transition()
      .duration(900)
      .ease(d3.easeCubicOut)
      .attrTween('d', function (d: any) {
        const interpolate = d3.interpolate(d.endAngle, targetAngle);
        return function (t: number) {
          d.endAngle = interpolate(t);
          return arcForeground(d) || '';
        };
      });

    // Center percentage text
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', compact ? '0.3em' : '0.1em')
      .attr('font-size', compact ? '16px' : '22px')
      .attr('font-weight', '800')
      .attr('font-family', 'monospace')
      .attr('fill', '#0f172a')
      .text(`${data.efficiencyScore}%`);

    if (!compact) {
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.6em')
        .attr('font-size', '9px')
        .attr('font-weight', '700')
        .attr('text-transform', 'uppercase')
        .attr('letter-spacing', '0.5px')
        .attr('fill', '#64748b')
        .text('Efficiency');
    }
  }, [data, compact]);

  // Render D3 Comparison Bar Chart
  useEffect(() => {
    if (!barChartRef.current || compact) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove();

    const width = 280;
    const height = 110;
    const margin = { top: 12, right: 35, bottom: 20, left: 100 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const chart = svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const dataset = [
      {
        label: 'AI Synthesized',
        steps: data.actualSteps,
        color: data.themeColor || '#10b981',
        isOptimized: true,
      },
      {
        label: 'Default Path',
        steps: data.defaultPathSteps,
        color: '#94a3b8',
        isOptimized: false,
      },
    ];

    const maxSteps = Math.max(data.defaultPathSteps, data.actualSteps) + 1;

    const xScale = d3.scaleLinear().domain([0, maxSteps]).range([0, innerWidth]);

    const yScale = d3
      .scaleBand()
      .domain(dataset.map((d) => d.label))
      .range([0, innerHeight])
      .padding(0.32);

    // Grid lines
    chart
      .append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(
        d3
          .axisBottom(xScale)
          .ticks(4)
          .tickSize(-innerHeight)
          .tickFormat(() => '')
      )
      .attr('stroke-opacity', 0.1)
      .attr('stroke', '#cbd5e1');

    // Bars
    const barGroups = chart
      .selectAll('.bar-group')
      .data(dataset)
      .enter()
      .append('g')
      .attr('class', 'bar-group');

    // Bar rect with animation
    barGroups
      .append('rect')
      .attr('y', (d) => yScale(d.label) || 0)
      .attr('height', yScale.bandwidth())
      .attr('x', 0)
      .attr('width', 0)
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .transition()
      .duration(750)
      .ease(d3.easeCubicOut)
      .attr('width', (d) => xScale(d.steps));

    // Step count labels at the end of each bar
    barGroups
      .append('text')
      .attr('x', (d) => xScale(d.steps) + 6)
      .attr('y', (d) => (yScale(d.label) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('font-size', '11px')
      .attr('font-weight', '700')
      .attr('font-family', 'monospace')
      .attr('fill', (d) => (d.isOptimized ? '#0f172a' : '#64748b'))
      .text((d) => `${d.steps} ${d.steps === 1 ? 'step' : 'steps'}`);

    // Y Axis Labels
    chart
      .append('g')
      .selectAll('.y-label')
      .data(dataset)
      .enter()
      .append('text')
      .attr('class', 'y-label')
      .attr('x', -8)
      .attr('y', (d) => (yScale(d.label) || 0) + yScale.bandwidth() / 2 + 4)
      .attr('text-anchor', 'end')
      .attr('font-size', '11px')
      .attr('font-weight', (d) => (d.isOptimized ? '700' : '500'))
      .attr('font-family', 'monospace')
      .attr('fill', (d) => (d.isOptimized ? '#0f172a' : '#64748b'))
      .text((d) => d.label);

    // Bottom Axis
    const xAxis = d3.axisBottom(xScale).ticks(maxSteps <= 6 ? maxSteps : 5).tickFormat(d3.format('d') as any);

    chart
      .append('g')
      .attr('transform', `translate(0, ${innerHeight})`)
      .call(xAxis)
      .attr('font-family', 'monospace')
      .attr('font-size', '9px')
      .attr('color', '#94a3b8');
  }, [data, compact]);

  if (compact) {
    return (
      <div className="efficiency-compact-container">
        <svg ref={gaugeRef} className="efficiency-gauge-svg" />
        <div className="efficiency-compact-details">
          <div className="efficiency-badge-row">
            <span className="efficiency-pill-tag">⚡ {data.stepsSaved} Steps Saved</span>
            <span className="efficiency-grade-tag">{data.grade}</span>
          </div>
          <div className="efficiency-sub-text">
            Synthesized in <strong>{data.actualSteps} {data.actualSteps === 1 ? 'step' : 'steps'}</strong> vs {data.defaultPathSteps} standard steps
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="efficiency-full-card">
      <div className="efficiency-card-header">
        <div className="efficiency-title-row">
          <span className="efficiency-sparkle-icon">⚡</span>
          <div>
            <h4 className="efficiency-heading">Craftsmanship & Synthesis Analytics</h4>
            <p className="efficiency-subheading">
              Multi-Stage Tool Execution Chain & Material Transformation Ratio
            </p>
          </div>
        </div>
        <div className="efficiency-header-tags">
          <span className="saved-steps-pill">{data.actualSteps} Logical Stages</span>
          <span className="efficiency-grade-pill">{data.grade}</span>
        </div>
      </div>

      <div className="efficiency-charts-grid">
        {/* D3 Gauge Arc */}
        <div className="efficiency-gauge-block">
          <svg ref={gaugeRef} className="efficiency-d3-gauge" />
          <div className="gauge-caption">
            <span className="gauge-caption-label">Optimization Score</span>
            <span className="gauge-caption-val">{data.speedup}x Speedup</span>
          </div>
        </div>

        {/* D3 Comparison Bar Chart */}
        <div className="efficiency-bars-block">
          <div className="bars-header">
            <span className="bars-title">Execution Path Comparison</span>
            <span className="bars-legend">
              <span className="legend-dot ai-dot" style={{ background: data.themeColor || '#10b981' }}></span> AI Path
              <span className="legend-dot def-dot"></span> Default Path
            </span>
          </div>
          <svg ref={barChartRef} className="efficiency-d3-bars" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="efficiency-stats-strip">
        <div className="stat-pill-item">
          <span className="stat-pill-lbl">Batch Density</span>
          <span className="stat-pill-num">{data.compressionRatio} mat/step</span>
        </div>
        <div className="stat-pill-item">
          <span className="stat-pill-lbl">AI Steps</span>
          <span className="stat-pill-num">{data.actualSteps}</span>
        </div>
        <div className="stat-pill-item">
          <span className="stat-pill-lbl">Default Path</span>
          <span className="stat-pill-num">{data.defaultPathSteps}</span>
        </div>
        <div className="stat-pill-item highlight">
          <span className="stat-pill-lbl">Overhead Saved</span>
          <span className="stat-pill-num">+{data.stepsSaved} steps</span>
        </div>
      </div>
    </div>
  );
}
