'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Star, Loader2, X, UtensilsCrossed } from 'lucide-react';
import { FOOD_DATABASE } from '@/lib/food-database';
import { searchFoods, calculateMacros } from '@/lib/food-utils';
import type { FoodItem, MealType, FoodLog } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function FoodPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [mealType, setMealType] = useState<MealType>(
    (searchParams.get('meal') as MealType) || guessMealType()
  );
  const [loading, setLoading] = useState(false);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'search' | 'favorites' | 'custom'>('search');
  const [showAddCustom, setShowAddCustom] = useState(false);

  const [cfName, setCfName] = useState('');
  const [cfCals, setCfCals] = useState('');
  const [cfProtein, setCfProtein] = useState('');
  const [cfCarbs, setCfCarbs] = useState('');
  const [cfFat, setCfFat] = useState('');
  const [cfUnit, setCfUnit] = useState('g');

  useEffect(() => {
    fetchCustomFoods();
    fetchFavorites();
  }, []);

  const fetchCustomFoods = async () => {
    const { data } = await supabase.from('custom_foods').select('*');
    if (data) {
      setCustomFoods(
        data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: 'Custom',
          unit: d.default_unit,
          defaultQty: d.default_quantity,
          per100: {
            calories: d.calories_per_100,
            protein: d.protein_per_100,
            carbs: d.carbs_per_100,
            fat: d.fat_per_100,
          },
          isCustom: true,
        }))
      );
    }
  };

  const fetchFavorites = async () => {
    const { data } = await supabase.from('favorites').select('food_id');
    if (data) setFavorites(new Set(data.map((d: any) => d.food_id)));
  };

  const toggleFavorite = async (food: FoodItem) => {
    if (favorites.has(food.id)) {
      await supabase.from('favorites').delete().eq('food_id', food.id);
      setFavorites(new Set([...favorites].filter((id) => id !== food.id)));
    } else {
      await supabase.from('favorites').insert({ food_id: food.id, food_name: food.name });
      setFavorites(new Set([...favorites, food.id]));
    }
  };

  const results = useMemo(() => {
    if (activeTab === 'favorites') {
      return [...FOOD_DATABASE, ...customFoods].filter((f) => favorites.has(f.id));
    }
    if (activeTab === 'custom') return customFoods;
    return searchFoods(query, customFoods);
  }, [query, activeTab, customFoods, favorites]);

  const macros = selectedFood
    ? calculateMacros(selectedFood, parseFloat(quantity) || 0)
    : null;

  const handleAddFood = async () => {
    if (!selectedFood || !quantity) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('food_logs')
        .insert({
          food_name: selectedFood.name,
          food_id: selectedFood.id,
          quantity: parseFloat(quantity),
          unit: selectedFood.unit,
          meal_type: mealType,
          calories: macros!.calories,
          protein: macros!.protein,
          carbs: macros!.carbs,
          fat: macros!.fat,
          log_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      toast({ title: `Added ${selectedFood.name} to ${mealType}` });
      setSelectedFood(null);
      setQuantity(selectedFood.defaultQty.toString());
    } catch (err: any) {
      toast({ title: err.message || 'Failed to add food', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustom = async () => {
    if (!cfName || !cfCals) {
      toast({ title: 'Name and calories are required', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase
      .from('custom_foods')
      .insert({
        name: cfName,
        calories_per_100: parseFloat(cfCals),
        protein_per_100: parseFloat(cfProtein) || 0,
        carbs_per_100: parseFloat(cfCarbs) || 0,
        fat_per_100: parseFloat(cfFat) || 0,
        default_unit: cfUnit,
        default_quantity: 100,
      })
      .select()
      .single();

    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Custom food created!' });
    setShowAddCustom(false);
    setCfName(''); setCfCals(''); setCfProtein(''); setCfCarbs(''); setCfFat('');
    fetchCustomFoods();
  };

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <AppHeader title="Food Database" subtitle="Search and log Indian foods" />

        <div className="flex gap-2 mb-4">
          {(['search', 'favorites', 'custom'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'bg-card border border-border text-muted-foreground'
              }`}
            >
              {tab}
            </button>
          ))}
          {activeTab === 'custom' && (
            <Button size="sm" variant="outline" className="ml-auto rounded-lg" onClick={() => setShowAddCustom(true)}>
              <Plus className="w-3.5 h-3.5" /> Add
            </Button>
          )}
        </div>

        {activeTab === 'search' && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search rice, dosa, chicken, paneer..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        <div className="space-y-2">
          {results.length === 0 ? (
            <Card className="border-border/50 glass">
              <CardContent className="p-8 text-center">
                <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {activeTab === 'favorites' ? 'No favorites yet. Tap the star on any food.' : 'No foods found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            results.map((food) => (
              <Card key={food.id} className="border-border/50 glass hover:border-primary/30 transition-all">
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button onClick={() => toggleFavorite(food)} className="shrink-0">
                      <Star className={`w-4 h-4 ${favorites.has(food.id) ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.per100.calories} kcal · P{food.per100.protein} C{food.per100.carbs} F{food.per100.fat} per 100{food.unit === 'pieces' ? 'g' : food.unit}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg shrink-0"
                    onClick={() => {
                      setSelectedFood(food);
                      setQuantity(food.defaultQty.toString());
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedFood} onOpenChange={(o) => !o && setSelectedFood(null)}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>{selectedFood?.name}</DialogTitle>
          </DialogHeader>
          {selectedFood && macros && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Quantity</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                    <span className="flex items-center text-sm text-muted-foreground px-2">{selectedFood.unit}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Meal</Label>
                  <Select value={mealType} onValueChange={(v) => setMealType(v as MealType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Breakfast</SelectItem>
                      <SelectItem value="lunch">Lunch</SelectItem>
                      <SelectItem value="dinner">Dinner</SelectItem>
                      <SelectItem value="snack">Snack</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: 'Calories', value: macros.calories, unit: 'kcal', color: 'text-primary' },
                  { label: 'Protein', value: macros.protein, unit: 'g', color: 'text-chart-1' },
                  { label: 'Carbs', value: macros.carbs, unit: 'g', color: 'text-chart-4' },
                  { label: 'Fat', value: macros.fat, unit: 'g', color: 'text-chart-3' },
                ].map((m) => (
                  <div key={m.label} className="p-3 rounded-lg bg-muted/30 text-center">
                    <p className="text-[10px] text-muted-foreground">{m.label}</p>
                    <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-[10px] text-muted-foreground">{m.unit}</p>
                  </div>
                ))}
              </div>

              <Button onClick={handleAddFood} className="w-full" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-2" /> Add to {mealType}</>}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCustom} onOpenChange={setShowAddCustom}>
        <DialogContent className="glass">
          <DialogHeader>
            <DialogTitle>Create Custom Food</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Food Name</Label>
              <Input value={cfName} onChange={(e) => setCfName(e.target.value)} placeholder="My protein smoothie" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Calories / 100g</Label>
                <Input type="number" value={cfCals} onChange={(e) => setCfCals(e.target.value)} placeholder="150" />
              </div>
              <div>
                <Label className="text-xs">Unit</Label>
                <Select value={cfUnit} onValueChange={setCfUnit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">grams</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                    <SelectItem value="pieces">pieces</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Protein (g)</Label>
                <Input type="number" value={cfProtein} onChange={(e) => setCfProtein(e.target.value)} placeholder="10" />
              </div>
              <div>
                <Label className="text-xs">Carbs (g)</Label>
                <Input type="number" value={cfCarbs} onChange={(e) => setCfCarbs(e.target.value)} placeholder="20" />
              </div>
              <div>
                <Label className="text-xs">Fat (g)</Label>
                <Input type="number" value={cfFat} onChange={(e) => setCfFat(e.target.value)} placeholder="5" />
              </div>
            </div>
            <Button onClick={handleAddCustom} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Create Food
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

function guessMealType(): MealType {
  const h = new Date().getHours();
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 18) return 'snack';
  return 'dinner';
}
