/**
 * Response shapes as the API actually serialises them.
 *
 * Two rules drive every declaration in this file:
 *  - `DateTime` columns arrive as ISO 8601 strings, never `Date`.
 *  - `Decimal` columns (price, estimatedPrice, unitPrice) arrive as strings
 *    such as "150.00". They are typed as `string` on purpose so arithmetic on
 *    a raw value is a compile error. Use `parseMoney` from `lib/format`.
 */

export type Gender = "MALE" | "FEMALE";

export type UserStatus = "ACTIVE" | "INACTIVE";

export type AppointmentStatus =
  | "SCHEDULED"
  | "CHECKED_IN"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type VisitStatus = "WAITING" | "OPEN" | "CLOSED" | "VOID";

export type VisitProcedureStatus = "PENDING" | "SUCCEEDED" | "FAILED";

export type PlannedProcedureStatus = "PLANNED" | "TRANSFERRED";

export type TreatmentPlanStatus = "ACTIVE" | "COMPLETED";

export type PlanItemStatus = "PLANNED" | "DONE";

export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID";

export type PaymentMethod = "CASH" | "TELEBIRR" | "CBE_BIRR" | "CARD" | "BANK_TRANSFER";

export type FilePurpose =
  | "XRAY"
  | "LAB_RESULT"
  | "PRESCRIPTION"
  | "CONSENT_FORM"
  | "IDENTIFICATION"
  | "REFERRAL"
  | "RECEIPT"
  | "SIGNATURE"
  | "OTHER";

export type CertificateType =
  | "BIOPSY_REQUEST"
  | "MEDICAL_CERTIFICATE"
  | "REFERRAL_FORM";

export type FileBucket = "Visit" | "Procedure" | "Patient";

export type PermissionScope = "PERSONAL" | "GLOBAL";

/* -------------------------------------------------------------------------- */
/* Envelope                                                                   */
/* -------------------------------------------------------------------------- */

export interface InvoiceListSummary {
  invoiceCount: number;
  total: string;
  average: string;
}

export interface Pagination {
  totalCount: number;
  page: number;
  limit: number;
  totalPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  summary?: InvoiceListSummary;
}

export interface ApiSuccess<T> {
  success: true;
  data?: T;
  message?: string;
  meta?: Pagination;
}

export interface ApiErrorBody {
  success: false;
  error: string;
  details?: unknown;
}

/** Shape of `details` on a 422, keyed by form field name. */
export type FieldErrors = Record<string, string[]>;

export interface Page<T> {
  data: T[];
  meta: Pagination;
}

/* -------------------------------------------------------------------------- */
/* Users and auth                                                             */
/* -------------------------------------------------------------------------- */

/** Minimal user projection returned by list endpoints. */
export interface UserSummary {
  id: string;
  fullName: string;
  username: string;
}

export interface UserListItem extends UserSummary {
  status: UserStatus;
  roles: { id: string; name: string }[];
}

/** Full user row minus the password, returned by GET /users/dentists. */
export interface User extends UserSummary {
  phone: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithStatus extends UserSummary {
  status: UserStatus;
}

/* -------------------------------------------------------------------------- */
/* Audit                                                                      */
/* -------------------------------------------------------------------------- */

/** GET /audit-logs row. `action` is usually a permission key. */
export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  user: UserSummary;
}

/**
 * `roles` exists but is never the authority for a UI decision — branch on
 * `permissions` only.
 */
export interface AuthUser extends UserSummary {
  roles: string[];
  permissions: string[];
  /** Key + scope pairs; used when UI must distinguish GLOBAL vs PERSONAL. */
  permissionGrants?: { key: string; scope: PermissionScope }[];
  phone?: string;
  signatureFileId?: string | null;
  signatureFile?: { id: string; filePath: string } | null;
}

/* -------------------------------------------------------------------------- */
/* Patients                                                                   */
/* -------------------------------------------------------------------------- */

