import React from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { BarChart as RNBarChart } from 'react-native-chart-kit';

interface BarChartProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
    }[];
  };
  title?: string;
  yAxisLabel?: string;
  yAxisSuffix?: string;
  loading?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({ 
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
        <Text style={{ color: '#6b7280' }}>Нет данных</Text>
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
      <RNBarChart
        data={data}
        width={Dimensions.get('window').width - 32}
        height={220}
        yAxisLabel={yAxisLabel}
        yAxisSuffix={yAxisSuffix}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`, // Green by default
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
        }}
        style={{
          marginVertical: 8,
          borderRadius: 16,
        }}
        fromZero
        showValuesOnTopOfBars
      />
    </View>
  );
};
