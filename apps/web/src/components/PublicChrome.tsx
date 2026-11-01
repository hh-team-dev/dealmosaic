import type { ReactNode } from 'react';
import { SiteFooter, SiteHeader } from '../components/Chrome';

/** Public page frame: header, main landmark, footer. */
export function Chrome({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="public-main">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
