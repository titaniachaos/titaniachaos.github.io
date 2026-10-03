// Independently deployed sites share this host but not a VitePress router.
// Add future project roots here, longest paths first.
export const SITE_ROOTS = ['/clown/', '/aequator/', '/']

export function siteRoot(pathname) {
  return SITE_ROOTS.find(root => root === '/' ||
    pathname === root.slice(0, -1) || pathname.startsWith(root))
}

export function crossesSiteBoundary(href, currentHref, base) {
  const current = new URL(currentHref)
  const destination = new URL(href, current)
  return destination.origin === current.origin &&
    siteRoot(destination.pathname) !== siteRoot(base)
}

export function installSiteNavigation(router, base, browserLocation) {
  const previous = router.onBeforeRouteChange
  router.onBeforeRouteChange = async (href) => {
    if (crossesSiteBoundary(href, browserLocation.href, base)) {
      browserLocation.assign(new URL(href, browserLocation.href).href)
      return false
    }
    return previous?.(href)
  }
}
