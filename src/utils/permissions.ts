import { UserRole } from '../../types';

export type ClearanceLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3' | 'LEVEL_4';

export const CLEARANCE_LEVELS: Record<ClearanceLevel, UserRole[]> = {
  LEVEL_4: ['System Administrator', 'General Office'],
  LEVEL_3: ['System Administrator', 'Head Pastor', 'General Admin', 'Church Admin', 'Finance / Treasury', 'General Office'],
  LEVEL_2: ['System Administrator', 'Head Pastor', 'General Admin', 'Evangelism Ministry', 'Music Ministry', 'Follow-up & Visitation', 'Ministry Head', 'General Office'],
  LEVEL_1: ['System Administrator', 'Head Pastor', 'General Admin', 'Security & Facilities', 'Assistant', 'General Office'],
};

/**
 * Checks if a user role has the required clearance level.
 * System Administrator always has access.
 */
export const canAccess = (role: UserRole | undefined, level: ClearanceLevel): boolean => {
  if (!role) return false;
  if (role === 'System Administrator') return true;
  return CLEARANCE_LEVELS[level].includes(role);
};

/**
 * Specific module access checks for cleaner code in views
 */
export const permissions = {
  canSeeRegistry: (role: UserRole | undefined) => canAccess(role, 'LEVEL_2'),
  canManageFinance: (role: UserRole | undefined) => canAccess(role, 'LEVEL_3'),
  canManageEvents: (role: UserRole | undefined) => true, // Everyone can see events, but maybe not edit?
  canEditEvents: (role: UserRole | undefined) => canAccess(role, 'LEVEL_2'),
  canManageUsers: (role: UserRole | undefined) => canAccess(role, 'LEVEL_3'),
  isLeadership: (role: UserRole | undefined) => canAccess(role, 'LEVEL_3'),
  isFollowUpTeam: (role: UserRole | undefined) => 
    ['System Administrator', 'Head Pastor', 'Follow-up & Visitation', 'Evangelism Ministry'].includes(role || ''),
};
