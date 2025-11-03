'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type BackgroundImageProps = {
  src: string;
};

export function BackgroundImage({ src }: BackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setIsLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <div
      className={cn(
        'progressive-image pointer-events-none fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat bg-fixed',
        isLoaded && 'loaded'
      )}
      style={{ backgroundImage: `url(${src})` }}
      aria-hidden
    />
  );
}

