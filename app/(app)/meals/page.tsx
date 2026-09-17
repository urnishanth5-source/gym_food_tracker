'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { BottomNav } from '@/components/bottom-nav';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, UtensilsCrossed, Loader2, Check, ChevronRight, Search } from 'lucide-react';
import { FOOD_DATABASE } from '@/lib/food-database';
import { searchFoods, calculateMacros } from '@/lib/food-utils';
import type { FoodItem, MealType, SavedMeal, SavedMealItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';

export default function MealsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [savedMeals, setSavedMeals] = useState<SavedMeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);

  const [mealName, setMealName] = useState('');
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [items, setItems] = useState<SavedMealItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [quantity, setQuantity] = useState('100');

  const fetchMeals = useCallback(async () => {
    const { data } = await supabase.from('saved_meals').select('*').order('created_at', { ascending: false });
    setSavedMeals((data as SavedMeal[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  useEffect(() => {
    setSearchResults(searchFoods(searchQuery).slice(0, 10));
  }, [searchQuery]);

  const totals = items.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const addItem = () => {
    if (!selectedFood || !quantity) return;
    const macros = calculateMacros(selectedFood, parseFloat(quantity));
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        meal_id: '',
        food_name: selectedFood.name,
        food_id: selectedFood.id,
        quantity: parseFloat(quantity),
        unit: selectedFood.unit,
        calories: macros.calories,
        protein: macros.protein,
        carbs: macros.carbs,
        fat: macros.fat,
      },
    ]);
    setSelectedFood(null);
    setQuantity('100');
    setSearchQuery('');
  };

  const removeItem = (id: string) => setItems(items.filter((i) => i.id !== id));

  const saveMeal = async () => {
    if (!mealName || items.length === 0) {
      toast({ title: 'Add a name and at least one food', variant: 'destructive' });
      return;
    }
    const { data: meal, error } = await supabase
      .from('saved_meals')
      .insert({
        name: mealName,
        meal_type: mealType,
        total_calories: totals.calories,
        total_protein: totals.protein,
        total_carbs: totals.carbs,
        total_fat: totals.fat,
      })
      .select()
      .single();

    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }

    const { error: itemError } = await supabase.from('saved_meal_items').insert(
      items.map((i) => ({
        meal_id: meal.id,
        food_name: i.food_name,
        food_id: i.food_id,
        quantity: i.quantity,
        unit: i.unit,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
      }))
    );

    if (itemError) {
      toast({ title: itemError.message, variant: 'destructive' });
      return;
    }

    toast({ title: 'Meal saved!' });
    setShowBuilder(false);
    setMealName('');
    setItems([]);
    fetchMeals();
  };

  const logMeal = async (meal: SavedMeal) => {
    const { data: mealItems } = await supabase
      .from('saved_meal_items')
      .select('*')
      .eq('meal_id', meal.id);

    if (!mealItems || mealItems.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('food_logs').insert(
      mealItems.map((i: any) => ({
        food_name: i.food_name,
        food_id: i.food_id,
        quantity: i.quantity,
        unit: i.unit,
        meal_type: meal.meal_type,
        calories: i.calories,
        protein: i.protein,
        carbs: i.carbs,
        fat: i.fat,
        log_date: today,
      }))
    );

    if (error) {
      toast({ title: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: `${meal.name} logged!` });
  };

  const deleteMeal = async (id: string) => {
    await supabase.from('saved_meal_items').delete().eq('meal_id', id);
    await supabase.from('saved_meals').delete().eq('id', id);
    setSavedMeals(savedMeals.filter((m) => m.id !== id));
    toast({ title: 'Meal deleted' });
  };

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-24 md:pb-8">
      <div className="max-w-3xl mx-auto px-4 md:px-6">
        <AppHeader title="My Meals" subtitle="Save and quickly log meal templates" />

        <Button onClick={() => setShowBuilder(true)} className="w-full mb-4 rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Create New Meal
        </Button>

        {loading ? (
          <div className="h-32 rounded-xl bg-card animate-pulse" />
        ) : savedMeals.length === 0 ? (
          <Card className="border-border/50 glass">
            <CardContent className="p-8 text-center">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No saved meals yet. Create one to quickly log it later.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {savedMeals.map((meal) => (
              <Card key={meal.id} className="border-border/50 glass hover:border-primary/30 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{meal.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{meal.meal_type} · {Math.round(meal.total_calories)} kcal · P{Math.round(meal.total_protein)} C{Math.round(meal.total_carbs)} F{Math.round(meal.total_fat)}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" className="rounded-lg" onClick={() => logMeal(meal)}>
                        <Check className="w-3.5 h-3.5" /> Log
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteMeal(meal.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showBuilder} onOpenChange={setShowBuilder}>
        <DialogContent className="glass max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Build a Meal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Meal Name</Label>
                <Input value={mealName} onChange={(e) => setMealName(e.target.value)} placeholder="Post-workout meal" />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
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

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search foods to add..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchQuery && searchResults.length > 0 && !selectedFood && (
              <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
                {searchResults.map((food) => (
                  <button
                    key={food.id}
                    onClick={() => {
                      setSelectedFood(food);
                      setQuantity(food.defaultQty.toString());
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted text-left"
                  >
                    <div>
                      <p className="text-sm">{food.name}</p>
                      <p className="text-xs text-muted-foreground">{food.per100.calories} kcal/100{food.unit === 'pieces' ? 'g' : food.unit}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {selectedFood && (
              <div className="flex gap-2 items-end p-3 rounded-lg bg-muted/30">
                <div className="flex-1">
                  <Label className="text-xs">{selectedFood.name}</Label>
                  <div className="flex gap-2 mt-1">
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-24" />
                    <span className="text-xs text-muted-foreground py-2">{selectedFood.unit}</span>
                  </div>
                </div>
                <Button size="sm" onClick={addItem}><Plus className="w-3.5 h-3.5" /></Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedFood(null)}><Search className="w-3.5 h-3.5" /></Button>
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Items ({items.length})</p>
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                    <div className="text-sm">
                      <p className="font-medium">{item.food_name}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity}{item.unit} · {item.calories} kcal · P{item.protein} C{item.carbs} F{item.fat}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-lg font-bold text-primary">{Math.round(totals.calories)} kcal · P{Math.round(totals.protein)} C{Math.round(totals.carbs)} F{Math.round(totals.fat)}</p>
                </div>
              </div>
            )}

            <Button onClick={saveMeal} className="w-full">
              <Check className="w-4 h-4 mr-2" /> Save Meal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
