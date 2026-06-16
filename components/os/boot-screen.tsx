'use client';

import { usePrefersReducedMotion } from '@/lib/os/hooks';
import { motion } from 'motion/react';
import { useEffect } from 'react';
import { AppIcon } from './icons';

export function BootScreen({ onDone }: { onDone: () => void }) {
  const reduce = usePrefersReducedMotion();
  const duration = reduce ? 0.2 : 1.5;

  useEffect(() => {
    const id = setTimeout(onDone, reduce ? 300 : 1750);
    return () => clearTimeout(id);
  }, [onDone, reduce]);

  return (
    <motion.button
      type='button'
      onClick={onDone}
      aria-label='Skip boot'
      className='wp-aurora absolute inset-0 z-[100000] flex cursor-default flex-col items-center justify-center'
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        animate={reduce ? undefined : { rotate: 360 }}
        transition={reduce ? undefined : { repeat: Infinity, duration: 1.2, ease: 'linear' }}
      >
        <AppIcon iconId='face' accent='var(--brand-red)' size={76} rounded={22} />
      </motion.div>

      <div className='mt-7 h-1.5 w-52 overflow-hidden rounded-full bg-white/15'>
        <motion.div
          className='h-full rounded-full bg-white'
          initial={{ width: reduce ? '100%' : 0 }}
          animate={{ width: '100%' }}
          transition={{ duration, ease: 'easeInOut' }}
        />
      </div>
    </motion.button>
  );
}
