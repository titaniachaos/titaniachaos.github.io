import type { Router } from 'vitepress'
export const SITE_ROOTS: readonly string[]
export function siteRoot(pathname: string): string
export function crossesSiteBoundary(href: string, currentHref: string, base: string): boolean
export function installSiteNavigation(router: Router, base: string, browserLocation: Pick<Location, 'href' | 'assign'>): void
