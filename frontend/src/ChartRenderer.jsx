//chart creation

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line  } from 'recharts';
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF',
  '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'
];


const ChartRenderer = ({ chartData, chartType, xKey = 'name', yKey = 'value' }) => {

  // Debug: log chart props except actual chartData
  console.log('[ChartRenderer]', {
    chartType,
    xKey,
    yKey,
    chartDataLength: Array.isArray(chartData) ? chartData.length : 'N/A'
  });

  switch (chartType) {
    case 'bar':
      return (
        <BarChart width={400} height={300} data={chartData}>
          <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Bar dataKey={yKey} fill="#82ca9d" />  
        </BarChart>
      );
    case 'line':
      return (
        <LineChart width={400} height={300} data={chartData}>
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey={yKey} stroke="#8884d8" />
        </LineChart>
      );
    case 'pie':
      return (
        <PieChart width={600} height={250}>
          <Pie
            data={chartData}
            cx="40%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            fill="#8884d8"
            dataKey={yKey}
            nameKey={xKey}
            label={(entry) => entry[xKey]} 
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      );
    default:
      return <div>Unsupported chart type</div>;
  }
};

export default ChartRenderer;