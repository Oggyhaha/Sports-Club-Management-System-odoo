export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';

export const STORAGE_KEYS = {
  TOKEN: 'champions_access_token',
  USER: 'champions_user_profile',
};

export const ROLES = {
  OWNER: 'owner',
  RECEPTIONIST: 'receptionist',
  SHOP_STAFF: 'shop_staff',
  HR_STAFF: 'hr_staff',
  MEMBER: 'member',
  BUSINESS_CLIENT: 'business_client',
};

export const ROLE_LABELS = {
  [ROLES.OWNER]: 'Club Owner',
  [ROLES.RECEPTIONIST]: 'Front Desk Receptionist',
  [ROLES.SHOP_STAFF]: 'Shop / Cafeteria Staff',
  [ROLES.HR_STAFF]: 'HR & Payroll Staff',
  [ROLES.MEMBER]: 'Club Member',
  [ROLES.BUSINESS_CLIENT]: 'Corporate Client',
};

export const CLUB_CONFIG = {
  NAME: 'Champions Club',
  TIMEZONE: 'Asia/Kolkata',
  OPERATING_START_HOUR: 6,
  OPERATING_END_HOUR: 22,
  OPERATING_HOURS_PER_DAY: 16,
  CURRENCY: 'INR',
  CURRENCY_SYMBOL: '₹',
};
