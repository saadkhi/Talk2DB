"use client";
import React, { useState } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import 'react-pivottable/pivottable.css';
import createPlotlyRenderers from 'react-pivottable/PlotlyRenderers';
import Plot from 'react-plotly.js';

const PlotlyRenderers = createPlotlyRenderers(Plot);

export default function PivotTableWrapper({ data }: { data: any[] }) {
    const [state, setState] = useState<any>({});

    if (!data || data.length === 0) return <div>No data for pivot table</div>;

    return (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: '8px', padding: '10px' }}>
            <PivotTableUI
                data={data}
                onChange={s => setState(s)}
                renderers={Object.assign({}, PlotlyRenderers)}
                {...state}
            />
        </div>
    );
}
