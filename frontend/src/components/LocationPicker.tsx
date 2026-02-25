"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default Leaflet icon markers in Next.js
const customIcon = L.icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

interface LocationPickerProps {
    initialPos?: [number, number];
    onLocationSelect: (lat: number, lng: number) => void;
}

// Sub-component to handle Search
const SearchField = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    const map = useMap();

    useEffect(() => {
        const provider = new OpenStreetMapProvider();
        const searchControl = new (GeoSearchControl as any)({
            provider,
            style: 'bar',
            showMarker: false,
            showPopup: false,
            autoClose: true,
            retainZoomLevel: false,
            animateZoom: true,
            keepResult: true,
            searchLabel: 'Search for address...',
        });

        map.addControl(searchControl);

        map.on('geosearch/showlocation', (result: any) => {
            onLocationSelect(result.location.y, result.location.x);
            map.setView([result.location.y, result.location.x], 13);
        });

        return () => { map.removeControl(searchControl); };
    }, [map, onLocationSelect]);

    return null;
};

// Sub-component to handle Map Clicks
const MapClickHandler = ({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) => {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
};

// Sub-component to fix map loading issues (gray areas)
const MapResizeHandler = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 400); // Wait for modal animation
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

// Sub-component to handle map movement when props change
const FlyToLocation = ({ pos }: { pos: [number, number] }) => {
    const map = useMap();
    useEffect(() => {
        map.flyTo(pos, map.getZoom());
    }, [pos, map]);
    return null;
};

export default function LocationPicker({ initialPos = [38.4237, 27.1428], onLocationSelect }: LocationPickerProps) {
    const [position, setPosition] = useState<[number, number]>(initialPos);

    // Sync internal state with props
    useEffect(() => {
        if (initialPos[0] !== position[0] || initialPos[1] !== position[1]) {
            setPosition(initialPos);
        }
    }, [initialPos, position]);

    // Update internal position and notify parent
    const handleSelect = (lat: number, lng: number) => {
        setPosition([lat, lng]);
        onLocationSelect(lat, lng);
    };

    return (
        <div className="relative w-full h-[300px] md:h-full min-h-[400px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl z-0 group">
            <MapContainer
                center={position}
                zoom={10}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%', background: '#020617' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                <MapResizeHandler />
                <FlyToLocation pos={position} />
                <Marker position={position} icon={customIcon} />
                <SearchField onLocationSelect={handleSelect} />
                <MapClickHandler onLocationSelect={handleSelect} />
            </MapContainer>

            <div className="absolute bottom-3 left-3 z-[1000] bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-[10px] font-mono text-brand-green">
                {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
        </div>
    );
}
