import { Profile } from '@/types/database';

// Roles que podem usar separação
const PICKING_ALLOWED_ROLES = ['admin', 'manager', 'separador', 'supervisor', 'stock'];

// Roles que podem apenas visualizar
const PICKING_VIEW_ONLY_ROLES = ['seller'];

/**
 * Verifica se o usuário pode usar o módulo de separação
 */
export function canUsePicking(profile: Profile | null): boolean {
    if (!profile) return false;
    
    const role = profile.role?.toLowerCase() || '';
    return PICKING_ALLOWED_ROLES.includes(role);
}

/**
 * Verifica se o usuário pode apenas visualizar separação
 */
export function canViewPicking(profile: Profile | null): boolean {
    if (!profile) return false;
    
    const role = profile.role?.toLowerCase() || '';
    return PICKING_ALLOWED_ROLES.includes(role) || PICKING_VIEW_ONLY_ROLES.includes(role);
}

/**
 * Verifica se o usuário é separador
 */
export function isSeparator(profile: Profile | null): boolean {
    if (!profile) return false;
    const role = profile.role?.toLowerCase() || '';
    return role === 'separador' || role === 'stock';
}

/**
 * Verifica se o usuário é supervisor
 */
export function isSupervisor(profile: Profile | null): boolean {
    if (!profile) return false;
    const role = profile.role?.toLowerCase() || '';
    return role === 'supervisor' || role === 'manager';
}

/**
 * Verifica se o usuário é gerente/admin
 */
export function isManager(profile: Profile | null): boolean {
    if (!profile) return false;
    const role = profile.role?.toLowerCase() || '';
    return role === 'admin' || role === 'manager';
}
