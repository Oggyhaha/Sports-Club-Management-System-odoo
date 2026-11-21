import React from 'react';
import { Calendar, Clock, Check, AlertCircle } from 'lucide-react';

/**
 * Interactive Court Availability Grid (06:00–22:00 IST).
 * Renders courts across 30-minute intervals and allows one-click booking.
 */
export const CourtScheduleMatrix = ({
  courts = [],
  availability = {},
  selectedDate,
  onSelectSlot,
  loading = false,
}) => {
  // Standard operating hours: 06:00 to 22:00 in 30-min slots
  const timeSlots = [];
  for (let hour = 6; hour < 22; hour++) {
    const hh = String(hour).padStart(2, '0');
    timeSlots.push(`${hh}:00`);
    timeSlots.push(`${hh}:30`);
  }

  const bookedSlotsByCourt = {};
  if (availability.booked_slots) {
    availability.booked_slots.forEach((b) => {
      if (!bookedSlotsByCourt[b.court_id]) bookedSlotsByCourt[b.court_id] = new Set();
      const startTimeStr = b.start_time.split('T')[1]?.substring(0, 5) || b.start_time.substring(11, 16);
      bookedSlotsByCourt[b.court_id].add(startTimeStr);
    });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-900">
            Court Operating Schedule ({selectedDate})
          </h3>
          <span className="text-2xs px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-medium">
            06:00 – 22:00 IST
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300" /> Available (Click to reserve)
          </span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-3 h-3 rounded bg-slate-300 border border-slate-400" /> Booked / Occupied
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs">
          Loading real-time court availability matrix...
        </div>
      ) : courts.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          No active courts configured in system.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700">
                <th className="py-2.5 px-4 font-semibold sticky left-0 bg-slate-100 z-10 w-44">
                  Court / Facility
                </th>
                {timeSlots.map((slot) => (
                  <th
                    key={slot}
                    className="py-2.5 px-2 font-mono text-3xs text-center border-l border-slate-200/60 min-w-[52px]"
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {courts.map((court) => {
                const bookedSet = bookedSlotsByCourt[court.id] || new Set();

                return (
                  <tr key={court.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-200">
                      <p className="font-semibold text-xs text-slate-800">{court.name}</p>
                      <p className="text-3xs text-slate-400 capitalize">{court.sport_type} • ₹{court.hourly_rate}/h</p>
                    </td>

                    {timeSlots.map((slot) => {
                      const isBooked = bookedSet.has(slot);
                      return (
                        <td
                          key={slot}
                          className="p-1 text-center border-l border-slate-100 min-w-[52px]"
                        >
                          {isBooked ? (
                            <div
                              title={`Occupied: ${court.name} at ${slot}`}
                              className="w-full h-8 rounded bg-slate-200/80 border border-slate-300 flex items-center justify-center text-slate-500 cursor-not-allowed select-none text-3xs"
                            >
                              Booked
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onSelectSlot(court, slot)}
                              title={`Reserve ${court.name} at ${slot}`}
                              className="w-full h-8 rounded bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 text-emerald-800 transition-colors flex items-center justify-center text-3xs font-medium cursor-pointer"
                            >
                              Free
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CourtScheduleMatrix;
