import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, X, Check, Search, Plus, Minus, Target, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import LeafletMapPicker from './LeafletMapPicker';

declare global {
  interface Window {
    google: any;
    gm_authFailure: () => void;
  }
}

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: { lat: number; lng: number; address: string; gps: string; maps_url: string }) => void;
  initialCoords?: { lat: number; lng: number } | null;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialCoords
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // FIX 1: Use refs instead of state for synchronous Google Maps instances
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const accuracyCircle = useRef<any>(null);
  const autocompleteInstance = useRef<any>(null);
  const geocoder = useRef<any>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isGeocoding, setIsGeocoding] = useState(false);
  
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(initialCoords || null);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  
  // NEW FEATURE 5: Area Label State
  const [areaLabel, setAreaLabel] = useState<string>('');
  
  // NEW FEATURE 4 & UBER STYLE: Map Drag State
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  // NEW FEATURE 2: Map Type
  const [mapType, setMapType] = useState<'roadmap'|'satellite'>('roadmap');

  // NEW FEATURE: Handle API Authentication Errors
  const [authError, setAuthError] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  // NEW FEATURE 6: Recent Pins
  const [recentPins, setRecentPins] = useState<{lat: number, lng: number, address: string, timestamp: number}[]>([]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Load recent pins on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('church_recent_pins');
      if (stored) setRecentPins(JSON.parse(stored));
    } catch(e) {}
  }, []);

  const saveRecentPin = (pin: {lat: number, lng: number, address: string}) => {
    const newPin = { ...pin, timestamp: Date.now() };
    const updated = [newPin, ...recentPins.filter(p => Math.abs(p.lat - pin.lat) > 0.0001 || Math.abs(p.lng - pin.lng) > 0.0001)].slice(0, 3);
    setRecentPins(updated);
    localStorage.setItem('church_recent_pins', JSON.stringify(updated));
  };
  
  const clearRecentPins = () => {
    setRecentPins([]);
    localStorage.removeItem('church_recent_pins');
  };

  // 1. Script Loader
  useEffect(() => {
    window.gm_authFailure = () => {
      setAuthError(true);
      setUseFallback(true);
      setIsLoading(false);
    };

    if (!isOpen) {
      // FIX 3: Cleanup on close
      if (mapInstance.current && window.google) {
        window.google.maps.event.clearInstanceListeners(mapInstance.current);
      }
      return;
    }
    
    if (!apiKey) {
      setUseFallback(true);
      setIsLoading(false);
      return;
    }

    const initSequence = () => {
      // FIX 2: Wait for DOM to paint before init
      setTimeout(() => {
        initMap();
        setIsLoading(false);
      }, 100);
    };

    if (window.google && window.google.maps) {
      initSequence();
    } else {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        existingScript.addEventListener('load', initSequence);
      } else {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = initSequence;
        document.head.appendChild(script);
      }
    }
  }, [isOpen]);

  // 2. Initialize Map
  const initMap = () => {
    if (!mapRef.current || !window.google) return;

    const defaultCenter = { lat: 5.6037, lng: -0.1870 }; // Accra, GH
    const center = initialCoords || defaultCenter;

    const map = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      disableDefaultUI: true,
      zoomControl: false, // NEW FEATURE 1: Explicitly disable Google zoom control
      mapTypeId: mapType,
      // NEW STYLE UPGRADE: Dark navigation theme
      styles: [
        { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
        { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9d8e8" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5f5e0" }] },
        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] }
      ]
    });
    
    mapInstance.current = map;
    geocoder.current = new window.google.maps.Geocoder();

    if (inputRef.current) {
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'gh' },
        fields: ['formatted_address', 'geometry', 'name'],
      });
      autocomplete.bindTo('bounds', map);
      
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place.geometry || !place.geometry.location) {
          toast.error("No details available for input: '" + place.name + "'");
          return;
        }
        
        map.setCenter(place.geometry.location);
        map.setZoom(17);
        // Do not place marker manually, map idle event handles it
        
        removeAccuracyCircle();
      });
      autocompleteInstance.current = autocomplete;
    }

    // UBER STYLE: Listen to map movement instead of clicks
    map.addListener('dragstart', () => {
      setIsDraggingMap(true);
      removeAccuracyCircle();
    });

    map.addListener('idle', () => {
      setIsDraggingMap(false);
      const center = map.getCenter();
      updateLocationFromLatLng(center, false);
    });

    if (initialCoords) {
      updateLocationFromLatLng(center, false);
    }
  };
  
  const removeAccuracyCircle = () => {
     if (accuracyCircle.current) {
        accuracyCircle.current.setMap(null);
        accuracyCircle.current = null;
     }
  };

  const updateLocationFromLatLng = (latLng: any, moveMap = true) => {
    if (!latLng) return;
    
    const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
    setSelectedCoords({ lat, lng });

    if (moveMap && mapInstance.current) {
       mapInstance.current.panTo(latLng);
    }

    if (!geocoder.current) return;
    setIsGeocoding(true);
    
    geocoder.current.geocode({ location: latLng }, (results: any, status: any) => {
      setIsGeocoding(false);
      if (status === 'OK' && results[0]) {
        setSelectedAddress(results[0].formatted_address);
        if (inputRef.current) {
          inputRef.current.value = results[0].formatted_address;
        }
        
        // NEW FEATURE 5: Extract what3words/area label
        let area = '';
        for (const comp of results[0].address_components) {
          if (comp.types.includes('sublocality') || comp.types.includes('neighborhood') || comp.types.includes('administrative_area_level_2') || comp.types.includes('locality')) {
             if (!area) area = comp.short_name;
             // Favor sublocality/neighborhood if available over admin levels
             if (comp.types.includes('neighborhood') || comp.types.includes('sublocality')) {
                 area = comp.short_name;
                 break;
             }
          }
        }
        setAreaLabel(area);
        
      } else {
        setSelectedAddress('');
        setAreaLabel('');
      }
    });
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    
    toast.info('Getting your live location...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const pos = { lat: latitude, lng: longitude };
        
        if (mapInstance.current) {
          mapInstance.current.setCenter(pos);
          mapInstance.current.setZoom(17);
        }
        
        let latLngObj = pos;
        if (window.google) {
            latLngObj = new window.google.maps.LatLng(latitude, longitude);
            
            // NEW FEATURE 3: Accuracy Radius Circle
            removeAccuracyCircle();
            accuracyCircle.current = new window.google.maps.Circle({
              strokeColor: "#4f46e5",
              strokeOpacity: 0.3,
              strokeWeight: 1,
              fillColor: "#4f46e5",
              fillOpacity: 0.1,
              map: mapInstance.current,
              center: latLngObj,
              radius: accuracy || 50
            });
        }

        // Map idle event will trigger updateLocationFromLatLng
        toast.success("Location found");
      },
      () => {
        toast.error('Unable to retrieve your location');
      },
      { enableHighAccuracy: true }
    );
  };
  
  // NEW FEATURE 6: Select Recent Pin
  const selectRecentPin = (pin: any) => {
     removeAccuracyCircle();
     const latLngObj = window.google ? new window.google.maps.LatLng(pin.lat, pin.lng) : {lat: pin.lat, lng: pin.lng};
     if (mapInstance.current) mapInstance.current.panTo(latLngObj);
  };

  const submitConfirm = () => {
    if (!selectedCoords) return;
    
    const lat = selectedCoords.lat;
    const lng = selectedCoords.lng;
    const gpsStr = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    const mapsURL = `https://maps.google.com/?q=${lat},${lng}`;
    
    const addressToSave = selectedAddress || gpsStr;
    
    saveRecentPin({ lat, lng, address: addressToSave });
    
    onConfirm({
      lat,
      lng,
      address: addressToSave,
      gps: gpsStr,
      maps_url: mapsURL
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white w-full max-w-4xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Pin Map Location</h2>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Search or drag to select</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors border border-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar inside header extension */}
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-col gap-2">
            <div className="flex gap-2">
               <div className="relative flex-1">
                  <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Search for a location..." 
                    className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 outline-none shadow-sm" 
                  />
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               </div>
            </div>
            
            {/* NEW FEATURE 6: Recent Pins Row */}
            {recentPins.length > 0 && (
              <div className="flex items-center gap-2 pt-1 pb-1 overflow-x-auto">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent</span>
                  <button onClick={clearRecentPins} className="text-slate-300 hover:text-rose-500 rounded-full p-0.5"><X className="w-3 h-3" /></button>
                </div>
                {recentPins.map((pin, i) => (
                   <button 
                     key={i} 
                     onClick={() => selectRecentPin(pin)}
                     className="shrink-0 max-w-[150px] truncate px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm transition-all text-left"
                   >
                     {pin.address}
                   </button>
                ))}
              </div>
            )}
          </div>

            {/* Map Canvas */}
          <div className="flex-1 relative bg-slate-100">
            {useFallback || authError ? (
              <div className="w-full h-full relative">
                <LeafletMapPicker 
                  initialCenter={selectedCoords || { lat: 5.6037, lng: -0.1870 }}
                  onLocationSelect={(lat, lng, address) => {
                    setSelectedCoords({ lat, lng });
                    setSelectedAddress(address);
                    if (inputRef.current) inputRef.current.value = address;
                  }}
                />
                <div className="absolute top-4 left-4 z-[1000]">
                  <div className="bg-amber-100/90 backdrop-blur-sm text-amber-900 px-3 py-2 rounded-xl border border-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
                    <Globe className="w-3 h-3" />
                    {authError ? 'Auth Error: Leaflet Active' : 'Leaflet Fallback Active'}
                  </div>
                </div>
              </div>
            ) : !apiKey ? (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                Google Maps API Key not configured.
              </div>
            ) : isLoading ? (
               <div className="absolute inset-0 flex items-center justify-center p-6 text-indigo-500 font-bold uppercase tracking-widest text-[10px]">
                 Loading Maps...
               </div>
            ) : (
              <div ref={mapRef} className="w-full h-full" />
            )}
            
            {/* NEW FEATURE 8: Whatsapp-style Live Location Button on Map Canvas */}
            {!isLoading && !authError && apiKey && (
               <div className="absolute top-4 left-4 z-10">
                 <button 
                   onClick={handleGPS}
                   className="w-10 h-10 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-colors group"
                   title="Use current location"
                 >
                   <Navigation className="w-5 h-5 group-active:scale-95 transition-transform" />
                 </button>
               </div>
            )}
            
            {/* UBER STYLE FIXED CENTER PIN */}
            {!isLoading && !authError && apiKey && (
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[100%] z-20 pointer-events-none flex flex-col items-center">
                 <motion.div 
                   animate={{ y: isDraggingMap ? -15 : 0 }} 
                   transition={{ type: "spring", stiffness: 400, damping: 25 }}
                   className="relative flex flex-col items-center"
                 >
                   <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl border-[3px] border-white z-10">
                     <div className="w-3 h-3 bg-white rounded-full" />
                   </div>
                   <div className="w-1 h-3 bg-indigo-800 -mt-1 z-0" />
                 </motion.div>
                 
                 {/* CSS shadow below the bouncing pin */}
                 <motion.div 
                   animate={{ scale: isDraggingMap ? 0.5 : 1, opacity: isDraggingMap ? 0.3 : 0.6 }}
                   className="w-4 h-1.5 bg-black/40 blur-[1px] rounded-[100%] absolute -bottom-1"
                 />
                 
                 {/* Crosshairs to show exact drop center when panning */}
                 <AnimatePresence>
                   {isDraggingMap && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.5 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.5 }}
                       className="absolute top-0 text-indigo-900/30 -mt-[4px]"
                     >
                       <Target className="w-12 h-12" />
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
            )}

            {/* NEW FEATURE 2: Map Type Toggle */}
            {!isLoading && !authError && apiKey && (
               <div className="absolute top-4 right-4 z-10 flex bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
                 <button 
                   onClick={() => { setMapType('roadmap'); mapInstance.current?.setMapTypeId('roadmap'); }}
                   className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors ${mapType === 'roadmap' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                 >
                   Map
                 </button>
                 <button 
                   onClick={() => { setMapType('satellite'); mapInstance.current?.setMapTypeId('satellite'); }}
                   className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-colors border-l border-slate-200 ${mapType === 'satellite' ? 'bg-indigo-600 text-white border-l-transparent' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                 >
                   Satellite
                 </button>
               </div>
            )}

            {/* NEW FEATURE 1: Custom Zoom Controls */}
            {!isLoading && !authError && apiKey && (
               <div className="absolute bottom-6 right-4 z-10 flex flex-col gap-2">
                 <button 
                   onClick={() => mapInstance.current && mapInstance.current.setZoom(mapInstance.current.getZoom() + 1)}
                   className="w-10 h-10 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-colors"
                 >
                   <Plus className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => mapInstance.current && mapInstance.current.setZoom(mapInstance.current.getZoom() - 1)}
                   className="w-10 h-10 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center text-indigo-600 hover:bg-slate-50 transition-colors"
                 >
                   <Minus className="w-5 h-5" />
                 </button>
               </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 bg-white border-t border-slate-100">
            {selectedCoords ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Selected Location</h4>
                  <p className="text-sm font-bold text-slate-800 truncate">
                     {isGeocoding ? 'Getting address...' : (selectedAddress || 'Custom Location')}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[10px] font-bold text-indigo-600 tracking-widest">
                       {selectedCoords.lat.toFixed(6)}, {selectedCoords.lng.toFixed(6)}
                    </p>
                    {/* NEW FEATURE 5: Area Label */}
                    {!isGeocoding && areaLabel && (
                      <span className="bg-slate-100 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-bold">
                        {areaLabel}
                      </span>
                    )}
                  </div>
                </div>
                {/* NEW FEATURE 7: Confirm Button Loading State */}
                <button 
                  onClick={submitConfirm}
                  disabled={isGeocoding}
                  className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-lg flex-shrink-0 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGeocoding && (
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                  )}
                  {isGeocoding ? 'Locating...' : 'Confirm Selection'}
                </button>
              </div>
            ) : (
              <div className="py-2 text-center">
                 <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Tap the map to drop a pin</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
