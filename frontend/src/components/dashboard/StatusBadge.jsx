import React from 'react';
import { Badge } from '../common/Badge';

export const StatusBadge = ({ status }) => {
  if (!status) return <Badge variant="slate">Unknown</Badge>;

  const s = String(status).toUpperCase();

  if (s === 'SCHEDULED' || s === 'CONFIRMED') {
    return <Badge variant="amber">Scheduled</Badge>;
  }
  if (s === 'CHECKED_IN' || s === 'CHECKED IN') {
    return <Badge variant="sky">Checked In</Badge>;
  }
  if (s === 'IN_CONSULTATION' || s === 'IN CONSULTATION') {
    return <Badge variant="purple">In Consultation</Badge>;
  }
  if (s === 'COMPLETED' || s === 'PAID' || s === 'ACTIVE') {
    return <Badge variant="emerald">Completed</Badge>;
  }
  if (s === 'CANCELLED' || s === 'UNPAID' || s === 'NO_SHOW' || s === 'NO SHOW') {
    return <Badge variant="rose">Cancelled</Badge>;
  }

  return <Badge variant="sky">{status}</Badge>;
};
