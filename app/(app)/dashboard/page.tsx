'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Droplets, Plus, Minus, Flame, Beef, Wheat, Droplet, Trash2, Coffee, Sun, Moon, Cookie } from 'lucide-react';
import type { FoodLog, MealType } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const MEAL_META: Record<MealType, { label: string; icon: any }> = {
  breakfast: { label: 'Breakfast', icon: Coffee },
  lunch: { label: 'Lunch', icon: Sun },
  dinner: { label: 'Dinner', icon: Moon },
  snack: { label: 'Snacks', icon: Cookie },
};

function MacroRing({ value, max, label, unit, color }: { value: number; max: number; label: string; unit: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  return (
    <div className="relative w-[120px] h-[120px] flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="120" height="120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(222 15% 18%)" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="text-center">
        <p className="text-lg font-bold">{Math.round(value)}</p>
        <p className="text-[10px] text-muted-foreground">{unit}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [waterMl, setWaterMl] = useState(0);
  const [loading, setLoading] = useState(true);
  const [date] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    if (!profile) return;
    const [{ data: logData }, { data: waterData }] = await Promise.all([
      supabase.from('food_logs').select('*').eq('log_date', date).order('created_at'),
      supabase.from('water_logs').select('*').eq('log_date', date),
    ]);
    setLogs((logData as FoodLog[]) || []);
    setWaterMl((waterData || []).reduce((sum: number, w: any) => sum + w.amount_ml, 0));
    setLoading(false);
  }, [profile, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totals = logs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      protein: acc.protein + l.protein,
      carbs: acc.carbs + l.carbs,
      fat: acc.fat + l.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const remaining = {
    calories: Math.max(0, (profile?.calorie_target || 0) - totals.calories),
    protein: Math.max(0, (profile?.protein_target || 0) - totals.protein),
  };

  const addWater = async (ml: number) => {
    const newTotal = waterMl + ml;
    if (waterMl === 0) {
      await supabase.from('water_logs').insert({ amount_ml: newTotal, log_date: date });
    } else {
      const { data: existing } = await supabase.from('water_logs').select('id').eq('log_date', date).maybeSingle();
      if (existing) {
        await supabase.from('water_logs').update({ amount_ml: newTotal }).eq('id', existing.id);
      }
    }
    setWaterMl(newTotal);
  };

  const deleteLog = async (id: string) => {
    await supabase.from('food_logs').delete().eq('id', id);
    setLogs(logs.filter((l) => l.id !== id));
    toast({ title: 'Food removed' });
  };

  const waterPct = profile?.water_target_ml ? Math.min((waterMl / profile.water_target_ml) * 100, 100) : 0;
  const caloriePct = profile?.calorie_target ? Math.min((totals.calories / profile.calorie_target) * 100, 100) : 0;
  const proteinPct = profile?.protein_target ? Math.min((totals.protein / profile.protein_target) * 100, 100) : 0;
  const carbsPct = profile?.carbs_target ? Math.min((totals.carbs / profile.carbs_target) * 100, 100) : 0;
  const fatPct = profile?.fat_target ? Math.min((totals.fat / profile.fat_target) * 100, 100) : 0;

  const mealGroups = (['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((mt) => ({
    type: mt,
    items: logs.filter((l) => l.meal_type === mt),
  }));

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-24 md:pb-8">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <AppHeader
          title={`Welcome back`}
          subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        />

        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-xl bg-card animate-pulse" />
            <div className="h-32 rounded-xl bg-card animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            <Card className="border-border/50 glass overflow-hidden">
              <CardContent className="p-4 md:p-6">
                <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
                  <div className="flex flex-col items-center">
                    <MacroRing
                      value={totals.calories}
                      max={profile?.calorie_target || 2000}
                      label="Calories"
                      unit="kcal"
                      color="hsl(142 71% 45%)"
                    />
                    <div className="mt-2 text-center">
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-bold text-primary">{remaining.calories} kcal</p>
                    </div>
                  </div>

                  <div className="space-y-3 w-full">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium"><Beef className="w-3.5 h-3.5 text-chart-1" /> Protein</span>
                        <span className="text-muted-foreground">{Math.round(totals.protein)} / {profile?.protein_target}g</span>
                      </div>
                      <Progress value={proteinPct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium"><Wheat className="w-3.5 h-3.5 text-chart-4" /> Carbs</span>
                        <span className="text-muted-foreground">{Math.round(totals.carbs)} / {profile?.carbs_target}g</span>
                      </div>
                      <Progress value={carbsPct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium"><Droplet className="w-3.5 h-3.5 text-chart-3" /> Fat</span>
                        <span className="text-muted-foreground">{Math.round(totals.fat)} / {profile?.fat_target}g</span>
                      </div>
                      <Progress value={fatPct} className="h-2" />
                    </div>
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="flex items-center gap-1.5 font-medium"><Flame className="w-3.5 h-3.5 text-accent" /> Goal Progress</span>
                        <span className="text-muted-foreground">{Math.round(caloriePct)}%</span>
                      </div>
                      <Progress value={caloriePct} className="h-2" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border/50 glass">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-lg bg-chart-2/10 flex items-center justify-center">
                        <Droplets className="w-5 h-5 text-chart-2" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">Water</p>
                        <p className="text-xs text-muted-foreground">{waterMl} / {profile?.water_target_ml} ml</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-chart-2">{Math.round(waterPct)}%</span>
                  </div>
                  <Progress value={waterPct} className="h-2 mb-3" />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => addWater(-250)} disabled={waterMl < 250} className="rounded-lg">
                      <Minus className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addWater(250)} className="rounded-lg flex-1">
                      <Plus className="w-3.5 h-3.5" /> 250ml
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addWater(500)} className="rounded-lg flex-1">
                      <Plus className="w-3.5 h-3.5" /> 500ml
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 glass">
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">Protein Remaining</p>
                    <span className="text-lg font-bold text-chart-1">{remaining.protein}g</span>
                  </div>
                  <Progress value={proteinPct} className="h-2 mb-3" />
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Eaten</p>
                      <p className="text-sm font-bold">{Math.round(totals.calories)}</p>
                      <p className="text-[10px] text-muted-foreground">kcal</p>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/50">
                      <p className="text-[10px] text-muted-foreground">Burned</p>
                      <p className="text-sm font-bold">0</p>
                      <p className="text-[10px] text-muted-foreground">kcal</p>
                    </div>
                    <div className="p-2 rounded-lg bg-primary/10">
                      <p className="text-[10px] text-primary">Net</p>
                      <p className="text-sm font-bold text-primary">{remaining.calories}</p>
                      <p className="text-[10px] text-primary">kcal</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3">
              {mealGroups.map((mg) => {
                const meta = MEAL_META[mg.type];
                const Icon = meta.icon;
                const mealCals = mg.items.reduce((s, i) => s + i.calories, 0);
                const mealProtein = mg.items.reduce((s, i) => s + i.protein, 0);
                return (
                  <Card key={mg.type} className="border-border/50 glass">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{meta.label}</p>
                            <p className="text-xs text-muted-foreground">{Math.round(mealCals)} kcal · {Math.round(mealProtein)}g protein</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="rounded-lg text-xs" onClick={() => window.location.href = `/food?meal=${mg.type}`}>
                          <Plus className="w-3.5 h-3.5" /> Add
                        </Button>
                      </div>
                      {mg.items.length > 0 ? (
                        <div className="space-y-2">
                          {mg.items.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 group animate-fade-in-up">
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{item.food_name}</p>
                                <p className="text-xs text-muted-foreground">{item.quantity}{item.unit} · {Math.round(item.calories)} kcal · P{item.protein} C{item.carbs} F{item.fat}</p>
                              </div>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0"
                                onClick={() => deleteLog(item.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground py-2 text-center">No items logged</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
}
