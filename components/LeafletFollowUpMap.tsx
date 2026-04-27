
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Member } from '../types';
import { Navigation, Phone, MapPin } from 'lucide-react';

// Fix for default marker icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LeafletFollowUpMapProps {
  members: Member[];
  userLocation: { lat: number, lng: number } | null;
  onStartVisit: (member: Member) => void;
}

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.panTo(center);
  }, [center, map]);
  return null;
};

const LeafletFollowUpMap: React.FC<LeafletFollowUpMapProps> = ({ members, userLocation, onStartVisit }) => {
  const defaultCenter: [number, number] = [5.6037, -0.1870];
  const center: [number, number] = userLocation ? [userLocation.lat, userLocation.lng] : defaultCenter;

  const getMarkerColor = (status?: string) => {
    switch (status) {
      case 'Completed': return '#10b981';
      case 'Visited': return '#3b82f6';
      case 'Contacted': return '#f59e0b';
      case 'Pending': return '#ef4444';
      default: return '#ef4444';
    }
  };

  const createCustomIcon = (color: string) => {
    return new L.DivIcon({
      html: `<div style="background-color: ${color}; width: 12px; height: 12px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 5px rgba(0,0,0,0.3);"></div>`,
      className: 'custom-leaflet-icon',
      iconSize: [12, 12],
    });
  };

  return (
    <div className="w-full h-full min-h-[500px] rounded-[1.5rem] overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {userLocation && (
          <Marker position={[userLocation.lat, userLocation.lng]} icon={createCustomIcon('#4285F4')}>
             <Popup>Your Location</Popup>
          </Marker>
        )}
        {members.map(member => (
          <Marker 
            key={member.id} 
            position={[member.latitude!, member.longitude!]}
            icon={createCustomIcon(getMarkerColor(member.follow_up_status))}
          >
            <Popup>
               <div className="p-2 min-w-[150px]">
                <h3 className="font-black text-slate-900 text-sm mb-1">{member.first_name} {member.last_name}</h3>
                <div className="space-y-1 mb-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Phone className="w-3 h-3" />
                    {member.phone || 'No phone'}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {member.gps_address || 'No GPS'}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`;
                      window.open(url, '_blank');
                    }}
                    className="flex-1 py-2 bg-fh-green text-fh-gold rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-3 h-3" />
                    Navigate
                  </button>
                  <button
                    onClick={() => onStartVisit(member)}
                    className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                  >
                    Details
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapController center={center} />
      </MapContainer>
    </div>
  );
};

export default LeafletFollowUpMap;
