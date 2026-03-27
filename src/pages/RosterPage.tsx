import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockShifts } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MapPin, Clock } from "lucide-react";
import { format, parseISO, addDays, startOfWeek, isSameDay } from "date-fns";

const formatTime = (t: string) => {
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "pm" : "am";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m}${ampm}`;
};

const RosterPage = () => {
  const { user, isAdmin } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  if (!user) return null;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const shifts = isAdmin
    ? mockShifts
    : mockShifts.filter((s) => s.staffId === user.id);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">
          {isAdmin ? "Full Roster" : "My Roster"}
        </h1>
      </div>

      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-2">
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, -7))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold text-foreground">
          {format(weekStart, "d MMM")} – {format(addDays(weekStart, 6), "d MMM yyyy")}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {weekDays.map((day) => {
          const dayShifts = shifts.filter((s) => isSameDay(parseISO(s.date), day));
          const isToday = isSameDay(day, new Date());

          return (
            <div key={day.toISOString()}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "EEEE d MMM")}
                {isToday && <span className="ml-1.5 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Today</span>}
              </p>
              {dayShifts.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-3 text-center text-sm text-muted-foreground">
                    No shifts
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((shift) => (
                    <Card key={shift.id} className={isToday ? "border-primary/30 bg-primary/5" : ""}>
                      <CardContent className="p-3">
                        {isAdmin && (
                          <p className="text-sm font-semibold text-foreground mb-1">{shift.staffName}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(shift.startTime)} – {formatTime(shift.endTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {shift.area}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RosterPage;
