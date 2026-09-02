"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Banknote, CalendarDays, ClipboardList, ListTodo, Receipt, Users, Wallet } from "lucide-react";
import { AppointmentActions } from "@/components/appointments/appointment-actions";
import { useAuth } from "@/components/providers/auth-provider";
import { InvoiceTable } from "@/components/billing/invoice-table";
import { PeriodSelect } from "@/components/billing/invoice-list-screen";
import { Can } from "@/components/auth/can";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  AppointmentStatusBadge,
  PlanItemStatusBadge,
} from "@/components/ui/status-badge";
import { EmptyState, ErrorState, Skeleton, TableSkeleton } from "@/components/ui/states";
import * as appointmentsApi from "@/lib/api/appointments";
import * as billingApi from "@/lib/api/billing";
import * as patientsApi from "@/lib/api/patients";
import * as plansApi from "@/lib/api/treatment-plans";
import * as visitsApi from "@/lib/api/visits";
import {
  fromKeyForBillingPeriod,
  formatDateOnly,
  formatDateTime,
  formatEnum,
  formatMoney,
  formatTime,
  todayKey,
} from "@/lib/format";
import type { BillingPeriod } from "@/lib/format";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { queryKeys } from "@/lib/query-keys";

export default function DashboardPage() {
  const { user } = useAuth();
  const { has, hasScope } = usePermissions();

  const canReadAppointments = has("appointment.readAll");
  const canReadMyAppointments =
    hasScope("appointment.read", "PERSONAL") && !canReadAppointments;
  const canReadPatients = has("patient.read");
  const canReadInvoices = has("invoice.read");
  const canSeeClinicBilling = has("invoice.create");
  // Owner has clinic billing but not admin-only audit.read.
  const isOwnerDashboard = canSeeClinicBilling && !has("audit.read");
  const canOpenVisit = has("visit.read");
  const canReadAllPlans = hasScope("treatmentPlan.read", "GLOBAL");
  const canReadOwnPlans = hasScope("treatmentPlan.read", "PERSONAL");
  const canReadPlans = canReadAllPlans || canReadOwnPlans;
  // Clinic board for admin/owner; "mine" board for PERSONAL-only doctors.
  const showClinicPlannedToday = canReadAllPlans;
  const showMyPlannedToday = canReadOwnPlans && !canReadAllPlans;

  const todayQuery = useQuery({
    queryKey: queryKeys.appointmentsToday,
    queryFn: appointmentsApi.listTodayAppointments,
    enabled: canReadAppointments && !isOwnerDashboard,
  });
  const myTodayQuery = useQuery({
    queryKey: queryKeys.myAppointmentsToday,
    queryFn: appointmentsApi.listMyTodayAppointments,
    enabled: canReadMyAppointments,
  });
  const appointmentsTodayHref = canReadAppointments
    ? "/appointments/today"
    : "/appointments/me/today";
  const showScheduledToday = canReadAppointments && !isOwnerDashboard;
  const showPendingInvoices = canReadInvoices && !isOwnerDashboard;
  const showMyAppointmentsToday = canReadMyAppointments;

  const myQueueQuery = useQuery({
    queryKey: queryKeys.myVisitQueueToday,
    queryFn: visitsApi.getMyTodayQueue,
    enabled: canReadMyAppointments && canOpenVisit,
  });
  const waitingNow = useMemo(() => {
    const rows = (myQueueQuery.data?.waiting ?? []).filter(
      (row) => row.status === "WAITING",
    );
    return rows.slice().sort((a, b) => {
      const ta = a.appointmentTime ? new Date(a.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
      const tb = b.appointmentTime ? new Date(b.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
      return ta - tb;
    });
  }, [myQueueQuery.data]);
  const showWaitingNow = canReadMyAppointments && canOpenVisit;

  const patientsParams = { page: 1, pageSize: 5 };
  const patientsQuery = useQuery({
    queryKey: queryKeys.patients(patientsParams),
    queryFn: () => patientsApi.listPatients(patientsParams),
    enabled: canReadPatients && !canReadInvoices,
  });

  const dueInvoicesQuery = useQuery({
    queryKey: queryKeys.invoices({ dueOnly: true, limit: 8 }),
    queryFn: () => billingApi.listInvoices({ dueOnly: true, limit: 8 }),
    enabled: showPendingInvoices,
  });

  const billingStatsQuery = useQuery({
    queryKey: queryKeys.billingStats,
    queryFn: billingApi.getBillingStats,
    enabled: canReadInvoices,
  });
  const [pastPeriod, setPastPeriod] = useState<BillingPeriod>("week");
  const pastBillsParams = {
    status: "PAID" as const,
    page: 1,
    limit: 8,
    from: fromKeyForBillingPeriod(pastPeriod),
  };
  const pastBillsQuery = useQuery({
    queryKey: queryKeys.invoices(pastBillsParams),
    queryFn: () => billingApi.listInvoices(pastBillsParams),
    enabled: isOwnerDashboard && canReadInvoices,
  });

  const plansParams = { status: "ACTIVE" as const, page: 1, limit: 1 };
  const myPlansQuery = useQuery({
    queryKey: queryKeys.myTreatmentPlans(plansParams),
    queryFn: () => plansApi.listMyTreatmentPlans(plansParams),
    enabled: canReadOwnPlans,
  });
  const allPlansQuery = useQuery({
    queryKey: queryKeys.treatmentPlans(plansParams),
    queryFn: () => plansApi.listTreatmentPlans(plansParams),
    enabled: !canReadOwnPlans && canReadAllPlans,
  });
  const plansQuery = canReadOwnPlans ? myPlansQuery : allPlansQuery;
  const plansHref = canReadOwnPlans ? "/treatment-plans/me" : "/treatment-plans";

  const clinicPlannedTodayQuery = useQuery({
    queryKey: queryKeys.treatmentPlansPlannedToday,
    queryFn: plansApi.listPlannedTodayItems,
    enabled: showClinicPlannedToday,
  });
  const myPlannedTodayQuery = useQuery({
    queryKey: queryKeys.myTreatmentPlansPlannedToday,
    queryFn: plansApi.listMyPlannedTodayItems,
    enabled: showMyPlannedToday,
  });
  const plannedTodayQuery = showClinicPlannedToday
    ? clinicPlannedTodayQuery
    : myPlannedTodayQuery;
  const showPlannedToday = showClinicPlannedToday || showMyPlannedToday;

  // Desk glance: still-scheduled only, ordered by slot time (floor owns checked-in+).
  const scheduledToday = useMemo(() => {
    const rows = todayQuery.data ?? [];
    return rows
      .filter((a) => a.status === "SCHEDULED")
      .slice()
      .sort((a, b) => {
        const ta = a.appointmentTime ? new Date(a.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.appointmentTime ? new Date(b.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
  }, [todayQuery.data]);

  const myAppointmentsToday = useMemo(() => {
    const rows = myTodayQuery.data ?? [];
    return rows
      .filter((a) => a.status === "SCHEDULED")
      .slice()
      .sort((a, b) => {
        const ta = a.appointmentTime ? new Date(a.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
        const tb = b.appointmentTime ? new Date(b.appointmentTime).getTime() : Number.POSITIVE_INFINITY;
        return ta - tb;
      });
  }, [myTodayQuery.data]);

  const stats = [
    {
      key: "appointments",
      label: "Scheduled today",
      value: scheduledToday.length,
      loading: todayQuery.isPending,
      icon: CalendarDays,
      href: appointmentsTodayHref,
      visible: showScheduledToday,
    },
    {
      key: "my-appointments",
      label: "My appointments today",
      value: myAppointmentsToday.length,
      loading: myTodayQuery.isPending,
      icon: CalendarDays,
      href: "/appointments/me/today",
      visible: showMyAppointmentsToday,
    },
    {
      key: "waiting",
      label: "Waiting now",
      value: waitingNow.length,
      loading: myQueueQuery.isPending,
      icon: CalendarDays,
      href: "/visits/me/queue",
      visible: showWaitingNow,
    },
    {
      key: "planned-today",
      label: showClinicPlannedToday ? "Planned today" : "My planned today",
      value: plannedTodayQuery.data?.length,
      loading: plannedTodayQuery.isPending,
      icon: ListTodo,
      href: "#planned-today",
      visible: showPlannedToday,
    },
    {
      key: "bills",
      label: "To collect",
      value: billingStatsQuery.data?.dueCount,
      loading: billingStatsQuery.isPending,
      icon: Receipt,
      href: "/billing",
      visible: canReadInvoices && !isOwnerDashboard,
    },
    {
      key: "collected",
      label: "Collected today",
      value: formatMoney(billingStatsQuery.data?.collectedToday),
      loading: billingStatsQuery.isPending,
      icon: Banknote,
      href: "/billing/past",
      visible: canReadInvoices && canSeeClinicBilling,
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: formatMoney(billingStatsQuery.data?.dueRemaining),
      loading: billingStatsQuery.isPending,
      icon: Wallet,
      href: "/billing",
      visible: canReadInvoices && canSeeClinicBilling && !isOwnerDashboard,
    },
    {
      key: "patients",
      label: "Active patients",
      value: patientsQuery.data?.meta.totalCount,
      loading: patientsQuery.isPending,
      icon: Users,
      href: "/patients",
      visible: canReadPatients && !canReadInvoices,
    },
    {
      key: "plans",
      label: canReadOwnPlans ? "My active plans" : "Active treatment plans",
      value: plansQuery.data?.meta.totalCount,
      loading: plansQuery.isPending,
      icon: ClipboardList,
      href: plansHref,
      visible: canReadPlans,
    },
  ].filter((stat) => stat.visible);

  const firstName = user?.fullName.split(" ")[0] ?? "there";
  const gridCols =
    stats.length >= 6
      ? "xl:grid-cols-6"
      : stats.length >= 5
        ? "xl:grid-cols-5"
        : stats.length > 2
          ? "xl:grid-cols-4"
          : "";

  return (
    <>
      <PageHeader
        eyebrow={`Clinic / ${formatDateOnly(todayKey())}`}
        title={`Good day, ${firstName}`}
        description="Only the sections your account can read are shown here."
      />

      {stats.length > 0 ? (
        <div className={`mb-6 grid gap-3 sm:grid-cols-2 ${gridCols}`}>
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link key={stat.key} href={stat.href} className="tech-card group p-4">
                <div className="flex items-start justify-between">
                  <span className="tech-label">{stat.label}</span>
                  <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                </div>
                {stat.loading ? (
                  <Skeleton className="mt-3 h-7 w-14" />
                ) : (
                  <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">
                    {stat.value ?? "—"}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        {showScheduledToday ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Scheduled today</CardTitle>
              <Link
                href={appointmentsTodayHref}
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
              >
                Open today
              </Link>
            </CardHeader>

            {todayQuery.isPending ? (
              <TableSkeleton rows={4} columns={3} />
            ) : todayQuery.isError ? (
              <ErrorState
                className="border-0"
                error={todayQuery.error}
                onRetry={() => todayQuery.refetch()}
              />
            ) : scheduledToday.length === 0 ? (
              <EmptyState
                className="border-0"
                title="No scheduled appointments left"
                description="Everyone for today is checked in, completed, or cancelled — use the floor for waiting patients."
              />
            ) : (
              <div className="divide-y divide-border">
                {scheduledToday.slice(0, 8).map((appointment) => (
                  <div key={appointment.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTime(appointment.appointmentTime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {appointment.patient.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.purpose}
                        {` · ${appointment.dentist.fullName}`}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} />
                    <AppointmentActions appointment={appointment} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {showMyAppointmentsToday ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>My appointments today</CardTitle>
              <Link
                href="/appointments/me/today"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
              >
                Open today
              </Link>
            </CardHeader>

            {myTodayQuery.isPending ? (
              <TableSkeleton rows={4} columns={3} />
            ) : myTodayQuery.isError ? (
              <ErrorState
                className="border-0"
                error={myTodayQuery.error}
                onRetry={() => myTodayQuery.refetch()}
              />
            ) : myAppointmentsToday.length === 0 ? (
              <EmptyState
                className="border-0"
                title="Nothing still scheduled"
                description="No remaining booked slots for you today."
              />
            ) : (
              <div className="divide-y divide-border">
                {myAppointmentsToday.slice(0, 8).map((appointment) => (
                  <div key={appointment.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTime(appointment.appointmentTime)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {appointment.patient.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {appointment.purpose}
                      </p>
                    </div>
                    <AppointmentStatusBadge status={appointment.status} />
                    <AppointmentActions appointment={appointment} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : null}

        {showWaitingNow ? (
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Currently waiting</CardTitle>
              <Link
                href="/visits/me/queue"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
              >
                My floor
              </Link>
            </CardHeader>

            {myQueueQuery.isPending ? (
              <TableSkeleton rows={4} columns={3} />
            ) : myQueueQuery.isError ? (
              <ErrorState
                className="border-0"
                error={myQueueQuery.error}
                onRetry={() => myQueueQuery.refetch()}
              />
            ) : waitingNow.length === 0 ? (
              <EmptyState
                className="border-0"
                title="Nobody waiting"
                description="Checked-in patients for you will show up here."
              />
            ) : (
              <div className="divide-y divide-border">
                {waitingNow.slice(0, 8).map((row) => {
                  const href = row.visitId ? `/visits/${row.visitId}` : "/visits/me/queue";
                  return (
                    <Link
                      key={`${row.status}-${row.visitId ?? row.appointmentId}`}
                      href={href}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                    >
                      <span className="w-12 font-mono text-xs tabular-nums text-muted-foreground">
                        {formatTime(row.appointmentTime)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.patient?.fullName ?? "Unknown"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.purpose}
                          {row.waitMinutes != null ? ` · ${row.waitMinutes} min wait` : ""}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </Card>
        ) : null}

        {showPendingInvoices ? (
          <Can permission="invoice.read">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Pending invoices</CardTitle>
              <Link
                href="/billing"
                className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
              >
                Pending bills
              </Link>
            </CardHeader>

            {dueInvoicesQuery.isPending ? (
              <TableSkeleton rows={4} columns={3} />
            ) : dueInvoicesQuery.isError ? (
              <ErrorState
                className="border-0"
                error={dueInvoicesQuery.error}
                onRetry={() => dueInvoicesQuery.refetch()}
              />
            ) : (dueInvoicesQuery.data?.data.length ?? 0) === 0 ? (
              <EmptyState
                className="border-0"
                title="Nothing to collect"
                description="Closed visits with unpaid services show up here."
              />
            ) : (
              <div className="divide-y divide-border">
                {dueInvoicesQuery.data!.data.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/billing/${invoice.id}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                  >
                    <span className="w-24 shrink-0 font-mono text-[10px] text-muted-foreground">
                      {invoice.invoiceNumber}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{invoice.patient.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatEnum(invoice.status)}
                        {invoice.visit?.dentist
                          ? ` · ${invoice.visit.dentist.fullName}`
                          : ""}
                      </p>
                    </div>
                    <span className="font-mono text-xs tabular-nums">
                      {formatMoney(invoice.total)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
          </Can>
        ) : null}

        {canSeeClinicBilling ? (
          <Can permission="invoice.read">
            <Card className={isOwnerDashboard ? "xl:col-span-2" : undefined}>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <CardTitle>{isOwnerDashboard ? "Past bills" : "Recent payments"}</CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  {isOwnerDashboard ? (
                    <PeriodSelect
                      value={pastPeriod}
                      onChange={setPastPeriod}
                      className="h-8 w-36"
                    />
                  ) : null}
                  <Link
                    href="/billing/past"
                    className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
                  >
                    Past bills
                  </Link>
                </div>
              </CardHeader>

              {isOwnerDashboard ? (
                pastBillsQuery.isPending ? (
                  <TableSkeleton rows={4} columns={4} />
                ) : pastBillsQuery.isError ? (
                  <ErrorState
                    className="border-0"
                    error={pastBillsQuery.error}
                    onRetry={() => pastBillsQuery.refetch()}
                  />
                ) : (pastBillsQuery.data?.data.length ?? 0) === 0 ? (
                  <EmptyState
                    className="border-0"
                    title="No paid bills yet"
                    description="Collected invoices move here once they are fully paid."
                  />
                ) : (
                  <InvoiceTable invoices={pastBillsQuery.data!.data} />
                )
              ) : billingStatsQuery.isPending ? (
                <TableSkeleton rows={4} columns={3} />
              ) : billingStatsQuery.isError ? (
                <ErrorState
                  className="border-0"
                  error={billingStatsQuery.error}
                  onRetry={() => billingStatsQuery.refetch()}
                />
              ) : (billingStatsQuery.data?.recentPayments.length ?? 0) === 0 ? (
                <EmptyState
                  className="border-0"
                  title="No payments yet"
                  description="Collected payments will show up here."
                />
              ) : (
                <div className="divide-y divide-border">
                  {billingStatsQuery.data!.recentPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/billing/${payment.invoiceId}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                    >
                      <span className="w-24 shrink-0 font-mono text-[10px] text-muted-foreground">
                        {payment.invoiceNumber}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {payment.patient.fullName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatEnum(payment.paymentMethod)}
                          {` · ${payment.receivedBy.fullName}`}
                        </p>
                      </div>
                      <span className="font-mono text-xs tabular-nums">
                        {formatMoney(payment.amount)}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </Can>
        ) : null}
      </div>

      {showPlannedToday ? (
        <Card id="planned-today" className="mt-4">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              {showClinicPlannedToday
                ? "Treatment items planned today"
                : "My treatment items planned today"}
            </CardTitle>
            <Link
              href={plansHref}
              className="font-mono text-[10px] uppercase tracking-[0.12em] text-primary hover:underline"
            >
              {showClinicPlannedToday ? "All plans" : "My plans"}
            </Link>
          </CardHeader>

          {plannedTodayQuery.isPending ? (
            <TableSkeleton rows={4} columns={3} />
          ) : plannedTodayQuery.isError ? (
            <ErrorState
              className="border-0"
              error={plannedTodayQuery.error}
              onRetry={() => plannedTodayQuery.refetch()}
            />
          ) : !plannedTodayQuery.data?.length ? (
            <EmptyState
              className="border-0"
              title="Nothing planned for today"
              description={
                showClinicPlannedToday
                  ? "No active plan items have today’s date."
                  : "None of your plan items are scheduled for today."
              }
            />
          ) : (
            <div className="divide-y divide-border">
              {plannedTodayQuery.data.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  href={`/treatment-plans/${item.treatmentPlan.id}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.treatmentPlan.patient.fullName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.title}
                      {" · "}
                      {item.treatmentPlan.title}
                      {showClinicPlannedToday && item.dentist
                        ? ` · ${item.dentist.fullName}`
                        : ""}
                    </p>
                  </div>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {item._count.plannedProcedures} proc
                  </span>
                  <PlanItemStatusBadge status={item.status} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {stats.length === 0 ? (
        <EmptyState
          title="Nothing to show yet"
          description="Your account does not yet have read access to any clinic data. Ask an administrator for the permissions you need."
        />
      ) : null}
    </>
  );
}
