/**
 * LYNTOS Dashboard Layout Module
 * Sprint 7.3 - Stripe Dashboard Shell
 */

// Components
export { DashboardShell } from './DashboardShell';
export { Sidebar } from './Sidebar';
export { TopBar, MobileTopBar } from './TopBar';
export { SidebarItem } from './SidebarItem';
export { ClientSelector } from './ClientSelector';
export { PeriodSelector } from './PeriodSelector';
export { UserGreeting } from './UserGreeting';

// Legacy components (for backwards compatibility)
export { DashboardSection, scrollToSection } from './DashboardLayout';
export { FooterMeta } from './FooterMeta';

// Hooks
export { useSidebarState } from './useSidebarState';
export { useLayoutContext, LayoutProvider } from './useLayoutContext';

// Config
export { NAVIGATION } from './navigation';
export type { NavItem, NavSection } from './navigation';

// Types
export type { User, Client, Period, LayoutContextType } from './types';
export { RISK_COLORS } from './types';
