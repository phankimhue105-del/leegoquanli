import React, { useMemo } from 'react';
import {
  Calendar,
  Clock,
  UserCheck,
  UserPlus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useData } from '../../context/DataContext';

interface AdminDailyClassOverviewProps {
  selectedDate: string;
  selectedClassId: string;
  onSelectClass: (classId: string) => void;
}

interface DailyClassOverviewItem {
  classId: string;
  className: string;
  classCode: string;
  teacherName: string;
  assistantName: string | null;
  timeDisplay: string;
  startMinutes: number;
  endMinutes: number;
  isCompleted: boolean;
}

const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Thứ 2',
  2: 'Thứ 3',
  3: 'Thứ 4',
  4: 'Thứ 5',
  5: 'Thứ 6',
  6: 'Thứ 7',
  7: 'Chủ Nhật'
};

const WEEKDAY_PATTERNS: Record<number, RegExp[]> = {
  1: [/thứ\s*2/i, /\bt2\b/i, /\bmonday\b/i, /\bmon\b/i],
  2: [/thứ\s*3/i, /\bt3\b/i, /\btuesday\b/i, /\btue\b/i],
  3: [/thứ\s*4/i, /\bt4\b/i, /\bwednesday\b/i, /\bwed\b/i],
  4: [/thứ\s*5/i, /\bt5\b/i, /\bthursday\b/i, /\bthu\b/i],
  5: [/thứ\s*6/i, /\bt6\b/i, /\bfriday\b/i, /\bfri\b/i],
  6: [/thứ\s*7/i, /\bt7\b/i, /\bsaturday\b/i, /\bsat\b/i],
  7: [/chủ\s*nhật/i, /\bcn\b/i, /\bsunday\b/i, /\bsun\b/i]
};

