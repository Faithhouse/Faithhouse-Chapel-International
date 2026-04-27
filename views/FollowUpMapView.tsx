
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { supabase } from '../supabaseClient';
import { Member, UserProfile } from '../types';
import { MapPin, Phone, User, Navigation, Search, Filter, Map as MapIcon, Loader2, AlertCircle, HelpCircle, Download, ShieldAlert, Globe } from 'lucide-react';
import { toast } from 'sonner';
import LeafletFollowUpMap from '../components/LeafletFollowUpMap';

interface FollowUpMapViewProps {
  currentUser: UserProfile | null;
}

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 250px)',
  borderRadius: '1.5rem',
  overflow: 'hidden'
};

const defaultCenter = {
  lat: 5.6037, // Accra, Ghana (Default for Faithhouse)
  lng: -0.1870
};

// Haversine formula to calculate distance between two points in km
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg: number) => {
  return deg * (Math.PI / 180);
};

const LIBRARIES: ("places")[] = ["places"];

const FollowUpMapView: React.FC<FollowUpMapViewProps> = ({ currentUser }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries: LIBRARIES
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [radiusFilter, setRadiusFilter] = useState<number>(5); // 5km radius
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isBypassed, setIsBypassed] = useState(false);

  useEffect(() => {
    (window as any).gm_authFailure = () => {
      setAuthError(true);
      setShowTroubleshooting(true);
      toast.error('Google Maps Authentication Failed', {
        description: 'Please check your API key and restrictions.',
        duration: 8000,
      });
    };
  }, []);

  useEffect(() => {
    const checkBypass = async () => {
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('value')
          .eq('id', 'bypass_maps')
          .single();
        if (data && data.value === true) {
          setIsBypassed(true);
        }
      } catch (err) {
        // Ignore errors, default to false
      }
    };
    checkBypass();
  }, []);

  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('members')
        .select('*');

      if (error) throw error;
      
      // Filter out members without coordinates for the map
      const membersWithCoords = (data || []).filter(m => m.latitude && m.longitude);
      setMembers(membersWithCoords);
      setFilteredMembers(membersWithCoords);
    } catch (error: any) {
      console.error('Error fetching members:', error);
      toast.error('Failed to load members for map');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(pos);
          if (map) {
            map.panTo(pos);
          }
        },
        () => {
          toast.error('Location access denied. Please enable location to see nearby members.');
        }
      );
    }
  }, [map]);

  // Filter members based on search, status, and radius
  useEffect(() => {
    let result = members;

    if (searchTerm) {
      result = result.filter(m => 
        `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      result = result.filter(m => m.follow_up_status === statusFilter);
    }

    if (userLocation && radiusFilter > 0) {
      result = result.filter(m => {
        const dist = calculateDistance(userLocation.lat, userLocation.lng, m.latitude!, m.longitude!);
        return dist <= radiusFilter;
      });
      
      // Sort by nearest
      result.sort((a, b) => {
        const distA = calculateDistance(userLocation.lat, userLocation.lng, a.latitude!, a.longitude!);
        const distB = calculateDistance(userLocation.lat, userLocation.lng, b.latitude!, b.longitude!);
        return distA - distB;
      });
    }

    setFilteredMembers(result);
  }, [members, searchTerm, statusFilter, radiusFilter, userLocation]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleStartVisit = (member: Member) => {
    if (!userLocation) {
      toast.error('Unable to detect your location. Please enable GPS.');
      return;
    }

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin: userLocation,
        destination: { lat: member.latitude!, lng: member.longitude! },
        travelMode: google.maps.TravelMode.DRIVING
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
          const route = result.routes[0].legs[0];
          setRouteInfo({
            distance: route.distance?.text || '',
            duration: route.duration?.text || ''
          });
          toast.success(`Routing to ${member.first_name}`);
        } else {
          toast.error('Could not calculate route');
        }
      }
    );
  };

  const getMarkerIcon = (status?: string) => {
    switch (status) {
      case 'Completed': return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png';
      case 'Visited': return 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png';
      case 'Contacted': return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png';
      case 'Pending': return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
      default: return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png';
    }
  };

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY || authError) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 text-fh-gold flex items-center justify-center text-2xl shadow-xl">
              {authError ? <AlertCircle className="w-8 h-8 text-rose-500 animate-pulse" /> : <MapIcon className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Follow-Up Map</h1>
              <p className="text-slate-500 font-medium tracking-tight flex items-center gap-2">
                <Globe className="w-3 h-3 text-fh-gold" />
                {authError ? "Auth Error: Leaflet Fallback Active" : "Regional Mapping Mode (OpenStreet)"}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm active:scale-95"
          >
            <ShieldAlert className="w-4 h-4" />
            Fix Key Restrictions
          </button>
        </div>

        {showTroubleshooting && (
          <div className={`p-6 rounded-[2rem] border animate-in slide-in-from-top duration-300 ${authError ? 'bg-rose-50/50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-4">
                <div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm mb-2">Fix RefererNotAllowedMapError</h3>
                  <p className="text-slate-500 text-xs font-medium leading-relaxed">
                    Your Google Maps API key is working, but it blocks requests from this domain. Since you are hosting on Vercel or testing in this preview, you must add this URL to your Google Cloud Console.
                  </p>
                </div>
                
                <div className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Copy this pattern</p>
                    <code className="text-slate-900 font-bold text-xs block truncate">{window.location.hostname}/*</code>
                  </div>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.hostname}/*`);
                      toast.success("Pattern copied!");
                    }}
                    className="px-4 py-2 bg-slate-900 text-fh-gold rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                  >
                    Copy
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Google Console</p>
                    <p className="text-xs text-slate-600 font-medium italic">Go to APIs & Services {' > '} Credentials</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">2. Website Restrictions</p>
                    <p className="text-xs text-slate-600 font-medium italic">Add the copied URL above</p>
                  </div>
                </div>
              </div>
              <div className="w-px h-32 bg-slate-200 hidden md:block" />
              <div className="w-full md:w-64 space-y-4">
                <div className="p-4 bg-white/50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">API Requirements</p>
                  <ul className="text-[10px] space-y-1 text-slate-600 font-bold">
                    <li className="flex items-center gap-2">✓ Maps JavaScript API</li>
                    <li className="flex items-center gap-2">✓ Places API</li>
                    <li className="flex items-center gap-2">✓ Directions API</li>
                  </ul>
                </div>
                <button 
                  onClick={() => setShowTroubleshooting(false)}
                  className="w-full py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
                >
                  Dismiss Guide
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 h-[calc(100vh-250px)]">
            <LeafletFollowUpMap 
              members={filteredMembers} 
              userLocation={userLocation}
              onStartVisit={(member) => {
                setSelectedMember(member);
                toast.info(`View details for ${member.first_name}`);
              }}
            />
          </div>
          <div className="space-y-6">
            {selectedMember && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-2">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs">Navigator</h4>
                  <span className="text-[9px] font-black text-fh-green">ACTIVE SESSION</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedMember.latitude},${selectedMember.longitude}`;
                      window.open(url, '_blank');
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                  >
                    <Navigation className="w-3 h-3" />
                    Route
                  </button>
                  <a
                    href={`tel:${selectedMember.phone}`}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                  >
                    <Phone className="w-3 h-3" />
                    Call
                  </a>
                </div>
              </div>
            )}
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nearby Members</h2>
                <div className="p-2 bg-cms-blue/10 text-cms-blue rounded-lg">
                  <Navigation className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto pr-2 custom-scrollbar">
                {filteredMembers.map(member => {
                  const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, member.latitude!, member.longitude!) : null;
                  return (
                    <div
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                        selectedMember?.id === member.id ? 'bg-slate-50 border-cms-blue' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5" />
                            {member.gps_address || 'No GPS'}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            member.follow_up_status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                            member.follow_up_status === 'Visited' ? 'bg-blue-100 text-blue-600' :
                            member.follow_up_status === 'Contacted' ? 'bg-amber-100 text-amber-600' :
                            'bg-rose-100 text-rose-600'
                          }`}>
                            {member.follow_up_status || 'Pending'}
                          </span>
                          {dist !== null && (
                            <p className="text-[9px] font-black text-cms-blue">
                              {dist.toFixed(1)}km
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-slate-50">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Details</span>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`;
                              window.open(url, '_blank');
                            }}
                            className="w-8 h-8 rounded-xl bg-fh-green/10 flex items-center justify-center text-fh-green hover:bg-fh-green hover:text-fh-gold transition-all shadow-sm active:scale-90"
                            title="Navigate to house"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                          <a 
                            href={`tel:${member.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white hover:bg-black transition-all shadow-sm active:scale-90"
                            title="Call member"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <Loader2 className="w-12 h-12 text-cms-blue animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Google Maps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-900 text-fh-gold flex items-center justify-center text-2xl shadow-xl">
            <MapIcon className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Follow-Up Map</h1>
            <p className="text-slate-500 font-medium">Locate and visit members efficiently {isBypassed && "(Bypass Mode Active)"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button 
            onClick={() => setShowTroubleshooting(!showTroubleshooting)}
            className="p-3 text-slate-400 hover:text-cms-blue hover:bg-cms-blue/5 rounded-xl transition-all"
            title="Map Troubleshooting"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cms-blue/20 transition-all w-full md:w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-cms-blue/20 transition-all"
          >
            <option value="All">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Contacted">Contacted</option>
            <option value="Visited">Visited</option>
            <option value="Completed">Completed</option>
          </select>
          <div className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-xl">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(Number(e.target.value))}
              className="text-sm bg-transparent focus:outline-none"
            >
              <option value={0}>Any Distance</option>
              <option value={1}>Within 1km</option>
              <option value={5}>Within 5km</option>
              <option value={10}>Within 10km</option>
              <option value={20}>Within 20km</option>
            </select>
          </div>
        </div>
      </div>

      {(showTroubleshooting || authError) && (
        <div className={`border rounded-2xl p-6 animate-in slide-in-from-top duration-300 ${authError ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200'}`}>
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${authError ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-3">
              <h3 className={`font-bold ${authError ? 'text-rose-900' : 'text-amber-900'}`}>
                {authError ? 'Google Maps Authentication Error' : 'Troubleshooting "ApiTargetBlockedMapError"'}
              </h3>
              <p className={`text-sm ${authError ? 'text-rose-800' : 'text-amber-800'}`}>
                {authError 
                  ? 'The Google Maps API rejected your API key. This is usually due to "ApiTargetBlockedMapError" or "ApiNotActivatedMapError".'
                  : 'This error usually means your Google Maps API Key is restricted and doesn\'t allow requests from this environment.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/50 p-4 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-900 uppercase mb-2">1. Enable the API</p>
                  <p className="text-xs text-amber-800">
                    Ensure "Maps JavaScript API" is enabled in your <a href="https://console.cloud.google.com/google/maps-apis/api-list" target="_blank" className="underline font-bold">Google Cloud Console</a>.
                  </p>
                </div>
                <div className="bg-white/50 p-4 rounded-xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-900 uppercase mb-2">2. Check Key Restrictions</p>
                  <p className="text-xs text-amber-800 mb-2">
                    If you have "API restrictions", make sure "Maps JavaScript API" is selected. If you have "Application restrictions", ensure this domain is allowed:
                  </p>
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-amber-100">
                    <code className="text-[10px] text-slate-600 flex-1 truncate">{window.location.hostname}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.hostname);
                        toast.success('Domain copied to clipboard');
                      }}
                      className="p-1 hover:bg-slate-100 rounded text-slate-400"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 relative">
          {(isBypassed || authError) ? (
            <div className="w-full h-full min-h-[500px] relative">
              {authError && (
                <div className="absolute top-4 left-4 z-[1000]">
                  <div className="bg-rose-100/90 backdrop-blur-sm text-rose-900 px-3 py-2 rounded-xl border border-rose-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                    <Globe className="w-3 h-3" />
                    Auth Error: Leaflet Fallback Active
                  </div>
                </div>
              )}
              <LeafletFollowUpMap 
                members={filteredMembers} 
                userLocation={userLocation}
                onStartVisit={(member) => setSelectedMember(member)}
              />
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={userLocation || defaultCenter}
              zoom={13}
              onLoad={setMap}
              onUnmount={onUnmount}
              options={{
                styles: [
                  {
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                  }
                ]
              }}
            >
              {/* User Location Marker */}
              {userLocation && (
                <Marker
                  position={userLocation}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#4285F4",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#FFFFFF",
                  }}
                  title="Your Location"
                />
              )}

              {/* Member Markers */}
              {filteredMembers.map(member => (
                <Marker
                  key={member.id}
                  position={{ lat: member.latitude!, lng: member.longitude! }}
                  onClick={() => {
                    setSelectedMember(member);
                    setDirections(null);
                    setRouteInfo(null);
                  }}
                  icon={getMarkerIcon(member.follow_up_status)}
                />
              ))}

              {/* Info Window */}
              {selectedMember && (
                <InfoWindow
                  position={{ lat: selectedMember.latitude!, lng: selectedMember.longitude! }}
                  onCloseClick={() => setSelectedMember(null)}
                >
                  <div className="p-2 min-w-[200px]">
                    <h3 className="font-black text-slate-900 text-sm mb-1">{selectedMember.first_name} {selectedMember.last_name}</h3>
                    <div className="space-y-1 mb-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Phone className="w-3 h-3" />
                        {selectedMember.phone || 'No phone'}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {selectedMember.gps_address || 'No GPS address'}
                      </div>
                      <div className="mt-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          selectedMember.follow_up_status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                          selectedMember.follow_up_status === 'Visited' ? 'bg-blue-100 text-blue-600' :
                          selectedMember.follow_up_status === 'Contacted' ? 'bg-amber-100 text-amber-600' :
                          'bg-rose-100 text-rose-600'
                        }`}>
                          {selectedMember.follow_up_status || 'Pending'}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartVisit(selectedMember)}
                      className="w-full py-2 bg-slate-900 text-fh-gold rounded-lg font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-3 h-3" />
                      Start Visit
                    </button>
                  </div>
                </InfoWindow>
              )}

              {/* Directions */}
              {directions && (
                <DirectionsRenderer
                  directions={directions}
                  options={{
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: "#4285F4",
                      strokeWeight: 5,
                      strokeOpacity: 0.8
                    }
                  }}
                />
              )}
            </GoogleMap>
          )}

          {/* Route Info Overlay */}
          {!isBypassed && routeInfo && (
            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 animate-in slide-in-from-left duration-300">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cms-blue/10 text-cms-blue flex items-center justify-center">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Details</p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-900">{routeInfo.distance}</span>
                    <span className="text-sm font-medium text-slate-500">•</span>
                    <span className="text-sm font-black text-cms-blue">{routeInfo.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {selectedMember && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4 animate-in slide-in-from-right duration-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-black text-slate-900 uppercase text-xs">Navigator</h4>
                <span className="text-[9px] font-black text-fh-green">ACTIVE SESSION</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedMember.latitude},${selectedMember.longitude}`;
                    window.open(url, '_blank');
                  }}
                  className="flex items-center justify-center gap-2 py-3 bg-fh-green text-fh-gold rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  <Navigation className="w-3 h-3" />
                  Route
                </button>
                <a
                  href={`tel:${selectedMember.phone}`}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 transition-all"
                >
                  <Phone className="w-3 h-3" />
                  Call
                </a>
              </div>
            </div>
          )}

          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Nearby Members</h2>
              <div className="p-2 bg-cms-blue/10 text-cms-blue rounded-lg">
                <Compass className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-450px)] overflow-y-auto pr-2 custom-scrollbar">
              {filteredMembers.length > 0 ? (
                filteredMembers.map(member => {
                  const dist = userLocation ? calculateDistance(userLocation.lat, userLocation.lng, member.latitude!, member.longitude!) : null;
                  return (
                    <div
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        if (map) map.panTo({ lat: member.latitude!, lng: member.longitude! });
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${
                        selectedMember?.id === member.id ? 'bg-slate-50 border-cms-blue' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-black text-slate-900 text-sm leading-tight uppercase truncate">{member.first_name} {member.last_name}</p>
                          <p className="text-[10px] text-slate-500 font-medium mt-1 inline-flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" />
                            {member.gps_address || 'No address'}
                          </p>
                        </div>
                        {dist !== null && (
                          <span className="text-[10px] font-black text-cms-blue whitespace-nowrap">
                            {dist < 1 ? `${(dist * 1000).toFixed(0)}m` : `${dist.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-slate-50 pt-3">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                          member.follow_up_status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                          member.follow_up_status === 'Visited' ? 'bg-blue-50 text-blue-600' :
                          member.follow_up_status === 'Contacted' ? 'bg-amber-50 text-amber-600' :
                          'bg-rose-50 text-rose-600'
                        }`}>
                          {member.follow_up_status || 'Pending'}
                        </span>
                        <div className="flex gap-1">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const url = `https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`;
                              window.open(url, '_blank');
                            }}
                            className="w-7 h-7 rounded-lg bg-fh-green/10 flex items-center justify-center text-fh-green hover:bg-fh-green hover:text-fh-gold transition-all active:scale-90"
                            title="Navigation"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                          </button>
                          <a 
                            href={`tel:${member.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all active:scale-90"
                            title="Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <User className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No members found</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-xl">
            <h3 className="text-fh-gold font-black uppercase tracking-widest text-[10px] mb-4">Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending Visit</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contacted</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Visited</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpMapView;
