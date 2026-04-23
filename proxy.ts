import { NextRequest, NextResponse } from 'next/server';

const MOBILE_UA = /Android|iPhone|iPad|iPod|Mobile/i;

export function proxy(req: NextRequest) {
  const ua = req.headers.get('user-agent') ?? '';
  if (!MOBILE_UA.test(ua)) {
    return NextResponse.redirect(new URL('/landing', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
