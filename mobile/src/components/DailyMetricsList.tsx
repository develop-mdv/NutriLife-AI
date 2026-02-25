import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';
import { AppTheme } from '../constants/Theme';

export interface DailyMetricData {
    date: string;
    value: number;
}

interface Props {
    data: DailyMetricData[];
    theme: AppTheme;
    color: string;
    selectedColor: string;
    selectedIndex: number | null;
    onSelectIndex: (index: number) => void;
    formatDateValue?: (dateStr: string) => string;
}

export const DailyMetricsList: React.FC<Props> = React.memo(({
    data,
    theme,
    color,
    selectedColor,
    selectedIndex,
    onSelectIndex,
    formatDateValue
}) => {
    const styles = React.useMemo(() => createStyles(theme), [theme]);

    if (!data || data.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Нет данных</Text>
            </View>
        );
    }

    const barWidth = 28;
    const barGap = 8;
    const maxHeight = 80;
    const labelHeight = 20;
    const maxValue = Math.max(...data.map((d) => d.value), 1);
    const chartWidth = data.length * (barWidth + barGap) + barGap;

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={{ paddingHorizontal: 4 }}
        >
            <View style={styles.container}>
                <Svg width={chartWidth} height={maxHeight + labelHeight}>
                    {data.map((d, index) => {
                        const value = d.value || 0;
                        const barHeight = Math.max((value / maxValue) * maxHeight, 4);
                        const x = index * (barWidth + barGap) + barGap;
                        const y = maxHeight - barHeight;
                        const isSelected = index === selectedIndex;

                        const dateStr = formatDateValue
                            ? formatDateValue(d.date)
                            : (d.date ? new Date(d.date).getDate().toString() : '');

                        return (
                            <React.Fragment key={d.date || index}>
                                <Rect
                                    x={x}
                                    y={isSelected ? y - 4 : y}
                                    width={barWidth}
                                    height={isSelected ? barHeight + 4 : barHeight}
                                    rx={6}
                                    fill={isSelected ? selectedColor : color}
                                    onPress={() => onSelectIndex(index)}
                                />
                                <SvgText
                                    x={x + barWidth / 2}
                                    y={maxHeight + 14}
                                    fontSize={10}
                                    fill={isSelected ? theme.colors.textPrimary : theme.colors.textMuted}
                                    fontWeight={isSelected ? 'bold' : 'normal'}
                                    textAnchor="middle"
                                >
                                    {dateStr}
                                </SvgText>
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>
        </ScrollView>
    );
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
    scroll: {
        marginTop: 4,
    },
    container: {
        paddingBottom: 4,
    },
    emptyContainer: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: theme.colors.textMuted,
        fontSize: 12,
    },
});
