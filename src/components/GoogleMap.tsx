'use client';

import React, { useEffect, useRef, useState } from 'react';

interface GoogleMapProps {
  workerLat: number | null;
  workerLng: number | null;
  customerLat: number;
  customerLng: number;
  workerName?: string;
  zoom?: number;
}

export default function GoogleMap({
  workerLat,
  workerLng,
  customerLat,
  customerLng,
  workerName = 'Technician',
  zoom = 14,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const leafletMapInstanceRef = useRef<any>(null);
  const leafletWorkerMarkerRef = useRef<any>(null);
  const leafletCustomerMarkerRef = useRef<any>(null);
  const leafletPolylineRef = useRef<any>(null);

  // Load Leaflet on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Inject Leaflet CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Inject Leaflet JS
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const scriptId = 'leaflet-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => setLeafletLoaded(true);
      script.onerror = () => setError('Map engine failed to initialize.');
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => setLeafletLoaded(true));
    }
  }, []);

  // Update Leaflet Map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || typeof window === 'undefined' || !(window as any).L) return;

    const L = (window as any).L;

    if (!leafletMapInstanceRef.current) {
      leafletMapInstanceRef.current = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([customerLat, customerLng], zoom);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(leafletMapInstanceRef.current);
    }

    const map = leafletMapInstanceRef.current;

    // Custom Customer Pin
    const customerIcon = L.divIcon({
      html: `<div style="background-color: #e11d48; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.3)"></div>`,
      className: 'custom-customer-icon',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    if (!leafletCustomerMarkerRef.current) {
      leafletCustomerMarkerRef.current = L.marker([customerLat, customerLng], { icon: customerIcon })
        .addTo(map)
        .bindPopup('Service Destination');
    } else {
      leafletCustomerMarkerRef.current.setLatLng([customerLat, customerLng]);
    }

    // Custom Worker Pin
    if (workerLat !== null && workerLng !== null) {
      const workerPos: [number, number] = [workerLat, workerLng];
      const workerIcon = L.divIcon({
        html: `<div style="font-size: 20px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3))">🚗</div>`,
        className: 'custom-worker-icon',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      if (!leafletWorkerMarkerRef.current) {
        leafletWorkerMarkerRef.current = L.marker(workerPos, { icon: workerIcon })
          .addTo(map)
          .bindPopup(workerName);
      } else {
        leafletWorkerMarkerRef.current.setLatLng(workerPos);
      }

      // Polyline route
      if (!leafletPolylineRef.current) {
        leafletPolylineRef.current = L.polyline(
          [workerPos, [customerLat, customerLng]],
          { color: '#2563eb', weight: 4, opacity: 0.8 }
        ).addTo(map);
      } else {
        leafletPolylineRef.current.setLatLngs([workerPos, [customerLat, customerLng]]);
      }

      // Adjust viewport bounds
      const bounds = L.latLngBounds([
        [customerLat, customerLng],
        workerPos,
      ]);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      if (leafletWorkerMarkerRef.current) {
        map.removeLayer(leafletWorkerMarkerRef.current);
        leafletWorkerMarkerRef.current = null;
      }
      if (leafletPolylineRef.current) {
        map.removeLayer(leafletPolylineRef.current);
        leafletPolylineRef.current = null;
      }
      map.setView([customerLat, customerLng], zoom);
    }
  }, [leafletLoaded, workerLat, workerLng, customerLat, customerLng, zoom, workerName]);

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
      {error && (
        <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-xs text-rose-500 font-bold p-4 text-center z-10">
          {error}
        </div>
      )}
      <div ref={mapRef} className="w-full h-full bg-slate-50 min-h-[300px]" />
    </div>
  );
}
