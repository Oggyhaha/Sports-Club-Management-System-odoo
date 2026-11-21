/**
 * Champions Club - Common Data Formatters
 */

/**
 * Format currency amount in INR with Indian comma groupings.
 * e.g. 1500 -> "₹1,500.00"
 */
export const formatCurrency = (amount, decimals = 2) => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};

/**
 * Format date string to readable format.
 * e.g. "2026-11-22" -> "Nov 22, 2026"
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format date-time string.
 * e.g. "2026-11-22T08:30:00Z" -> "Nov 22, 2026, 08:30 AM"
 */
export const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '—';
  try {
    const d = new Date(dateTimeStr);
    if (isNaN(d.getTime())) return dateTimeStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (e) {
    return dateTimeStr;
  }
};

/**
 * Capitalize first letter of snake_case or plain string.
 * e.g. "shop_staff" -> "Shop Staff"
 */
export const formatRoleLabel = (roleStr) => {
  if (!roleStr) return '';
  return roleStr
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
