import { Link, LinkProps } from 'wouter';
import { useLocation } from 'wouter';

/**
 * A Link component wrapper that automatically saves scroll position before navigation
 * and restores it when navigating back
 * 
 * Usage: Replace `<Link>` with `<ScrollRestoreLink>` in pages with card grids/lists
 */
export function ScrollRestoreLink(props: LinkProps) {
  const [location] = useLocation();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Save current scroll position before navigating
    const currentPath = location;
    sessionStorage.setItem(`scroll-${currentPath}`, window.scrollY.toString());

    // Call original onClick if provided
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return <Link {...props} onClick={handleClick} />;
}
