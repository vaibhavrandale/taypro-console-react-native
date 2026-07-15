import type {
  BreakdownReason,
  DprFormState,
  TechnicianDprPayload,
} from '../types/technicianDpr';

export function createEmptyDprForm(siteId: string): DprFormState {
  return {
    site_id: siteId,
    comments: '',
    robots_operational_details: {
      ready_for_operational: 0,
      online_operational: 0,
      manual_operational: 0,
      unoperational: 0,
    },
    preventive_maintenance_status: {
      automatic: { attempted: 0, completed: 0, robots: [] },
      semi_automatic: { attempted: 0, completed: 0, robots: [] },
    },
    ticket_details: {
      total_raised: 0,
      total_closed: 0,
      total_pending: 0,
    },
    technician_present: [],
  };
}

export function buildTechnicianDprPayload(
  form: DprFormState,
  breakdownReasons: BreakdownReason[],
): TechnicianDprPayload {
  const comments = form.comments.trim();
  if (!comments) {
    throw new Error('Comments are required to submit this DPR.');
  }

  const pm = form.preventive_maintenance_status;
  const now = new Date().toISOString();

  return {
    site_id: form.site_id,
    comments,
    report_date: now,
    new_report_date: now,
    robots_operational_details: {
      ...form.robots_operational_details,
      robots_uptime: form.robots_operational_details.online_operational || 0,
    },
    preventive_maintenance_status: {
      ...pm,
      total_pm_done:
        (pm.automatic.completed || 0) + (pm.semi_automatic.completed || 0),
    },
    ticket_details: {
      ...form.ticket_details,
      total_pending:
        (form.ticket_details.total_raised || 0) -
        (form.ticket_details.total_closed || 0),
    },
    breakdown_reasons: breakdownReasons.map((reason) => ({
      ...reason,
      count: reason.robots.length || reason.count || 0,
    })),
    technician_present: form.technician_present,
  };
}

export function formatOperationalLabel(key: string) {
  return key.replaceAll('_', ' ');
}

export function parseNumericInput(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
