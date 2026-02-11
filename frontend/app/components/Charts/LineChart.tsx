import React from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';

interface LineChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      color?: (opacity?: number) => string;
      strokeWidth?: number;
    }[];
  };
  title?: string;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  loading?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({ 
  data, 
  title, 
  yAxisLabel = '', 
  yAxisSuffix = '',
  loading = false
}) => {
  if (loading) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  if (!data.datasets[0].data.length) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: 16 }}>
        <Text style={{ color: '#6b7280' }}>Нет данных за выбранный период</Text>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 8, borderRadius: 16, overflow: 'hidden' }}>
      {title && (
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, paddingHorizontal: 4 }}>
          {title}
        </Text>
      )}
      <RNLineChart
        data={data}
        width={Dimensions.get('window').width - 32} // from react-native
        height={220}
        yAxisLabel={yAxisLabel}
        yAxisSuffix={yAxisSuffix}
        yAxisInterval={1} // optional, defaults to 1
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0, // optional, defaults to 2dp
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#4f46e5',
          },
        }}
        bezier
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        fromZero
      />
    </View>
  );
};
