'use client';
import * as React from 'react';

// This is a simplified placeholder to resolve build errors.

const Breadcrumb = React.forwardRef<
  HTMLElement,
  React.ComponentPropsWithoutRef<'nav'>
>(({ ...props }, ref) => <nav ref={ref} aria-label="breadcrumb" {...props} />);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  React.ComponentPropsWithoutRef<'ol'>
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={`flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5 ${className}`}
    {...props}
  />
));
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    className={`inline-flex items-center gap-1.5 ${className}`}
    {...props}
  />
));
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, ...props }, ref) => (
  <a ref={ref} className={`transition-colors hover:text-foreground ${className}`} {...props} />
));
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.ComponentPropsWithoutRef<'span'>>(({ className, ...props }, ref) => <span ref={ref} role="link" aria-disabled="true" aria-current="page" className={`font-normal text-foreground ${className}`} {...props} />);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  React.ComponentPropsWithoutRef<'li'>
>(({ children, className, ...props }, ref) => (
  <li
    ref={ref}
    role="presentation"
    aria-hidden="true"
    className={`flex h-full items-center justify-center ${className}`}
    {...props}
  >{children ?? <span className="mx-2 text-gray-400">/</span>}</li>
));
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
};