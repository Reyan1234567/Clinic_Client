"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CalendarClock,
  Eye,
  LogIn,
  Play,
  XCircle,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { RowActionMenu, type RowAction } from "@/components/auth/row-actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import * as appointmentsApi from "@/lib/api/appointments";
import { toDateKey, todayKey, toTimeInputValue, toUtcDateTime } from "@/lib/format";
import { applyApiErrorToForm } from "@/lib/hooks/use-form-errors";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";
import { ApiError, type Appointment, type AppointmentVisitSummary } from "@/lib/types";

const rescheduleSchema = z.object({
  date: z.string().min(1, "Pick a date"),
  time: z.string().min(1, "Pick a time"),
});

type RescheduleValues = z.infer<typeof rescheduleSchema>;

/**
 * Actions are added one at a time and each carries its own permission plus the
 * server's own state rule. Check-in is reception (GLOBAL) only in the UI.
 * Doctors move CHECKED_IN → IN_PROGRESS → COMPLETED on their own appointments.
 */
export function AppointmentActions({
  appointment,
  includeOpen = true,
}: {
  appointment: Pick<Appointment, "id" | "status" | "appointmentTime"> & {
    visit?: AppointmentVisitSummary | null;
  };
  includeOpen?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { has, hasScope } = usePermissions();
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  const canReceptionCheckIn = hasScope("appointment.checkIn", "GLOBAL");
  const canOpenClinicalVisit = has("visit.read");

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["appointments"] });
    void queryClient.invalidateQueries({ queryKey: ["visits"] });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.appointment(appointment.id),
    });
  };

  const checkInMutation = useMutation({
    mutationFn: () => appointmentsApi.checkInAppointment(appointment.id),
    onSuccess: (updated) => {
      toast.success("Patient is waiting");
      invalidate();
      const visitId = updated.visit?.id;
      if (visitId && canOpenClinicalVisit) {
        router.push(`/visits/${visitId}`);
      } else {
        router.push("/visits/queue");
      }
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not check in"),
  });

  const noShowMutation = useMutation({
    mutationFn: () => appointmentsApi.markAppointmentNoShow(appointment.id),
    onSuccess: () => {
      toast.success("Marked as no-show");
      invalidate();
    },
    onError: (error: unknown) =>
      toast.error(error instanceof ApiError ? error.message : "Could not mark no-show"),
  });

  const cancelMutation = useMutation({
    mutationFn: () => appointmentsApi.cancelAppointment(appointment.id),
    onSuccess: () => {
      toast.success("Appointment cancelled");
      setCancelOpen(false);
      invalidate();
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Could not cancel");
      setCancelOpen(false);
    },
  });

  const visit = appointment.visit;
  const isToday = toDateKey(appointment.appointmentTime) === todayKey();

  const actions: RowAction[] = [
    {
      key: "open",
      label: "Open appointment",
      icon: Eye,
      permission: "appointment.read",
      available: includeOpen,
      onSelect: () => router.push(`/appointments/${appointment.id}`),
    },
    {
      key: "open-visit",
      label: visit?.status === "WAITING" ? "Open waiting visit" : "Open visit",
      icon: Play,
      permission: "visit.read",
      available: canOpenClinicalVisit && Boolean(visit?.id),
      onSelect: () => visit?.id && router.push(`/visits/${visit.id}`),
    },
    {
      key: "checkin",
      label: "Check in",
      icon: LogIn,
      permission: "appointment.checkIn",
      available: canReceptionCheckIn && appointment.status === "SCHEDULED" && isToday && !visit,
      onSelect: () => checkInMutation.mutate(),
    },
    {
      key: "noshow",
      label: "Mark no-show",
      icon: XCircle,
      permission: "appointment.checkIn",
      available: canReceptionCheckIn && appointment.status === "SCHEDULED" && !visit,
      onSelect: () => noShowMutation.mutate(),
    },
    {
      key: "reschedule",
      label: "Reschedule",
      icon: CalendarClock,
      permission: "appointment.reschedule",
      available: appointment.status === "SCHEDULED",
      onSelect: () => setRescheduleOpen(true),
    },
    {
      key: "cancel",
      label: "Cancel appointment",
      icon: XCircle,
      permission: "appointment.cancel",
      available: appointment.status === "SCHEDULED",
      destructive: true,
      separatorBefore: true,
      onSelect: () => setCancelOpen(true),
    },
  ];

  return (
    <>
      <RowActionMenu actions={actions} />

      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Cancel this appointment?"
        description="The slot is released and the patient will need a new booking."
        confirmLabel="Cancel appointment"
        destructive
        pending={cancelMutation.isPending}
        onConfirm={() => cancelMutation.mutate()}
      />

      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        appointment={appointment}
        onDone={invalidate}
      />
    </>
  );
}

function RescheduleDialog({
  open,
  onOpenChange,
  appointment,
  onDone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Pick<Appointment, "id" | "appointmentTime">;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RescheduleValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      date: toDateKey(appointment.appointmentTime),
      time: toTimeInputValue(appointment.appointmentTime),
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      await appointmentsApi.rescheduleAppointment(appointment.id, {
        appointmentTime: toUtcDateTime(values.date, values.time),
      });
      toast.success("Appointment rescheduled");
      onOpenChange(false);
      onDone();
    } catch (error) {
      applyApiErrorToForm(error, setError, {
        statusFieldMap: { 409: "time", 400: "date" },
      });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reschedule appointment</DialogTitle>
          <DialogDescription>
            The status resets to scheduled once the new slot is accepted.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
          <Field
            label="Date"
            htmlFor="reschedule-date"
            error={errors.date?.message}
            required
          >
            <Input
              id="reschedule-date"
              type="date"
              aria-invalid={Boolean(errors.date)}
              {...register("date")}
            />
          </Field>

          <Field
            label="Time"
            htmlFor="reschedule-time"
            error={errors.time?.message}
            hint="24h HH:mm"
            required
          >
            <Input
              id="reschedule-time"
              type="time"
              aria-invalid={Boolean(errors.time)}
              {...register("time")}
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Reschedule
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
