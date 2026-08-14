import { buildQuery, json, requestData, requestPage } from "@/lib/api/client";
import type {
  Appointment,
  AppointmentCalendar,
  AppointmentExpanded,
  AppointmentStatus,
} from "@/lib/types";

export interface AppointmentListParams {
  date?: string;
  dentistId?: string;
  status?: AppointmentStatus;
  page?: number;
  /** This endpoint takes `pageSize` but returns `limit` in meta. */
  pageSize?: number;
}

export interface AppointmentInput {
  patientId: number;
  dentistId: string;
  appointmentTime: string;
  purpose: string;
}

/** GET /appointments — requires `appointment.readAll`. */
export function listAppointments(params: AppointmentListParams = {}) {
  return requestPage<AppointmentExpanded>(`/appointments${buildQuery({ ...params })}`);
}

/** GET /appointments/today — requires `appointment.readAll`. Not paginated. */
export function listTodayAppointments() {
  return requestData<AppointmentExpanded[]>("/appointments/today");
}

/** GET /appointments/me/today — requires PERSONAL `appointment.read`. */
export function listMyTodayAppointments() {
  return requestData<AppointmentExpanded[]>("/appointments/me/today");
}

/**
 * GET /appointments/calender — requires `appointment.readAll`.
 * Yes, "calender". Returns an object keyed by "YYYY-MM-DD", not an array.
 */
export function getAppointmentCalendar(params: { from: string; to: string }) {
  return requestData<AppointmentCalendar>(`/appointments/calender${buildQuery({ ...params })}`);
}

/** GET /appointments/me/calender — PERSONAL `appointment.read`. */
export function getMyAppointmentCalendar(params: { from: string; to: string }) {
  return requestData<AppointmentCalendar>(
    `/appointments/me/calender${buildQuery({ ...params })}`,
  );
}

/** GET /appointments/dentist/:id — requires `appointment.read`. */
export function listAppointmentsByDentist(dentistId: string) {
  return requestData<AppointmentExpanded[]>(`/appointments/dentist/${dentistId}`);
}

/** GET /appointments/:id — requires `appointment.read`. */
export function getAppointment(id: string) {
  return requestData<AppointmentExpanded>(`/appointments/${id}`);
}

/**
 * POST /appointments — requires `appointment.create`.
 * Returns the bare appointment, so invalidate the list rather than splicing.
 * 409 when the slot is taken (one room: date+time is globally unique).
 */
export function createAppointment(input: AppointmentInput) {
  return requestData<Appointment>("/appointments", { method: "POST", ...json(input) });
}

/** PATCH /appointments/:id — requires `appointment.update`. Returns the bare row. */
export function updateAppointment(id: string, input: Partial<AppointmentInput>) {
  return requestData<Appointment>(`/appointments/${id}`, { method: "PATCH", ...json(input) });
}

/** PATCH /appointments/:id/cancel — requires `appointment.cancel`. SCHEDULED only. */
export function cancelAppointment(id: string) {
  return requestData<Appointment>(`/appointments/${id}/cancel`, { method: "PATCH" });
}

/**
 * PATCH /appointments/:id/reschedule — requires `appointment.reschedule`.
 * SCHEDULED only. 409 on slot collision — show it on the time field.
 */
export function rescheduleAppointment(
  id: string,
  input: { appointmentTime: string },
) {
  return requestData<Appointment>(`/appointments/${id}/reschedule`, {
    method: "PATCH",
    ...json(input),
  });
}

/** PATCH /appointments/:id/checkin — creates a WAITING visit. */
export function checkInAppointment(id: string) {
  return requestData<AppointmentExpanded>(`/appointments/${id}/checkin`, { method: "PATCH" });
}

/** PATCH /appointments/:id/no-show — SCHEDULED only. */
export function markAppointmentNoShow(id: string) {
  return requestData<Appointment>(`/appointments/${id}/no-show`, { method: "PATCH" });
}

/** PATCH /appointments/:id/start — requires `appointment.update`. CHECKED_IN → IN_PROGRESS. */
export function startAppointment(id: string) {
  return requestData<Appointment>(`/appointments/${id}/start`, { method: "PATCH" });
}

/** PATCH /appointments/:id/complete — requires `appointment.update`. CHECKED_IN|IN_PROGRESS → COMPLETED. */
export function completeAppointment(id: string) {
  return requestData<Appointment>(`/appointments/${id}/complete`, { method: "PATCH" });
}
