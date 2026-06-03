"use client";

import React from "react";

const SchemaConstellation = () => {
    const nodes = [
        { id: "users", x: 100, y: 100, label: "users", delay: 0 },
        { id: "orders", x: 300, y: 150, label: "orders", delay: 1 },
        { id: "products", x: 200, y: 300, label: "products", delay: 2 },
        { id: "reviews", x: 450, y: 350, label: "reviews", delay: 1.5 },
        { id: "categories", x: 150, y: 450, label: "categories", delay: 0.5 },
    ];

    const lines = [
        { from: "users", to: "orders" },
        { from: "orders", to: "products" },
        { from: "products", to: "categories" },
        { from: "products", to: "reviews" },
        { from: "users", to: "reviews" },
    ];

    return (
        <svg width="100%" height="100%" viewBox="0 0 600 600" style={{ background: "transparent" }}>
            <defs>
                <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {lines.map((line, i) => {
                const fromNode = nodes.find((n) => n.id === line.from)!;
                const toNode = nodes.find((n) => n.id === line.to)!;
                return (
                    <line
                        key={i}
                        x1={fromNode.x}
                        y1={fromNode.y}
                        x2={toNode.x}
                        y2={toNode.y}
                        stroke="var(--accent)"
                        strokeWidth="1"
                        strokeOpacity="0.2"
                        strokeDasharray="4 4"
                        style={{
                            animation: `pulse 4s infinite ease-in-out ${i * 0.5}s`
                        }}
                    />
                );
            })}

            {nodes.map((node) => (
                <g key={node.id} style={{ animation: `pulse 8s infinite ease-in-out ${node.delay}s` }}>
                    <circle
                        cx={node.x}
                        cy={node.y}
                        r="4"
                        fill="var(--accent)"
                        filter="url(#glow)"
                    />
                    <text
                        x={node.x + 10}
                        y={node.y + 4}
                        fill="var(--text-secondary)"
                        fontSize="12"
                        fontFamily="var(--font-mono)"
                        style={{ userSelect: "none" }}
                    >
                        {node.label}
                    </text>
                </g>
            ))}

            <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
        </svg>
    );
};

export default SchemaConstellation;
