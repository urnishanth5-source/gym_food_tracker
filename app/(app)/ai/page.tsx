'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Loader2, Send, RotateCcw, ArrowLeftRight, Bookmark, Flame, Beef, Wheat, Droplet, Plus } from 'lucide-react';
import type { AIResponse, AIMeal, FoodLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const QUICK_ACTIONS = [
  { label: 'Suggest Meals', action: 'suggest', icon: Sparkles },
  { label: 'Daily Plan', action: 'plan', icon: Flame },
  { label: 'Substitute', action: 'substitute', icon: ArrowLeftRight },
  { label: 'Grocery List', action: 'grocery', icon: Bookmark },
];

export default function AIPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string; data?: AIResponse }[]>([]);
  const [input, setInput] = useState('');
  const [todaysLogs, setTodaysLogs] = useState<FoodLog[]>([]);

  const fetchLogs = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('food_logs').select('*').eq('log_date', today);
    setTodaysLogs((data as FoodLog[]) || []);
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getRemaining = () => {
    const totals = todaysLogs.reduce(
      (acc, l) => ({
        calories: acc.calories + l.calories,
        protein: acc.protein + l.protein,
        carbs: acc.carbs + l.carbs,
        fat: acc.fat + l.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    return {
      remainingCalories: Math.max(0, (profile?.calorie_target || 2000) - totals.calories),
      remainingProtein: Math.max(0, (profile?.protein_target || 150) - totals.protein),
      remainingCarbs: Math.max(0, (profile?.carbs_target || 250) - totals.carbs),
      remainingFat: Math.max(0, (profile?.fat_target || 60) - totals.fat),
    };
  };

  const callAI = async (action: string, message?: string, currentMeal?: string) => {
    setLoading(true);
    try {
      const remaining = getRemaining();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          message,
          currentMeal,
          ...remaining,
          goal: profile?.goal,
          diet: profile?.diet_type,
          weightKg: profile?.weight_kg,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `Request failed (${res.status})`);
      }

      const data: AIResponse = await res.json();
      return data;
    } catch (err: any) {
      toast({ title: err.message || 'AI request failed', variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    const data = await callAI(action);
    if (data) {
      setMessages([
        ...messages,
        { role: 'user', content: QUICK_ACTIONS.find((q) => q.action === action)?.label || action },
        { role: 'ai', content: data.notes || 'Here are my suggestions:', data },
      ]);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const msg = input;
    setInput('');
    setMessages([...messages, { role: 'user', content: msg }]);
    const data = await callAI('chat', msg);
    if (data) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: data.notes || data.meals?.[0]?.description || 'Here you go:', data },
      ]);
    }
  };

  const handleRegenerate = async () => {
    if (messages.length < 2) return;
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;
    const action = QUICK_ACTIONS.find((q) => q.label === lastUserMsg.content)?.action || 'chat';
    const data = await callAI(action, lastUserMsg.content);
    if (data) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: 'ai', content: data.notes || 'Here are my suggestions:', data },
      ]);
    }
  };

  const handleSwap = async (meal: AIMeal) => {
    const data = await callAI('substitute', undefined, meal.title);
    if (data) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: `Swap: ${meal.title}` },
        { role: 'ai', content: data.notes || 'Here are some alternatives:', data },
      ]);
    }
  };

  const handleSaveMeal = async (meal: AIMeal) => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('food_logs').insert(
      meal.items.map((item) => ({
        food_name: item.name,
        food_id: null,
        quantity: parseFloat(item.quantity) || 100,
        unit: 'g',
        meal_type: 'lunch' as const,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        log_date: today,
      }))
    );
    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${meal.title} logged to your food diary!` });
    fetchLogs();
  };

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <AppHeader title="AI Assistant" subtitle="Get personalized meal suggestions powered by Grok AI" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {QUICK_ACTIONS.map((qa) => {
            const Icon = qa.icon;
            return (
              <Button
                key={qa.action}
                variant="outline"
                onClick={() => handleQuickAction(qa.action)}
                disabled={loading}
                className="rounded-xl h-auto py-3 flex-col gap-1.5"
              >
                <Icon className="w-5 h-5 text-primary" />
                <span className="text-xs">{qa.label}</span>
              </Button>
            );
          })}
        </div>

        <Card className="border-border/50 glass mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Remaining', value: getRemaining().remainingCalories, unit: 'kcal', icon: Flame, color: 'text-primary' },
                { label: 'Protein', value: getRemaining().remainingProtein, unit: 'g', icon: Beef, color: 'text-chart-1' },
                { label: 'Carbs', value: getRemaining().remainingCarbs, unit: 'g', icon: Wheat, color: 'text-chart-4' },
                { label: 'Fat', value: getRemaining().remainingFat, unit: 'g', icon: Droplet, color: 'text-chart-3' },
              ].map((m) => {
                const Icon = m.icon;
                return (
                  <div key={m.label} className="p-2 rounded-lg bg-muted/30">
                    <Icon className={`w-4 h-4 mx-auto mb-1 ${m.color}`} />
                    <p className="text-sm font-bold">{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.unit} {m.label}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <ScrollArea className="h-[40vh] md:h-[45vh] mb-4 rounded-xl">
          <div className="space-y-3 pr-4">
            {messages.length === 0 && (
              <Card className="border-border/50 glass">
                <CardContent className="p-8 text-center">
                  <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Ask me for meal suggestions, daily plans, food substitutions, or a grocery list.
                    I'll use your remaining macros to give personalized Indian meal recommendations.
                  </p>
                </CardContent>
              </Card>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === 'user' ? 'bg-primary/10 border border-primary/20' : 'bg-card border border-border'}`}>
                  <p className="text-sm font-medium mb-1">{msg.role === 'user' ? 'You' : 'FlexFuel AI'}</p>
                  <p className="text-sm text-muted-foreground mb-2">{msg.content}</p>

                  {msg.data?.meals && msg.data.meals.length > 0 && (
                    <div className="space-y-2 mt-2">
                      {msg.data.meals.map((meal, mi) => (
                        <div key={mi} className="p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-bold text-primary">{meal.title}</p>
                            <span className="text-xs font-bold">{meal.totalCalories} kcal</span>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{meal.description}</p>
                          <div className="space-y-1 mb-2">
                            {meal.items.map((item, ii) => (
                              <div key={ii} className="flex justify-between text-xs">
                                <span>{item.name} <span className="text-muted-foreground">({item.quantity})</span></span>
                                <span className="text-muted-foreground">{item.calories} kcal · P{item.protein} C{item.carbs} F{item.fat}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border/50">
                            <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => handleSaveMeal(meal)}>
                              <Plus className="w-3 h-3" /> Log
                            </Button>
                            <Button size="sm" variant="ghost" className="text-xs rounded-lg" onClick={() => handleSwap(meal)}>
                              <ArrowLeftRight className="w-3 h-3" /> Swap
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.data?.groceryList && msg.data.groceryList.length > 0 && (
                    <div className="mt-2 p-3 rounded-lg bg-muted/30">
                      <p className="text-xs font-medium mb-2">Weekly Grocery List</p>
                      <ul className="space-y-1">
                        {msg.data.groceryList.map((item, gi) => (
                          <li key={gi} className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length > 0 && !loading && (
          <Button variant="ghost" size="sm" onClick={handleRegenerate} className="mb-3 text-xs">
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Regenerate
          </Button>
        )}

        <div className="flex gap-2">
          <Input
            placeholder="Ask about meals, nutrition, or substitutions..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()} className="rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
