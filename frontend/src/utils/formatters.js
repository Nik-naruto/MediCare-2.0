export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

export const formatTime = (timeString) => {
  if (!timeString) return '';
  const str = String(timeString).trim();

  // 1. Handle HH:MM or HH:MM:SS 24-hour string format (from DB)
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const parts = str.split(':');
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1].padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    let h12 = hours % 12;
    if (h12 === 0) h12 = 12;
    return `${String(h12).padStart(2, '0')}:${minutes} ${period}`;
  }

  // 2. Handle strings already formatted like 9:00 AM or 09:00 AM
  if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(str)) {
    const match = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    let h = parseInt(match[1], 10);
    return `${String(h).padStart(2, '0')}:${match[2]} ${match[3].toUpperCase()}`;
  }

  // 3. Handle ISO date string or Date object, forcing Asia/Kolkata (IST) timezone
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;

  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
};

export const formatTimeRange = (startTime, endTime) => {
  if (!startTime) return '';
  const formattedStart = formatTime(startTime);
  if (!endTime) return formattedStart;
  const formattedEnd = formatTime(endTime);
  return `${formattedStart} - ${formattedEnd}`;
};

export const getStatusBadgeTheme = (status) => {
  switch (status) {
    case 'Completed':
    case 'Paid':
    case 'Active':
      return 'emerald';
    case 'Scheduled':
    case 'In Consultation':
    case 'Checked In':
      return 'amber';
    case 'Cancelled':
    case 'Unpaid':
    case 'Inactive':
    case 'No Show':
      return 'rose';
    default:
      return 'slate';
  }
};
