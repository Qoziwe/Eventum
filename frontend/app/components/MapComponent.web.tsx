import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MapComponentProps {
    style?: any;
    markerTitle?: string;
    markerDescription?: string;
    [key: string]: any;
}

export default function MapComponent({ style, markerTitle, markerDescription }: MapComponentProps) {
    return (
        <View style={[styles.container, style]}>
            <Text style={styles.text}>Карта (недоступна в веб-версии)</Text>
            {markerTitle && (
                <Text style={styles.subtext}>{markerTitle}</Text>
            )}
            {markerDescription && (
                <Text style={styles.subtext}>{markerDescription}</Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#1E1E1E',
    },
    text: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    subtext: {
        color: '#A0A0A0',
        marginTop: 8,
        fontSize: 14,
    }
});
