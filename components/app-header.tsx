'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';

export function AppHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();

  return (
    <div className="flex items-center justify-between mb-4 md:mb-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card border border-border">
          <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {profile?.goal === 'lean_bulk' ? 'Lean Bulk' : profile?.goal === 'cut' ? 'Cut' : 'Maintain'}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            await signOut();
            router.push('/');
          }}
          className="rounded-lg"
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
