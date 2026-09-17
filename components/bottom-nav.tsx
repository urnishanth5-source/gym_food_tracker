'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UtensilsCrossed, Sparkles, TrendingUp, Dumbbell } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/food', label: 'Food', icon: UtensilsCrossed },
  { href: '/ai', label: 'AI', icon: Sparkles },
  { href: '/progress', label: 'Progress', icon: TrendingUp },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-16 glass border-b border-border/50 items-center px-6 gap-1">
        <Link href="/dashboard" className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-gradient">FlexFuel</span>
        </Link>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-border/50">
        <div className="flex items-center justify-around py-2 px-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-all min-w-[60px]',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'scale-110')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