function getLocalTodayISO(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInfo(dateStr: string): {
  effectiveDate: string;
  dayOfWeek: number;
  weekdayLabel: string;
  displayDate: string;
} {
  const effectiveDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : getLocalTodayISO();
  const [yearStr, monthStr, dayStr] = effectiveDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const dateObj = new Date(year, month - 1, day);
  const jsDay = dateObj.getDay();
  const dayOfWeek = jsDay === 0 ? 7 : jsDay;

  return {
    effectiveDate,
    dayOfWeek,
    weekdayLabel: WEEKDAY_LABELS[dayOfWeek] || '',
    displayDate: `${dayStr}/${monthStr}/${yearStr}`
  };
}

function parseSingleTimeToken(
  token: string,
  inheritedMeridiem?: 'am' | 'pm',
  endHourRaw?: number
): { minutes: number; hourRaw: number; meridiem?: 'am' | 'pm' } {
  const match = token.trim().match(/(\d{1,2})\s*[:h]\s*(\d{2})(?:\s*(am|pm))?/i);
  if (!match) {
    return { minutes: Number.MAX_SAFE_INTEGER, hourRaw: -1 };
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const explicitMeridiem = match[3]?.toLowerCase() as 'am' | 'pm' | undefined;

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { minutes: Number.MAX_SAFE_INTEGER, hourRaw: -1 };
  }

  const rawHour = hour;
  const effectiveMeridiem =
    explicitMeridiem ||
    (inheritedMeridiem === 'pm' &&
    rawHour < 12 &&
    (endHourRaw === undefined || (rawHour <= endHourRaw && endHourRaw !== 12))
      ? 'pm'
      : undefined);

  if (effectiveMeridiem === 'pm' && hour < 12) {
    hour += 12;
  } else if (effectiveMeridiem === 'am' && hour === 12) {
    hour = 0;
  }

  return {
    minutes: hour * 60 + minute,
    hourRaw: rawHour,
    meridiem: explicitMeridiem || effectiveMeridiem
  };
}

function parseTimeRangeMinutes(timeRangeStr?: string): {
  startMinutes: number;
  endMinutes: number;
} {
  if (!timeRangeStr || !timeRangeStr.trim()) {
    return {
      startMinutes: Number.MAX_SAFE_INTEGER,
      endMinutes: Number.MAX_SAFE_INTEGER
    };
  }

  const parts = timeRangeStr.split(/\s*[-–—]\s*/);
  if (parts.length >= 2) {
    const endParsed = parseSingleTimeToken(parts[1]);
    const startParsed = parseSingleTimeToken(parts[0], endParsed.meridiem, endParsed.hourRaw);
    return {
      startMinutes: startParsed.minutes,
      endMinutes: endParsed.minutes
    };
  }

  const single = parseSingleTimeToken(parts[0]);
  return {
    startMinutes: single.minutes,
    endMinutes: single.minutes
  };
}

function doesTextMatchWeekday(text: string, dayOfWeek: number): boolean {
  const patterns = WEEKDAY_PATTERNS[dayOfWeek];
  if (!patterns) return false;
  return patterns.some(pattern => pattern.test(text));
}

function extractTimeForWeekdayFromScheduleText(
  scheduleDays: string,
  dayOfWeek: number,
  fallbackTime: string
): string {
  const segments = scheduleDays.split(/[,;\n]+/);
  for (const segment of segments) {
    if (doesTextMatchWeekday(segment, dayOfWeek)) {
      const timeMatch = segment.match(
        /\d{1,2}\s*[:h]\s*\d{2}(?:\s*(?:am|pm))?\s*[-–—]\s*\d{1,2}\s*[:h]\s*\d{2}(?:\s*(?:am|pm))?/i
      );
      if (timeMatch) {
        return timeMatch[0].trim();
      }
    }
  }
  return fallbackTime;
}

export const AdminDailyClassOverview: React.FC<AdminDailyClassOverviewProps> = ({
  selectedDate,
  selectedClassId,
  onSelectClass
}) => {
  const { data } = useData();

  const { effectiveDate, dayOfWeek, weekdayLabel, displayDate } = useMemo(
    () => parseDateInfo(selectedDate),
    [selectedDate]
  );

  const scheduledClasses = useMemo<DailyClassOverviewItem[]>(() => {
    const classes = data.classes || [];
    const timetable = data.timetable || [];
    const teachers = data.teachers || [];
    const assistants = data.teachingAssistants || [];
    const attendanceRecords = data.attendance || [];

    const classMap = new Map(classes.map(c => [c.id, c]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const assistantMap = new Map(assistants.map(ta => [ta.id, ta]));

    const classesWithTimetable = new Set(
      timetable.filter(s => s.status !== 'cancelled').map(s => s.classId)
    );

    const itemsByClassId = new Map<string, DailyClassOverviewItem>();

    // 1. Primary source: weekly timetable sessions (supports per-weekday time, teacher, and TA)
    const matchingTimetableSessions = timetable.filter(session => {
      if (session.status === 'cancelled') return false;
      if (session.date && session.date !== effectiveDate) return false;
      if (session.dayOfWeek !== dayOfWeek) return false;

      const cls = classMap.get(session.classId);
      if (cls && cls.status === 'cancelled') return false;

      return true;
    });

    for (const session of matchingTimetableSessions) {
      const cls = classMap.get(session.classId);
      const teacherFromId =
        teacherMap.get(session.teacherId) ||
        (cls?.teacherId ? teacherMap.get(cls.teacherId) : undefined);
      const teacherName =
        teacherFromId?.fullName || session.teacherName || 'Chưa phân công GV';

      const assistantFromId = session.assistantId
        ? assistantMap.get(session.assistantId)
        : undefined;
      const assistantName =
        assistantFromId?.fullName ||
        (session.assistantName && session.assistantName.trim()
          ? session.assistantName.trim()
          : null);

      const timeDisplay =
        session.startTime && session.endTime
          ? `${session.startTime}–${session.endTime}`
          : cls?.scheduleTime || 'Chưa có giờ học';
      const { startMinutes, endMinutes } = parseTimeRangeMinutes(timeDisplay);

      const attendanceRecord = attendanceRecords.find(
        a => a.classId === session.classId && a.date === effectiveDate
      );
      const isCompleted = Boolean(
        attendanceRecord &&
          (attendanceRecord.records.length > 0 || attendanceRecord.takenAt)
      );

      const existing = itemsByClassId.get(session.classId);
      if (!existing || startMinutes < existing.startMinutes) {
        itemsByClassId.set(session.classId, {
          classId: session.classId,
          className: cls?.name || session.className || session.classId,
          classCode: cls?.code || '',
          teacherName,
          assistantName,
          timeDisplay,
          startMinutes,
          endMinutes,
          isCompleted
        });
      }
    }

    // 2. Fallback source: classes without timetable entries using scheduleDays / scheduleTime
    for (const cls of classes) {
      if (cls.status === 'cancelled') continue;
      if (classesWithTimetable.has(cls.id)) continue;
      if (itemsByClassId.has(cls.id)) continue;
      if (!cls.scheduleDays || !doesTextMatchWeekday(cls.scheduleDays, dayOfWeek)) {
        continue;
      }

      const teacher = cls.teacherId ? teacherMap.get(cls.teacherId) : undefined;
      const assistant = cls.assistantTeacherId
        ? assistantMap.get(cls.assistantTeacherId)
        : undefined;

      const rawTimeDisplay = extractTimeForWeekdayFromScheduleText(
        cls.scheduleDays,
        dayOfWeek,
        cls.scheduleTime || ''
      );
      const timeDisplay = rawTimeDisplay
        ? rawTimeDisplay.replace(/\s*[-–—]\s*/g, '–')
        : 'Chưa có giờ học';
      const { startMinutes, endMinutes } = parseTimeRangeMinutes(rawTimeDisplay);

      const attendanceRecord = attendanceRecords.find(
        a => a.classId === cls.id && a.date === effectiveDate
      );
      const isCompleted = Boolean(
        attendanceRecord &&
          (attendanceRecord.records.length > 0 || attendanceRecord.takenAt)
      );

      itemsByClassId.set(cls.id, {
        classId: cls.id,
        className: cls.name || cls.id,
        classCode: cls.code || '',
        teacherName: teacher?.fullName || 'Chưa phân công GV',
        assistantName: assistant?.fullName || null,
        timeDisplay,
        startMinutes,
        endMinutes,
        isCompleted
      });
    }

    return Array.from(itemsByClassId.values()).sort((a, b) => {
      if (a.startMinutes !== b.startMinutes) {
        return a.startMinutes - b.startMinutes;
      }
      if (a.endMinutes !== b.endMinutes) {
        return a.endMinutes - b.endMinutes;
      }
      const nameCompare = a.className.localeCompare(b.className, 'vi');
      if (nameCompare !== 0) {
        return nameCompare;
      }
      return a.classId.localeCompare(b.classId);
    });
  }, [
    data.classes,
    data.timetable,
    data.teachers,
    data.teachingAssistants,
    data.attendance,
    effectiveDate,
    dayOfWeek
  ]);

  const completedCount = scheduledClasses.filter(c => c.isCompleted).length;
  const pendingCount = scheduledClasses.length - completedCount;

  return (
    <section
      aria-label="Tổng quan lớp học hôm nay"
      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-red-600 shrink-0" />
            <span>Tổng quan lớp học hôm nay</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Lịch học ngày <strong className="text-slate-700">{weekdayLabel}, {displayDate}</strong> (sắp xếp theo giờ bắt đầu)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            {scheduledClasses.length} lớp có lịch
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            {completedCount} đã điểm danh
          </span>
          <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 font-bold">
            {pendingCount} chưa điểm danh
          </span>
        </div>
      </div>

      {scheduledClasses.length === 0 ? (
        <div className="py-8 px-4 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500">
          Không có lớp học nào được lên lịch vào {weekdayLabel}, {displayDate}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {scheduledClasses.map(item => {
            const isSelected = item.classId === selectedClassId;

            return (
              <button
                key={item.classId}
                type="button"
                onClick={() => onSelectClass(item.classId)}
                className={`text-left rounded-xl p-4 border transition-all flex flex-col justify-between gap-3 min-w-0 cursor-pointer ${
                  item.isCompleted
                    ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70 text-emerald-950'
                    : 'bg-red-50 border-red-300 hover:bg-red-100/70 text-red-950'
                } ${
                  isSelected
                    ? item.isCompleted
                      ? 'ring-2 ring-emerald-600 shadow-sm'
                      : 'ring-2 ring-red-600 shadow-sm'
                    : ''
                }`}
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    {item.classCode ? (
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          item.isCompleted
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {item.classCode}
                      </span>
                    ) : (
                      <span />
                    )}

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${
                        item.isCompleted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
                    >
                      {item.isCompleted ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      <span>{item.isCompleted ? 'Đã điểm danh' : 'Chưa điểm danh'}</span>
                    </span>
                  </div>

                  <div className="font-extrabold text-sm leading-snug break-words">
                    {item.className}
                  </div>
                </div>

                <div
                  className={`space-y-1.5 pt-2.5 border-t text-xs min-w-0 ${
                    item.isCompleted
                      ? 'border-emerald-200/80 text-emerald-900'
                      : 'border-red-200/80 text-red-900'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="font-bold truncate">{item.timeDisplay}</span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserCheck className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="truncate">
                      <span className="opacity-75">GV:</span>{' '}
                      <span className="font-semibold">{item.teacherName}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <UserPlus className="w-3.5 h-3.5 shrink-0 opacity-80" />
                    <span className="truncate">
                      <span className="opacity-75">TA:</span>{' '}
                      <span
                        className={
                          item.assistantName ? 'font-semibold' : 'italic opacity-80'
                        }
                      >
                        {item.assistantName || 'Chưa phân công TA'}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};
