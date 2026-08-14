"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AppointmentStatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import * as appointmentsApi from "@/lib/api/appointments";
import {
  WEEKDAY_LABELS,
  addDaysToKey,
  endOfMonthKey,
  formatDateOnlyShort,
  formatMonthLabel,
  formatTime,
  startOfMonthKey,
  todayKey,
  weekdayIndex,
} from "@/lib/format";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

export function AppointmentsCalendarScreen({
  mode,
}: {
  mode: "clinic" | "mine";
}) {
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonthKey(todayKey()));
  const [selectedDate, setSelectedDate] = useState(() => todayKey());

  const from = startOfMonthKey(monthAnchor);
  const to = endOfMonthKey(monthAnchor);
  const isMine = mode === "mine";

  const query = useQuery({
    queryKey: isMine
      ? queryKeys.myAppointmentCalendar(from, to)
      : queryKeys.appointmentCalendar(from, to),
    queryFn: () =>
      isMine
        ? appointmentsApi.getMyAppointmentCalendar({ from, to })
        : appointmentsApi.getAppointmentCalendar({ from, to }),
  });

  const byDate = query.data ?? {};

  const cells = useMemo(() => {
    const leadingBlanks = weekdayIndex(from);
    const lastDay = Number(to.slice(8, 10));
    const days: (string | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 0; day < lastDay; day += 1) {
      days.push(addDaysToKey(from, day));
    }
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [from, to]);

  const selectedAppointments = byDate[selectedDate] ?? [];
  const todayHref = isMine ? "/appointments/me/today" : "/appointments/today";

  return (
    <>
      <PageHeader
        eyebrow="Schedule"
        title={isMine ? "My appointments" : "Appointments"}
        description={
          isMine
            ? "Appointments assigned to you. One treatment room — each date and time holds a single booking."
            : "One treatment room. Each date and time holds a single appointment."
        }
      >
        <Button asChild variant="outline" size="sm">
          <Link href={todayHref}>Today&apos;s queue</Link>
        </Button>
        <Can permission="appointment.create">
          <Button asChild size="sm">
            <Link href={`/appointments/new?date=${selectedDate}`}>
              <Plus className="h-3.5 w-3.5" />
              Book
            </Link>
          </Button>
        </Can>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{formatMonthLabel(monthAnchor)}</CardTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 px-0"
                aria-label="Previous month"
                onClick={() => setMonthAnchor(startOfMonthKey(addDaysToKey(from, -1)))}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => {
                  setMonthAnchor(startOfMonthKey(todayKey()));
                  setSelectedDate(todayKey());
                }}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 px-0"
                aria-label="Next month"
                onClick={() => setMonthAnchor(startOfMonthKey(addDaysToKey(to, 1)))}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {query.isError ? (
              <ErrorState
                error={query.error}
                onRetry={() => query.refetch()}
                className="border-0"
              />
            ) : (
              <>
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="px-2 py-1.5 text-center">
                      <span className="tech-label">{label}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {cells.map((dateKey, index) => {
                    if (!dateKey) {
                      return (
                        <div
                          key={`blank-${index}`}
                          className="min-h-[4.5rem] border-b border-r border-border bg-muted/30 last:border-r-0"
                        />
                      );
                    }

                    const dayAppointments = byDate[dateKey] ?? [];
                    const isSelected = dateKey === selectedDate;
                    const isToday = dateKey === todayKey();

                    return (
                      <button
                        key={dateKey}
                        type="button"
                        onClick={() => setSelectedDate(dateKey)}
                        className={cn(
                          "min-h-[4.5rem] border-b border-r border-border p-1.5 text-left transition-colors hover:bg-accent/60",
                          isSelected && "bg-accent ring-1 ring-inset ring-primary",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={cn(
                              "font-mono text-[11px]",
                              isToday
                                ? "bg-primary px-1 text-primary-foreground"
                                : "text-muted-foreground",
                            )}
                          >
                            {dateKey.slice(8, 10)}
                          </span>
                          {query.isPending ? (
                            <Skeleton className="h-3 w-3" />
                          ) : dayAppointments.length > 0 ? (
                            <span className="font-mono text-[10px] text-primary">
                              {dayAppointments.length}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-1 space-y-0.5">
                          {dayAppointments.slice(0, 2).map((appointment) => (
                            <p
                              key={appointment.id}
                              className="truncate font-mono text-[10px] text-muted-foreground"
                            >
                              {formatTime(appointment.appointmentTime)}{" "}
                              {appointment.patient.fullName}
                            </p>
                          ))}
                          {dayAppointments.length > 2 ? (
                            <p className="font-mono text-[10px] text-primary">
                              +{dayAppointments.length - 2} more
                            </p>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{formatDateOnlyShort(selectedDate)}</CardTitle>
          </CardHeader>

          {query.isPending ? (
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </CardContent>
          ) : query.isError ? (
            <ErrorState error={query.error} className="border-0" />
          ) : selectedAppointments.length === 0 ? (
            <EmptyState
              className="border-0"
              title="Nothing booked"
              description="This day is free."
              action={
                <Can permission="appointment.create">
                  <Button asChild size="sm">
                    <Link href={`/appointments/new?date=${selectedDate}`}>Book this day</Link>
                  </Button>
                </Can>
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {selectedAppointments.map((appointment) => (
                <div key={appointment.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 shrink-0 font-mono text-xs text-primary">
                    {formatTime(appointment.appointmentTime)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{appointment.patient.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">{appointment.purpose}</p>
                    {!isMine ? (
                      <p className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        {appointment.dentist.fullName}
                      </p>
                    ) : null}
                    <div className="mt-1.5">
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                  </div>
                  <AppointmentActions appointment={appointment} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
