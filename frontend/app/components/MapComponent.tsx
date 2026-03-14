import React from 'react';
import MapView, { Marker, MapViewProps } from 'react-native-maps';

interface MapComponentProps extends MapViewProps {
    markerCoordinate?: { latitude: number; longitude: number };
    markerTitle?: string;
    markerDescription?: string;
}

export default function MapComponent({ markerCoordinate, markerTitle, markerDescription, ...props }: MapComponentProps) {
    return (
        <MapView {...props}>
            {markerCoordinate && (
                <Marker
                    coordinate={markerCoordinate}
                    title={markerTitle}
                    description={markerDescription}
                />
            )}
        </MapView>
    );
}
