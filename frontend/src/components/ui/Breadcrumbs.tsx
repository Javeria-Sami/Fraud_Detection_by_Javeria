import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbsProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const location = useLocation();

  // If explicit items not provided, automatically generate from route pathname
  const resolvedItems: BreadcrumbItem[] = items || (() => {
    const pathnames = location.pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbItem[] = [{ label: 'Overview', path: '/' }];

    let currentPath = '';
    pathnames.forEach((segment) => {
      currentPath += `/${segment}`;
      const formattedLabel = segment
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
      crumbs.push({ label: formattedLabel, path: currentPath });
    });
    return crumbs;
  })();

  if (resolvedItems.length <= 1 && location.pathname === '/') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center space-x-1.5 text-xs text-soc-muted select-none ${className}`}>
      <Link
        to="/"
        className="flex items-center hover:text-soc-foreground transition-colors p-1 rounded hover:bg-soc-cardHover"
        aria-label="Overview Home"
      >
        <Home className="w-3.5 h-3.5" />
      </Link>

      {resolvedItems.slice(1).map((item, index) => {
        const isLast = index === resolvedItems.length - 2;
        return (
          <React.Fragment key={item.path || item.label}>
            <ChevronRight className="w-3 h-3 text-soc-muted/60 shrink-0" />
            {isLast || !item.path ? (
              <span className="font-semibold text-soc-foreground font-mono truncate max-w-[200px]" aria-current="page">
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="hover:text-soc-foreground transition-colors truncate max-w-[150px]"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
