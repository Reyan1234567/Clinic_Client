/**
 * Central query keys. Mutations invalidate by key rather than splicing the
 * response into a cached list, because writes return bare rows while reads
 * return expanded ones — patching a list with a write response would drop the
 * nested patient and dentist.
 */
export const queryKeys = {
  me: ["me"] as const,

  patients: (params?: unknown) => ["patients", params ?? {}] as const,
  patient: (id: number) => ["patient", id] as const,

  appointments: (params?: unknown) => ["appointments", params ?? {}] as const,
  appointmentsToday: ["appointments", "today"] as const,
  myAppointmentsToday: ["appointments", "me", "today"] as const,
  appointmentCalendar: (from: string, to: string) =>
    ["appointments", "calendar", from, to] as const,
  myAppointmentCalendar: (from: string, to: string) =>
    ["appointments", "me", "calendar", from, to] as const,
  appointmentsByDentist: (dentistId: string) => ["appointments", "dentist", dentistId] as const,
  appointment: (id: string) => ["appointment", id] as const,

  myVisits: (params?: unknown) => ["visits", "me", params ?? {}] as const,
  patientVisits: (params?: unknown) => ["visits", "patients", params ?? {}] as const,
  visitsForPatient: (patientId: number, params?: unknown) =>
    ["visits", "for-patient", patientId, params ?? {}] as const,
  patientVisitHistory: (patientId: number, visitId: string) =>
    ["visits", "for-patient", patientId, visitId] as const,
  visit: (id: string) => ["visit", id] as const,
  visitQueueToday: ["visits", "queue", "today"] as const,
  myVisitQueueToday: ["visits", "queue", "today", "me"] as const,

  treatmentPlans: (params?: unknown) => ["treatment-plans", params ?? {}] as const,
  myTreatmentPlans: (params?: unknown) => ["treatment-plans", "me", params ?? {}] as const,
  treatmentPlansPlannedToday: ["treatment-plans", "planned-today"] as const,
  myTreatmentPlansPlannedToday: ["treatment-plans", "planned-today", "me"] as const,
  treatmentPlan: (id: string) => ["treatment-plan", id] as const,

  catalog: (params?: unknown) => ["catalog", params ?? {}] as const,
  catalogItem: (id: string) => ["catalog", id] as const,

  users: (params?: unknown) => ["users", params ?? {}] as const,
  dentists: ["users", "dentists"] as const,
  roles: ["roles"] as const,
  permissions: ["permissions"] as const,
  auditLogs: (params?: unknown) => ["audit-logs", params ?? {}] as const,

  invoices: (params?: unknown) => ["billing", "invoices", params ?? {}] as const,
  invoice: (id: string) => ["billing", "invoice", id] as const,
  billingStats: ["billing", "stats"] as const,
};
