import React from 'react';
import { View, Text, Dimensions, ActivityIndicator } from 'react-native';
import { LineChart as RNLineChart } from 'react-native-chart-kit';
import { colors, spacing, borderRadius, typography } from '../../theme/colors';

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
        <ActivityIndicator size="small" color={colors.chartPrimary} />
      </View>
    );
  }

  if (!data.datasets[0].data.length) {
    return (
      <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.chartBackground, borderRadius: 16 }}>
        <Text style={{ color: colors.chartMuted }}>Нет данных за выбранный период</Text>
      </View>
    );
  }

  return (
    <View style={{ marginVertical: 8, borderRadius: 16, overflow: 'hidden' }}>
      {title && (
        <Text style={{ fontSize: typography.xl, fontWeight: '600', marginBottom: spacing.sm, paddingHorizontal: 4 }}>
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
          backgroundColor: colors.white,
          backgroundGradientFrom: colors.white,
          backgroundGradientTo: colors.white,
          decimalPlaces: 0, // optional, defaults to 2dp
          color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: colors.chartAccent,
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
