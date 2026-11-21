import {
  LayoutDashboard,
  Calendar,
  Users,
  Trophy,
  ShoppingBag,
  Coffee,
  Receipt,
  CreditCard,
  Briefcase,
  UserCheck,
  CalendarDays,
  FileSpreadsheet,
  FileText,
  BarChart3,
  Shield,
  Settings,
} from 'lucide-react';
import { ROLES } from './constants';

/**
 * Centralized Role-Based Navigation Configuration
 * 
 * Maps application sections and links to permitted user roles.
 */
export const NAVIGATION_SECTIONS = [
  {
    title: 'Portals',
    items: [
      {
        id: 'owner-portal',
        label: 'Owner Executive Dashboard',
        path: '/owner/dashboard',
        icon: BarChart3,
        roles: [ROLES.OWNER],
      },
      {
        id: 'reception-portal',
        label: 'Reception Desk',
        path: '/reception',
        icon: LayoutDashboard,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST],
      },
      {
        id: 'shop-portal',
        label: 'Shop Counter',
        path: '/shop/pos',
        icon: ShoppingBag,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF],
      },
      {
        id: 'cafeteria-portal',
        label: 'Kitchen Orders Queue',
        path: '/cafeteria/kitchen',
        icon: Coffee,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST],
      },
      {
        id: 'hr-portal',
        label: 'HR & Payroll Desk',
        path: '/hr/employees',
        icon: Users,
        roles: [ROLES.OWNER, ROLES.HR_STAFF],
      },
      {
        id: 'member-portal',
        label: 'Member Self-Service',
        path: '/member',
        icon: Trophy,
        roles: [ROLES.MEMBER],
      },
      {
        id: 'corporate-portal',
        label: 'Corporate Client Portal',
        path: '/corporate',
        icon: Briefcase,
        roles: [ROLES.BUSINESS_CLIENT],
      },
    ],
  },
  {
    title: 'Court Operations',
    items: [
      {
        id: 'bookings-availability',
        label: 'Court Availability Matrix',
        path: '/bookings/availability',
        icon: Calendar,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER],
      },
      {
        id: 'bookings-list',
        label: 'All Reservations',
        path: '/bookings',
        icon: CalendarDays,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST],
      },
      {
        id: 'social-play',
        label: 'Friday Social Play',
        path: '/social-play',
        icon: Users,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER],
      },
      {
        id: 'courts-catalog',
        label: 'Courts Directory',
        path: '/courts',
        icon: Shield,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST],
      },
    ],
  },
  {
    title: 'Membership & Subscriptions',
    items: [
      {
        id: 'members-list',
        label: 'Member Directory',
        path: '/members',
        icon: Users,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST],
      },
      {
        id: 'membership-plans',
        label: 'Membership Plans',
        path: '/members/plans',
        icon: Trophy,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.MEMBER],
      },
    ],
  },
  {
    title: 'Commerce & Cafeteria',
    items: [
      {
        id: 'shop-pos',
        label: 'POS Register',
        path: '/shop/pos',
        icon: ShoppingBag,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF],
      },
      {
        id: 'shop-inventory',
        label: 'Inventory Control',
        path: '/shop/inventory',
        icon: FileSpreadsheet,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF],
      },
      {
        id: 'shop-products',
        label: 'Product Catalog',
        path: '/shop/products',
        icon: ShoppingBag,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.MEMBER],
      },
      {
        id: 'shop-orders',
        label: 'Order Receipts',
        path: '/shop/orders',
        icon: Receipt,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF],
      },
      {
        id: 'cafeteria-kitchen',
        label: 'Kitchen Display',
        path: '/cafeteria/kitchen',
        icon: Coffee,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST],
      },
      {
        id: 'cafeteria-menu',
        label: 'Cafeteria Menu',
        path: '/cafeteria/menu',
        icon: Coffee,
        roles: [ROLES.OWNER, ROLES.SHOP_STAFF, ROLES.RECEPTIONIST, ROLES.MEMBER],
      },
    ],
  },
  {
    title: 'Finance & Invoicing',
    items: [
      {
        id: 'finance-invoices',
        label: 'Invoices Ledger',
        path: '/finance/invoices',
        icon: Receipt,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.BUSINESS_CLIENT],
      },
      {
        id: 'finance-payments',
        label: 'Payments & Allocations',
        path: '/finance/payments',
        icon: CreditCard,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST],
      },
      {
        id: 'finance-receipts',
        label: 'Official Receipts',
        path: '/finance/receipts',
        icon: Receipt,
        roles: [ROLES.OWNER, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF],
      },
      {
        id: 'corporate-clients',
        label: 'Corporate Accounts',
        path: '/finance/clients',
        icon: Briefcase,
        roles: [ROLES.OWNER],
      },
    ],
  },
  {
    title: 'Human Resources',
    items: [
      {
        id: 'hr-employees',
        label: 'Staff Directory',
        path: '/hr/employees',
        icon: Users,
        roles: [ROLES.OWNER, ROLES.HR_STAFF],
      },
      {
        id: 'hr-departments',
        label: 'Departments & Designations',
        path: '/hr/departments',
        icon: Briefcase,
        roles: [ROLES.OWNER, ROLES.HR_STAFF],
      },
      {
        id: 'hr-attendance',
        label: 'Attendance & Punch Clock',
        path: '/hr/attendance',
        icon: UserCheck,
        roles: [ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF],
      },
      {
        id: 'hr-leaves',
        label: 'Leave Applications & Review',
        path: '/hr/leaves',
        icon: CalendarDays,
        roles: [ROLES.OWNER, ROLES.HR_STAFF, ROLES.RECEPTIONIST, ROLES.SHOP_STAFF],
      },
      {
        id: 'hr-salary-structures',
        label: 'Salary Structures',
        path: '/hr/salary-structures',
        icon: FileSpreadsheet,
        roles: [ROLES.OWNER, ROLES.HR_STAFF],
      },
      {
        id: 'hr-payroll',
        label: 'Monthly Payroll Runs',
        path: '/hr/payroll',
        icon: FileSpreadsheet,
        roles: [ROLES.OWNER, ROLES.HR_STAFF],
      },
      {
        id: 'hr-payslips',
        label: 'My Payslips',
        path: '/hr/payslips',
        icon: FileText,
        roles: [ROLES.RECEPTIONIST, ROLES.SHOP_STAFF],
      },
    ],
  },
  {
    title: 'Executive Analytics',
    items: [
      {
        id: 'reports-finance',
        label: 'Financial Performance',
        path: '/owner/reports/finance',
        icon: BarChart3,
        roles: [ROLES.OWNER],
      },
      {
        id: 'reports-tax',
        label: 'GST Tax Summary',
        path: '/owner/reports/tax',
        icon: Receipt,
        roles: [ROLES.OWNER],
      },
    ],
  },
];

/**
 * Filter navigation items permitted for the specified user roles.
 */
export const getPermittedNavigation = (userRoles = []) => {
  return NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) =>
      item.roles.some((r) => userRoles.includes(r))
    ),
  })).filter((section) => section.items.length > 0);
};

/**
 * Determine the primary landing page path based on user roles.
 */
export const getDefaultPortalPath = (userRoles = []) => {
  if (userRoles.includes(ROLES.OWNER)) return '/owner/dashboard';
  if (userRoles.includes(ROLES.RECEPTIONIST)) return '/reception';
  if (userRoles.includes(ROLES.SHOP_STAFF)) return '/shop/pos';
  if (userRoles.includes(ROLES.HR_STAFF)) return '/hr/employees';
  if (userRoles.includes(ROLES.BUSINESS_CLIENT)) return '/corporate';
  if (userRoles.includes(ROLES.MEMBER)) return '/member';
  return '/login';
};