/** Note: `id` is a number here. Every other entity uses a UUID string. */
export interface Patient {
  id: number;
  patientNumber: string;
  fullName: string;
  phone: string;
  gender: Gender;
  /** Date-only column: ISO timestamp at UTC midnight. Never shift it. */
  dateOfBirth: string;
  address: string;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Appointments                                                               */
/* -------------------------------------------------------------------------- */

export interface Appointment {
  id: string;
  patientId: number;
  dentistId: string;
  /**
   * Full slot DateTime (ISO). Date is the UTC calendar key (`slice(0, 10)`);
   * time is UTC clock parts — use `formatDateOnly` / `formatTime`.
   */
  appointmentTime: string;
  purpose: string;
  status: AppointmentStatus;
  checkedInAt: string | null;
  completedAt: string | null;
  noShowAt: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string | null;
}

export interface AppointmentVisitSummary {
  id: string;
  status: VisitStatus;
  startedAt: string | null;
  finishedAt: string | null;
  title: string | null;
}

/** Reads return the expanded appointment; writes return the bare one. */
export interface AppointmentExpanded extends Appointment {
  patient: Patient;
  dentist: { id: string; fullName: string };
  visit?: AppointmentVisitSummary | null;
}

export interface AppointmentWithPatient extends Appointment {
  patient: Patient;
}

/** GET /appointments/calender returns an object keyed by "YYYY-MM-DD". */
export type AppointmentCalendar = Record<string, AppointmentExpanded[]>;

/* -------------------------------------------------------------------------- */
/* Catalog                                                                    */
/* -------------------------------------------------------------------------- */

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  categoryId: string;
  category: CatalogCategory;
  /** Decimal as string. */
  price: string;
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

export interface Prescription {
  id: string;
  visitId: string;
  medicine: string;
  dosage: string;
  createdAt: string;
}

export interface VisitProcedure {
  id: string;
  visitId: string;
  plannedProcedureId: string | null;
  treatmentCatalogId: string | null;
  title: string;
  description: string | null;
  status: VisitProcedureStatus;
  /** Decimal as string. */
  estimatedPrice: string | null;
  notes: string | null;
  finishedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface VisitProcedureExpanded extends VisitProcedure {
  plannedProcedure: { id: string; title: string } | null;
  treatmentCatalog: { id: string; name: string; price: string } | null;
  files: ProcedureFile[];
}

export interface FileRecord {
  id: string;
  fileName: string;
  bucket: FileBucket;
  provider: "SUPABASE";
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  filePath: string;
}

export interface AttachedFile {
  id: string;
  fileId: string;
  description: string | null;
  purpose: FilePurpose;
  createdAt: string;
  file: FileRecord;
  uploadedBy: UserSummary;
}

export interface ProcedureFile {
  id: string;
  fileId: string;
  visitProcedureId: string;
  description: string | null;
  purpose: FilePurpose;
  createdAt: string;
  file: FileRecord;
}

/** The bare visit row returned by write endpoints. */
export interface PatientVisit {
  id: string;
  patientId: number;
  dentistId: string;
  treatmentPlanItemId: string | null;
  appointmentId?: string | null;
  title: string | null;
  status?: VisitStatus;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  startedAt?: string | null;
  finishedAt: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VisitCreated {
  id: string;
  patientId: number;
  dentistId: string;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  notes: string | null;
  title: string | null;
  createdAt: string;
}

export interface VisitListItem {
  id: string;
  chiefComplaint: string | null;
  diagnosis: string | null;
  createdAt: string;
  patient: { id: number; fullName: string; phone: string };
  visitProcedures: { id: string; title: string; status: VisitProcedureStatus }[];
  _count: { files: number };
}

export interface VisitListItemFull extends VisitListItem {
  notes: string | null;
  title?: string | null;
  status?: VisitStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  patient: { id: number; fullName: string; phone: string; patientNumber: string };
  dentist: UserSummary;
  prescriptions: { id: string; medicine: string; dosage: string; createdAt: string }[];
}

/** One payload drives the whole clinical screen. */
export interface VisitDetail {
  id: string;
  patientId: number;
  dentistId: string;
  treatmentPlanItemId: string | null;
  appointmentId: string | null;
  title: string | null;
  status: VisitStatus;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  patient: {
    id: number;
    patientNumber: string;
    fullName: string;
    phone: string;
    gender: Gender;
    /** Date-only column: ISO timestamp at UTC midnight. Never shift it. */
    dateOfBirth: string;
    address: string;
  };
  dentist: { id: string; fullName: string; username: string; phone: string };
  appointment: {
    id: string;
    appointmentTime: string;
    status: AppointmentStatus;
    purpose: string;
    checkedInAt: string | null;
  } | null;
  prescriptions: Prescription[];
  visitProcedures: VisitProcedureExpanded[];
  files: AttachedFile[];
  treatmentPlanItems:
    | (PlanItem & { plannedProcedures: PlannedProcedure[] })
    | null;
}

export interface BiopsyRequestData {
  requestingDoctorName: string;
  requestingDoctorPhone: string;
  history: string;
  clinicalAppearance: string;
  lesionLocation: string;
  biopsyType: "INCISIONAL" | "EXCISIONAL";
  biopsyDate: string;
  clinicalImpression: string;
}

export interface MedicalCertificateData {
  diagnosis: string;
  treatedFrom: string;
  treatedTo: string;
  restRequiredDays: string;
  remark: string;
}

export interface ReferralFormData {
  historyExamInvestigation: string;
  diagnosticImpression: string;
  treatmentGiven: string;
  reasonForReferral: string;
  feedback: string;
}

export type CertificateData =
  | BiopsyRequestData
  | MedicalCertificateData
  | ReferralFormData;

export interface MedicalCertificate {
  id: string;
  visitId: string;
  patientId: number;
  doctorId: string;
  type: CertificateType;
  data: CertificateData;
  createdAt: string;
  updatedAt: string | null;
  doctor: { id: string; fullName: string; phone: string };
  signatureFile: { id: string; filePath: string };
}

export type QueueSource = "APPOINTMENT" | "WALK_IN" | "PLAN_ITEM";

export interface QueueRow {
  visitId: string | null;
  appointmentId: string | null;
  source: QueueSource;
  status: "SCHEDULED" | VisitStatus;
  purpose: string;
  appointmentTime: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  waitMinutes: number | null;
  patient: { id: number; fullName: string; patientNumber: string; phone: string } | null;
  dentist: { id: string; fullName: string } | null;
}

export interface TodayQueue {
  scheduled: QueueRow[];
  waiting: QueueRow[];
  serving: QueueRow[];
  done: QueueRow[];
}

/* -------------------------------------------------------------------------- */
/* Treatment plans                                                            */
/* -------------------------------------------------------------------------- */

export interface PlannedProcedure {
  id: string;
  treatmentPlanItemId: string;
  treatmentCatalogId: string | null;
  title: string;
  description: string | null;
  status: PlannedProcedureStatus;
  /** Decimal as string. */
  estimatedPrice: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  treatmentPlanId: string;
  title: string;
  dentistId: string | null;
  status: PlanItemStatus;
  notes: string | null;
  plannedDate: string | null;
  userId: string | null;
  createdAt: string;
}

export interface PlanItemVisitLink {
  id: string;
  status: VisitStatus;
  createdAt: string;
}

/** Plan item row for dashboard "planned today" boards. */
export interface PlannedTodayPlanItem extends PlanItem {
  dentist: { id: string; fullName: string } | null;
  treatmentPlan: {
    id: string;
    title: string;
    status: TreatmentPlanStatus;
    patient: { id: number; fullName: string; patientNumber: string };
  };
  _count: { plannedProcedures: number };
}

export interface TreatmentPlan {
  id: string;
  patientId: number;
  title: string;
  description: string | null;
  status: TreatmentPlanStatus;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TreatmentPlanWithPatient extends TreatmentPlan {
  patient: Patient;
}

export interface PlanItemExpanded extends PlanItem {
  plannedProcedures: PlannedProcedure[];
  patientVisits?: PlanItemVisitLink[];
}

export interface TreatmentPlanDetail extends TreatmentPlan {
  patient: Patient;
  items: PlanItemExpanded[];
}

/* -------------------------------------------------------------------------- */
/* Roles and permissions (admin)                                              */
/* -------------------------------------------------------------------------- */

export interface PermissionRecord {
  id: string;
  key: string;
  scope: PermissionScope;
  createdAt: string;
  updatedAt: string;
}

export interface RolePermission {
  permissionId: string;
  scope: PermissionScope;
  permission: { key: string };
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  rolePermissions: RolePermission[];
}

/** POST /roles echoes the role back without `permission.key`. */
export interface RoleCreated extends Omit<Role, "rolePermissions"> {
  rolePermissions: { permissionId: string; scope: PermissionScope }[];
}

/* -------------------------------------------------------------------------- */
/* Billing                                                                    */
/* -------------------------------------------------------------------------- */

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  treatmentCatalogId: string | null;
  treatmentPlanItemId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  treatmentCatalog?: { id: string; name: string; price: string } | null;
}

export interface Payment {
  id: string;
  invoiceId: string;
  amount: string;
  paymentMethod: PaymentMethod;
  referenceNumber: string | null;
  receivedById: string;
  paymentDate: string;
  receivedBy?: { id: string; fullName: string };
}

export interface Invoice {
  id: string;
  patientId: number;
  visitId: string | null;
  invoiceNumber: string;
  subtotal: string;
  discount: string;
  total: string;
  status: InvoiceStatus;
  generatedById: string;
  generatedAt: string;
  patient: {
    id: number;
    patientNumber: string;
    fullName: string;
    phone: string;
  };
  visit?: {
    id: string;
    title: string | null;
    status: VisitStatus;
    finishedAt: string | null;
    dentist: { id: string; fullName: string };
  } | null;
  items: InvoiceItem[];
  payments: Payment[];
  generatedBy: { id: string; fullName: string };
}

export interface BillingRecentPayment {
  id: string;
  amount: string;
  paymentMethod: PaymentMethod;
  paymentDate: string;
  invoiceId: string;
  invoiceNumber: string;
  patient: { fullName: string };
  receivedBy: { id: string; fullName: string };
}

export interface BillingStats {
  dueCount: number;
  dueRemaining: string;
  collectedToday: string;
  collectedTodayCount: number;
  myCollectedToday: string;
  myCollectedTodayCount: number;
  recentPayments: BillingRecentPayment[];
}

export interface VisitInvoiceSummary {
  id: string;
  invoiceNumber: string;
  total: string;
  status: InvoiceStatus;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }

  /** 422 — map onto form fields instead of showing a toast. */
  get isValidation() {
    return this.status === 422;
  }

  /** 403 — authenticated but not permitted. Never redirect to login. */
  get isForbidden() {
    return this.status === 403;
  }

  get isConflict() {
    return this.status === 409;
  }

  /** Field errors from a 422, or null when the payload is not field-shaped. */
  get fieldErrors(): FieldErrors | null {
    if (this.status !== 422 || !this.details || typeof this.details !== "object") {
      return null;
    }
    const entries = Object.entries(this.details as Record<string, unknown>).filter(
      ([, value]) => Array.isArray(value) && value.every((v) => typeof v === "string"),
    );
    return entries.length ? (Object.fromEntries(entries) as FieldErrors) : null;
  }
}
