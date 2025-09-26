import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Handle admin routes
  if (pathname.startsWith('/admin')) {
    const response = NextResponse.next();
    
    // Add headers to ensure our login fixes are applied
    response.headers.set('X-TinaCMS-Fixes', 'enabled');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    
    // If this is the main admin page, inject our fixes
    if (pathname === '/admin' || pathname === '/admin/') {
      // Rewrite to our custom admin page that includes fixes
      return NextResponse.rewrite(new URL('/admin/index.html', request.url));
    }
    
    return response;
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};