'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Loader2, ChevronRight, ChevronLeft, Target, Activity, Flame } from 'lucide-react';
import { calculateTargets } from '@/lib/nutrition';
import type { Gender, ActivityLevel, Goal, DietType } from '@/lib/types';

const STEPS = ['Basics', 'Body', 'Activity', 'Goals', 'Targets'] as const;

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little to no exercise' },
  { value: 'light', label: 'Light', desc: '1-3 days/week' },
  { value: 'moderate', label: 'Moderate', desc: '3-5 days/week' },
  { value: 'active', label: 'Active', desc: '6-7 days/week' },
  { value: 'very_active', label: 'Very Active', desc: '2x per day' },
];

const GOAL_OPTIONS: { value: Goal; label: string; desc: string; icon: any }[] = [
  { value: 'lean_bulk', label: 'Lean Bulk', desc: 'Build muscle, minimal fat', icon: Dumbbell },
  { value: 'cut', label: 'Cut', desc: 'Lose fat, preserve muscle', icon: Flame },
  { value: 'maintain', label: 'Maintain', desc: 'Stay at current weight', icon: Target },
];

export default function OnboardingPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [age, setAge] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [activity, setActivity] = useState<ActivityLevel>('moderate');
  const [gymDays, setGymDays] = useState('4');
  const [diet, setDiet] = useState<DietType>('non_veg');
  const [goal, setGoal] = useState<Goal>('lean_bulk');

  const [targets, setTargets] = useState({
    calorieTarget: 0,
    proteinTarget: 0,
    carbsTarget: 0,
    fatTarget: 0,
    waterTargetMl: 0,
  });

  const [editTargets, setEditTargets] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  const computeTargets = () => {
    const t = calculateTargets(
      parseFloat(weightKg),
      parseFloat(heightCm),
      parseInt(age),
      gender,
      activity,
      goal
    );
    setTargets({
      calorieTarget: t.calorieTarget,
      proteinTarget: t.proteinTarget,
      carbsTarget: t.carbsTarget,
      fatTarget: t.fatTarget,
      waterTargetMl: t.waterTargetMl,
    });
  };

  const next = () => {
    if (step === 0 && (!age || parseInt(age) < 10 || parseInt(age) > 100)) {
      toast({ title: 'Please enter a valid age (10-100)', variant: 'destructive' });
      return;
    }
    if (step === 1 && (!heightCm || !weightKg || parseFloat(heightCm) < 50 || parseFloat(weightKg) < 20)) {
      toast({ title: 'Please enter valid height and weight', variant: 'destructive' });
      return;
    }
    if (step === 3) {
      computeTargets();
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          age: parseInt(age),
          gender,
          height_cm: parseFloat(heightCm),
          weight_kg: parseFloat(weightKg),
          activity_level: activity,
          gym_days_per_week: parseInt(gymDays),
          diet_type: diet,
          goal,
          calorie_target: targets.calorieTarget,
          protein_target: targets.proteinTarget,
          carbs_target: targets.carbsTarget,
          fat_target: targets.fatTarget,
          water_target_ml: targets.waterTargetMl,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user!.id);

      if (error) throw error;

      await supabase.from('weight_logs').insert({
        weight_kg: parseFloat(weightKg),
        log_date: new Date().toISOString().split('T')[0],
      });

      await refreshProfile();
      toast({ title: 'Profile setup complete!' });
      router.push('/dashboard');
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save profile', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="max-w-md mx-auto pt-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20">
            <Dumbbell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">FlexFuel Setup</h1>
            <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>

        <Progress value={progress} className="h-1.5" />

        <Card className="border-border/50 glass animate-fade-in-up" key={step}>
          <CardHeader>
            <CardTitle className="text-xl">{STEPS[step]}</CardTitle>
            <CardDescription>
              {step === 0 && 'Tell us about yourself'}
              {step === 1 && 'Your body measurements'}
              {step === 2 && 'How active are you?'}
              {step === 3 && 'What\'s your fitness goal?'}
              {step === 4 && 'Your daily targets'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 min-h-[300px]">
            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input
                    type="number"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <RadioGroup value={gender} onValueChange={(v) => setGender(v as Gender)} className="grid grid-cols-3 gap-2">
                    {(['male', 'female', 'other'] as Gender[]).map((g) => (
                      <div key={g}>
                        <RadioGroupItem value={g} id={g} className="peer sr-only" />
                        <Label
                          htmlFor={g}
                          className="flex items-center justify-center py-3 rounded-lg border border-border cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary capitalize transition-all"
                        >
                          {g}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label>Diet Preference</Label>
                  <RadioGroup value={diet} onValueChange={(v) => setDiet(v as DietType)} className="grid grid-cols-3 gap-2">
                    <div>
                      <RadioGroupItem value="non_veg" id="non_veg" className="peer sr-only" />
                      <Label htmlFor="non_veg" className="flex items-center justify-center py-3 rounded-lg border border-border cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all text-sm">
                        Non-Veg
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="veg" id="veg" className="peer sr-only" />
                      <Label htmlFor="veg" className="flex items-center justify-center py-3 rounded-lg border border-border cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all text-sm">
                        Veg
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="vegan" id="vegan" className="peer sr-only" />
                      <Label htmlFor="vegan" className="flex items-center justify-center py-3 rounded-lg border border-border cursor-pointer peer-checked:border-primary peer-checked:bg-primary/10 peer-checked:text-primary transition-all text-sm">
                        Vegan
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Height (cm)</Label>
                  <Input
                    type="number"
                    placeholder="175"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    placeholder="72"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <div className="space-y-2">
                    {ACTIVITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setActivity(opt.value)}
                        className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                          activity === opt.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                        <Activity className={`w-4 h-4 ${activity === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Gym Days Per Week: {gymDays}</Label>
                  <Input
                    type="range"
                    min="0"
                    max="7"
                    value={gymDays}
                    onChange={(e) => setGymDays(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                {GOAL_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setGoal(opt.value)}
                      className={`w-full flex items-center gap-3 p-4 rounded-lg border transition-all text-left ${
                        goal === opt.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${goal === opt.value ? 'bg-primary/20' : 'bg-muted'}`}>
                        <Icon className={`w-5 h-5 ${goal === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-xs text-muted-foreground mb-1">Daily Calories</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-bold text-primary">{targets.calorieTarget}</p>
                      <p className="text-xs text-muted-foreground">kcal</p>
                    </div>
                  </div>
                  {[
                    { label: 'Protein', value: targets.proteinTarget, unit: 'g', color: 'text-chart-1' },
                    { label: 'Carbs', value: targets.carbsTarget, unit: 'g', color: 'text-chart-4' },
                    { label: 'Fat', value: targets.fatTarget, unit: 'g', color: 'text-chart-3' },
                    { label: 'Water', value: targets.waterTargetMl, unit: 'ml', color: 'text-chart-2' },
                  ].map((m) => (
                    <div key={m.label} className="p-3 rounded-lg bg-card border border-border">
                      <p className="text-xs text-muted-foreground mb-1">{m.label}</p>
                      <div className="flex items-baseline gap-1">
                        <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                        <p className="text-xs text-muted-foreground">{m.unit}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {editTargets && (
                  <div className="space-y-3 p-3 rounded-lg border border-border">
                    <p className="text-xs font-medium text-muted-foreground">Edit Targets</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Calories</Label>
                        <Input type="number" value={targets.calorieTarget} onChange={(e) => setTargets({ ...targets, calorieTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Protein (g)</Label>
                        <Input type="number" value={targets.proteinTarget} onChange={(e) => setTargets({ ...targets, proteinTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Carbs (g)</Label>
                        <Input type="number" value={targets.carbsTarget} onChange={(e) => setTargets({ ...targets, carbsTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div>
                        <Label className="text-xs">Fat (g)</Label>
                        <Input type="number" value={targets.fatTarget} onChange={(e) => setTargets({ ...targets, fatTarget: parseInt(e.target.value) || 0 })} />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Water (ml)</Label>
                        <Input type="number" value={targets.waterTargetMl} onChange={(e) => setTargets({ ...targets, waterTargetMl: parseInt(e.target.value) || 0 })} />
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditTargets(!editTargets)}
                  className="w-full text-xs"
                >
                  {editTargets ? 'Done editing' : 'Edit targets manually'}
                </Button>
              </div>
            )}
          </CardContent>

          <div className="flex gap-3 p-6 pt-0">
            {step > 0 && (
              <Button variant="outline" onClick={back} disabled={loading}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            {step < STEPS.length - 1 ? (
              <Button onClick={next} className="flex-1">
                Continue <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} className="flex-1" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Tracking'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
