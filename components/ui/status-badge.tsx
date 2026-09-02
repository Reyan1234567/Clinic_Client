import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { formatEnum } from "@/lib/format";
import type {
  AppointmentStatus,
  InvoiceStatus,
  PlanItemStatus,
  PlannedProcedureStatus,
  TreatmentPlanStatus,
  UserStatus,
  VisitProcedureStatus,
  VisitStatus,
} from "@/lib/types";

const appointmentVariants: Record<AppointmentStatus, BadgeVariant> = {
  SCHEDULED: "default",
  CHECKED_IN: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "muted",
  NO_SHOW: "muted",
};

const procedureVariants: Record<VisitProcedureStatus, BadgeVariant> = {
  PENDING: "muted",
  SUCCEEDED: "success",
  FAILED: "danger",
};

const plannedVariants: Record<PlannedProcedureStatus, BadgeVariant> = {
  PLANNED: "default",
  TRANSFERRED: "success",
};

const invoiceVariants: Record<InvoiceStatus, BadgeVariant> = {
  UNPAID: "warning",
  PARTIALLY_PAID: "default",
  PAID: "success",
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  return <Badge variant={appointmentVariants[status]}>{formatEnum(status)}</Badge>;
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={status === "ACTIVE" ? "success" : "muted"}>{formatEnum(status)}</Badge>
  );
}

export function PlanStatusBadge({ status }: { status: TreatmentPlanStatus }) {
  return <Badge variant={status === "ACTIVE" ? "default" : "success"}>{formatEnum(status)}</Badge>;
}

export function PlanItemStatusBadge({ status }: { status: PlanItemStatus }) {
  return <Badge variant={status === "DONE" ? "success" : "default"}>{formatEnum(status)}</Badge>;
}

export function ProcedureStatusBadge({ status }: { status: VisitProcedureStatus }) {
  return <Badge variant={procedureVariants[status]}>{formatEnum(status)}</Badge>;
}

export function PlannedProcedureStatusBadge({ status }: { status: PlannedProcedureStatus }) {
  return <Badge variant={plannedVariants[status]}>{formatEnum(status)}</Badge>;
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  return <Badge variant={invoiceVariants[status]}>{formatEnum(status)}</Badge>;
}

export function VisitStateBadge({
  finishedAt,
  status,
}: {
  finishedAt: string | null;
  status?: VisitStatus;
}) {
  if (status === "WAITING") return <Badge variant="warning">Waiting</Badge>;
  if (status === "OPEN") return <Badge variant="default">In chair</Badge>;
  if (status === "VOID") return <Badge variant="muted">Voided</Badge>;
  if (status === "CLOSED" || finishedAt) return <Badge variant="success">Finished</Badge>;
  return <Badge variant="warning">Open</Badge>;
}
