
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in Leaflet with React
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletMapPickerProps {
  initialCenter: { lat: number; lng: number };
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

const LocationMarker = ({ initialCenter, onLocationSelect }: LeafletMapPickerProps) => {
  const [position, setPosition] = useState<L.LatLng>(new L.LatLng(initialCenter.lat, initialCenter.lng));
  const map = useMap();

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      map.flyTo(e.latlng, map.getZoom());
      updateAddress(e.latlng.lat, e.latlng.lng);
    },
  });

  const updateAddress = async (lat: number, lng: number) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      onLocationSelect(lat, lng, data.display_name || `Point at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } catch (error) {
      onLocationSelect(lat, lng, `Point at ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    }
  };

  useEffect(() => {
    if (initialCenter) {
      const newPos = new L.LatLng(initialCenter.lat, initialCenter.lng);
      setPosition(newPos);
      map.setView(newPos, map.getZoom());
    }
  }, [initialCenter, map]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
};

const LeafletMapPicker: React.FC<LeafletMapPickerProps> = (props) => {
  return (
    <div className="w-full h-full min-h-[300px]">
      <MapContainer 
        center={[props.initialCenter.lat, props.initialCenter.lng]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker {...props} />
      </MapContainer>
    </div>
  );
};

export default LeafletMapPicker;
