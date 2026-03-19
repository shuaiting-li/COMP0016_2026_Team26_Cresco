//chart creation

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from 'recharts';
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF',
  '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'
];


const ChartRenderer = ({ chartData, chartType, xKey = 'name', yKey = 'value', height = 300, colors }) => {
  const palette = Array.isArray(colors) && colors.length > 0 ? colors : COLORS;


  switch (chartType) {
    case 'bar': {
      const yKeys = Array.isArray(yKey) ? yKey : [yKey];
      const isStacked = Array.isArray(yKey);
      return (
        <ResponsiveContainer width="100%" height={300} >
          <BarChart data={chartData}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey={xKey} />
            <YAxis />
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={palette[i % palette.length]} {...(isStacked ? { stackId: 'a' } : {})} />
            ))}
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: '#1e1f1e', border: '1px solid #333', borderRadius: '6px' }}
              labelStyle={{ color: '#c8c8c8' }}
              itemStyle={{ color: '#c8c8c8' }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'bar-stacked': {
      const yKeys = Array.isArray(yKey) ? yKey : [yKey];
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={chartData}>
            <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
            <XAxis dataKey={xKey} />
            <YAxis />
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} stackId="a" fill={palette[i % palette.length]} />
            ))}
            <Tooltip
              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
              contentStyle={{ background: '#1e1f1e', border: '1px solid #333', borderRadius: '6px' }}
              labelStyle={{ color: '#c8c8c8' }}
              itemStyle={{ color: '#c8c8c8' }}
            />
          </BarChart>
        </ResponsiveContainer>
      );
    }
    case 'line': {
      const yKeys = Array.isArray(yKey) ? yKey : [yKey];
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={chartData}>
            <CartesianGrid stroke="#ccc" />
            <XAxis dataKey={xKey} />
            <YAxis />
            {yKeys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} dot={false} />
            ))}
            <Tooltip
              contentStyle={{ background: '#1e1f1e', border: '1px solid #333', borderRadius: '6px' }}
              labelStyle={{ color: '#c8c8c8' }}
              itemStyle={{ color: '#c8c8c8' }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
    case 'pie':
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yKey}
              nameKey={xKey}
              label={(entry) => entry[xKey]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: '#1e1f1e', border: '1px solid #333', borderRadius: '6px' }}
              labelStyle={{ color: '#c8c8c8' }}
              itemStyle={{ color: '#c8c8c8' }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    default:
      return <div>Unsupported chart type</div>;
  }
};

export default ChartRenderer;