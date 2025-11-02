'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'motion/react';

export function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/';
  const previousPathRef = React.useRef(pathname);
  const [direction, setDirection] = React.useState<'blog' | 'default'>('default');

  React.useEffect(() => {
    const prev = previousPathRef.current;
    const goingToBlog = pathname.startsWith('/blog') || pathname.startsWith('/posts') || pathname === '/about';
    const cameFromNonBlog = !(prev.startsWith('/blog') || prev.startsWith('/posts') || prev === '/about');
    setDirection(goingToBlog && cameFromNonBlog ? 'blog' : 'default');
    previousPathRef.current = pathname;
  }, [pathname]);

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: direction === 'blog' ? 60 : 0 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction === 'blog' ? -60 : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.5 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

