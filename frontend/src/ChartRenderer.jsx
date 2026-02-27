//chart creation

import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line  } from 'recharts';

const ChartRenderer = ({ chartData, chartType, xKey = 'name', yKey = 'value' }) => {
  //const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0', '#546E7A', '#26a69a', '#D10CE8'];

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
        <PieChart width={400} height={300}>
          <Pie
            data={chartData}
            cx={200}
            cy={150}
            innerRadius={60}
            outerRadius={100}
            fill="#8884d8"
            dataKey={yKey}
            label
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