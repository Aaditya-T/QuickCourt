import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface OperatingHoursProps {
  operatingHours: string;
  onOperatingHoursChange: (hours: string) => void;
}

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

export default function OperatingHours({ 
  operatingHours, 
  onOperatingHoursChange 
}: OperatingHoursProps) {
  const updateDayHours = (dayKey: string, updates: any) => {
    try {
      const hours = JSON.parse(operatingHours);
      hours[dayKey] = { ...hours[dayKey], ...updates };
      onOperatingHoursChange(JSON.stringify(hours));
    } catch (error) {
      console.error("Error updating operating hours:", error);
    }
  };

  const setAllDaysHours = (openTime: string, closeTime: string) => {
    const hours = {
      monday: { open: openTime, close: closeTime },
      tuesday: { open: openTime, close: closeTime },
      wednesday: { open: openTime, close: closeTime },
      thursday: { open: openTime, close: closeTime },
      friday: { open: openTime, close: closeTime },
      saturday: { open: openTime, close: closeTime },
      sunday: { open: openTime, close: closeTime },
    };
    onOperatingHoursChange(JSON.stringify(hours));
  };

  const setAllDaysClosed = (closed: boolean) => {
    if (closed) {
      const hours = {
        monday: { closed: true },
        tuesday: { closed: true },
        wednesday: { closed: true },
        thursday: { closed: true },
        friday: { closed: true },
        saturday: { closed: true },
        sunday: { closed: true },
      };
      onOperatingHoursChange(JSON.stringify(hours));
    } else {
      // Reset to default hours
      const hours = {
        monday: { open: "06:00", close: "23:00" },
        tuesday: { open: "06:00", close: "23:00" },
        wednesday: { open: "06:00", close: "23:00" },
        thursday: { open: "06:00", close: "23:00" },
        friday: { open: "06:00", close: "23:00" },
        saturday: { open: "08:00", close: "22:00" },
        sunday: { closed: true },
      };
      onOperatingHoursChange(JSON.stringify(hours));
    }
  };

  let currentHours;
  try {
    currentHours = JSON.parse(operatingHours);
  } catch (error) {
    currentHours = {};
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <h3 className="text-lg font-medium">Operating Hours</h3>
      <p className="text-sm text-gray-600">Set the opening and closing times for each day of the week</p>
      
      {/* Quick Set All Days */}
      <div className="space-y-3 p-3 border rounded-lg bg-gray-50">
        {/* Set all days to same hours */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 min-w-0">
            <Label className="text-sm font-medium whitespace-nowrap">Set all days to:</Label>
            <div className="flex items-center gap-2">
              <Input
                type="time"
                id="quick-open"
                defaultValue="06:00"
                className="w-20 sm:w-24"
              />
              <span className="text-gray-500 text-xs sm:text-sm">to</span>
              <Input
                type="time"
                id="quick-close"
                defaultValue="23:00"
                className="w-20 sm:w-21"
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const openTime = (document.getElementById('quick-open') as HTMLInputElement).value;
              const closeTime = (document.getElementById('quick-close') as HTMLInputElement).value;
              if (openTime && closeTime) {
                setAllDaysHours(openTime, closeTime);
              }
            }}
            className="whitespace-nowrap text-xs sm:text-sm"
          >
            Apply to All Days
          </Button>
        </div>
        
        {/* Quick Set All Closed */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <input
            type="checkbox"
            id="quick-closed"
            className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            onChange={(e) => setAllDaysClosed(e.target.checked)}
          />
          <Label htmlFor="quick-closed" className="text-sm font-medium">
            Set all days as closed
          </Label>
        </div>
      </div>
      
      {DAYS.map((day) => {
        const dayHours = currentHours[day.key] || {};
        const isClosed = dayHours?.closed || false;
        
        return (
          <div key={day.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg">
            {/* Day label */}
            <div className="w-20 sm:w-24 flex-shrink-0">
              <Label className="text-sm font-medium">{day.label}</Label>
            </div>
            
            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {/* Closed checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`${day.key}-closed`}
                  checked={isClosed}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateDayHours(day.key, { closed: true });
                    } else {
                      updateDayHours(day.key, { open: "06:00", close: "23:00" });
                    }
                  }}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <Label htmlFor={`${day.key}-closed`} className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                  Closed
                </Label>
              </div>
              
              {/* Time inputs - only show if not closed */}
              {!isClosed && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${day.key}-open`} className="text-xs text-gray-600 whitespace-nowrap">Open</Label>
                    <Input
                      id={`${day.key}-open`}
                      type="time"
                      value={dayHours?.open || "06:00"}
                      onChange={(e) => updateDayHours(day.key, { open: e.target.value })}
                      className="w-20 sm:w-24"
                    />
                  </div>
                  <span className="text-gray-500 text-xs sm:text-sm">to</span>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${day.key}-close`} className="text-xs text-gray-600 whitespace-nowrap">Close</Label>
                    <Input
                      id={`${day.key}-close`}
                      type="time"
                      value={dayHours?.close || "23:00"}
                      onChange={(e) => updateDayHours(day.key, { close: e.target.value })}
                      className="w-20 sm:w-21"
                    />
                  </div>
                </div>
              )}
              
              {/* Show "Closed" text when day is marked as closed */}
              {isClosed && (
                <div className="text-gray-500 font-medium text-sm">
                  Closed
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
