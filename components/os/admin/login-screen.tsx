'use client';

import { profile } from '@/lib/eddie';
import { Github } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Chunky, Squircle } from '../ui';

export function LoginScreen() {
  const [denied, setDenied] = useState(false);
  useEffect(() => setDenied(new URLSearchParams(window.location.search).has('denied')), []);

  return (
    <div className='fixed inset-0 grid place-items-center bg-black/30 backdrop-blur-2xl' style={{ zIndex: 9800 }}>
      <div className='flex flex-col items-center gap-3 text-white'>
        <Squircle src={profile.avatar} alt={profile.name} size={96} />
        <div className='text-lg font-semibold drop-shadow'>{profile.name}</div>
        <Chunky variant='primary' href='/api/admin/login'>
          <Github size={16} /> Sign in with GitHub
        </Chunky>
        {denied ? <div className='text-sm font-medium text-red-200'>Access denied.</div> : null}
      </div>
    </div>
  );
}
