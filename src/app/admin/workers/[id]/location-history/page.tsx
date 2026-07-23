'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MapPin, Navigation } from 'lucide-react';
import GoogleMap from '@/components/GoogleMap'; // Assuming this component exists and can handle polylines if extended

export default function LocationHistoryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const workerId = params.id as string;
  const bookingId = searchParams.get('booking_id');

  const [locations, setLocations] = useState<any[]>([]);
  const [customerLoc, setCustomerLoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!bookingId) {
      setError('Booking ID is required to view location history.');
      setLoading(false);
      return;
    }

    async function fetchHistory() {
      try {
        const res = await fetch(`/api/admin/workers/${workerId}/location-history?booking_id=${bookingId}`);
        const data = await res.json();
        
        if (res.ok) {
          setLocations(data.locations || []);
          setCustomerLoc(data.customerLocation);
        } else {
          setError(data.error || 'Failed to load location history.');
        }
      } catch (err) {
        console.error(err);
        setError('Error fetching location history.');
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [workerId, bookingId]);

  // For a real implementation, GoogleMap needs to be extended to accept an array of path coordinates to draw a polyline.
  // Here we will just visualize the start, end, and customer locations if it doesn't support polylines yet.

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-white">
        <Loader2 className="h-8 w-8 text-[#FF8A00] animate-spin" />
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-500 font-mono">Loading GPS coordinates...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center min-h-[60vh] flex flex-col justify-center items-center">
        <p className="text-red-500 font-bold mb-4">{error}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-slate-800 text-white rounded-xl">Go Back</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans select-none animate-in fade-in duration-200">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Profile
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1F2937]/50 pb-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono flex items-center gap-2">
            <Navigation className="h-6 w-6 text-[#FF8A00]" />
            Location Playback
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
            GPS trail for Booking ID: {bookingId}
          </p>
        </div>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] rounded-3xl p-5 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <span className="w-3 h-3 rounded-full bg-blue-500"></span> Start Point
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <span className="w-3 h-3 rounded-full bg-green-500"></span> End Point
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 font-bold">
              <span className="w-3 h-3 rounded-full bg-red-500"></span> Customer Location
            </div>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {locations.length} coordinates recorded
          </div>
        </div>

        <div className="w-full h-[60vh] bg-[#0A0F1E] rounded-2xl border border-[#1F2937] overflow-hidden relative">
          {locations.length > 0 ? (
            <GoogleMap
              workerLat={locations[0].lat}
              workerLng={locations[0].lng}
              customerLat={customerLoc?.lat}
              customerLng={customerLoc?.lng}
              workerName="Worker Start"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 font-mono text-sm">
              No location data recorded for this timeframe.
            </div>
          )}
          
          {/* Note: In a complete implementation, we would pass `path={locations}` to GoogleMap and it would render a Polyline */}
        </div>
      </div>
    </div>
  );
}
