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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TrendingUp, Scale, Ruler, Dumbbell, Trash2, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import type { WeightLog, Measurement, Workout } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export default function ProgressPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  const [newWeight, setNewWeight] = useState('');
  const [showMeasure, setShowMeasure] = useState(false);
  const [showWorkout, setShowWorkout] = useState(false);

  const [measData, setMeasData] = useState({ chest: '', waist: '', hips: '', leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', bodyFat: '' });
  const [workoutData, setWorkoutData] = useState({ type: '', duration: '', intensity: 'medium' as 'low' | 'medium' | 'high', calories: '', notes: '' });

  const fetchAll = useCallback(async () => {
    const [w, m, wo] = await Promise.all([
      supabase.from('weight_logs').select('*').order('log_date', { ascending: true }),
      supabase.from('measurements').select('*').order('log_date', { ascending: true }),
      supabase.from('workouts').select('*').order('log_date', { ascending: true }),
    ]);
    setWeightLogs((w.data as WeightLog[]) || []);
    setMeasurements((m.data as Measurement[]) || []);
    setWorkouts((wo.data as Workout[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addWeight = async () => {
    if (!newWeight) return;
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('weight_logs').insert({ weight_kg: parseFloat(newWeight), log_date: today });
    if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Weight logged!' });
    setNewWeight('');
    fetchAll();
  };

  const addMeasurement = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('measurements').insert({
      log_date: today,
      chest_cm: measData.chest ? parseFloat(measData.chest) : null,
      waist_cm: measData.waist ? parseFloat(measData.waist) : null,
      hips_cm: measData.hips ? parseFloat(measData.hips) : null,
      left_arm_cm: measData.leftArm ? parseFloat(measData.leftArm) : null,
      right_arm_cm: measData.rightArm ? parseFloat(measData.rightArm) : null,
      left_thigh_cm: measData.leftThigh ? parseFloat(measData.leftThigh) : null,
      right_thigh_cm: measData.rightThigh ? parseFloat(measData.rightThigh) : null,
      body_fat_pct: measData.bodyFat ? parseFloat(measData.bodyFat) : null,
    });
    if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Measurements saved!' });
    setShowMeasure(false);
    setMeasData({ chest: '', waist: '', hips: '', leftArm: '', rightArm: '', leftThigh: '', rightThigh: '', bodyFat: '' });
    fetchAll();
  };

  const addWorkout = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { error } = await supabase.from('workouts').insert({
      log_date: today,
      workout_type: workoutData.type,
      duration_min: parseInt(workoutData.duration) || 0,
      intensity: workoutData.intensity,
      calories_burned: parseInt(workoutData.calories) || 0,
      notes: workoutData.notes,
    });
    if (error) { toast({ title: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Workout logged!' });
    setShowWorkout(false);
    setWorkoutData({ type: '', duration: '', intensity: 'medium', calories: '', notes: '' });
    fetchAll();
  };

  const deleteWeight = async (id: string) => {
    await supabase.from('weight_logs').delete().eq('id', id);
    setWeightLogs(weightLogs.filter((w) => w.id !== id));
  };

  const deleteWorkout = async (id: string) => {
    await supabase.from('workouts').delete().eq('id', id);
    setWorkouts(workouts.filter((w) => w.id !== id));
  };

  const weightData = weightLogs.map((w) => ({
    date: new Date(w.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    weight: w.weight_kg,
  }));

  const workoutData7 = workouts.slice(-7).map((w) => ({
    date: new Date(w.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    calories: w.calories_burned,
    duration: w.duration_min,
  }));

  const currentWeight = weightLogs[weightLogs.length - 1]?.weight_kg || profile?.weight_kg || 0;
  const startWeight = weightLogs[0]?.weight_kg || profile?.weight_kg || 0;
  const weightChange = (currentWeight as number) - (startWeight as number);

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20 pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <AppHeader title="Progress" subtitle="Track your fitness journey" />

        {loading ? (
          <div className="space-y-4">
            <div className="h-48 rounded-xl bg-card animate-pulse" />
            <div className="h-48 rounded-xl bg-card animate-pulse" />
          </div>
        ) : (
          <Tabs defaultValue="weight" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="weight">Weight</TabsTrigger>
              <TabsTrigger value="measure">Measurements</TabsTrigger>
              <TabsTrigger value="workouts">Workouts</TabsTrigger>
            </TabsList>

            <TabsContent value="weight" className="space-y-4">
              <Card className="border-border/50 glass">
                <CardContent className="p-4 md:p-6">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <Scale className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-lg font-bold">{currentWeight} kg</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <TrendingUp className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Change</p>
                      <p className={`text-lg font-bold ${weightChange > 0 ? 'text-accent' : weightChange < 0 ? 'text-primary' : ''}`}>
                        {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/30">
                      <p className="text-xs text-muted-foreground mt-6">Start</p>
                      <p className="text-lg font-bold">{startWeight} kg</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    <Input type="number" placeholder="Today's weight (kg)" value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
                    <Button onClick={addWeight} className="rounded-xl"><Plus className="w-4 h-4" /> Log</Button>
                  </div>

                  {weightData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={weightData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 18%)" />
                        <XAxis dataKey="date" stroke="hsl(215 15% 55%)" fontSize={10} />
                        <YAxis stroke="hsl(215 15% 55%)" fontSize={10} domain={['dataMin - 1', 'dataMax + 1']} />
                        <Tooltip contentStyle={{ background: 'hsl(222 22% 9%)', border: '1px solid hsl(222 15% 18%)', borderRadius: '8px' }} />
                        <Line type="monotone" dataKey="weight" stroke="hsl(142 71% 45%)" strokeWidth={2} dot={{ fill: 'hsl(142 71% 45%)', r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Log your weight to see progress</p>
                  )}

                  {weightLogs.length > 0 && (
                    <div className="space-y-1 mt-4">
                      {weightLogs.slice(-5).reverse().map((w) => (
                        <div key={w.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/20 group">
                          <span className="text-sm">{new Date(w.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{w.weight_kg} kg</span>
                            <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 w-6" onClick={() => deleteWeight(w.id)}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="measure" className="space-y-4">
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => setShowMeasure(true)} className="rounded-lg"><Plus className="w-3.5 h-3.5" /> Add</Button>
              </div>
              {measurements.length > 0 ? (
                <Card className="border-border/50 glass">
                  <CardContent className="p-4">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-muted-foreground border-b border-border">
                            <th className="text-left py-2">Date</th>
                            <th>Chest</th><th>Waist</th><th>Hips</th>
                            <th>Arms</th><th>Thighs</th><th>BF%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {measurements.slice(-10).reverse().map((m) => (
                            <tr key={m.id} className="border-b border-border/50">
                              <td className="py-2 text-left">{new Date(m.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                              <td className="text-center">{m.chest_cm || '-'}</td>
                              <td className="text-center">{m.waist_cm || '-'}</td>
                              <td className="text-center">{m.hips_cm || '-'}</td>
                              <td className="text-center">{m.left_arm_cm || '-'}/{m.right_arm_cm || '-'}</td>
                              <td className="text-center">{m.left_thigh_cm || '-'}/{m.right_thigh_cm || '-'}</td>
                              <td className="text-center">{m.body_fat_pct || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-border/50 glass">
                  <CardContent className="p-8 text-center">
                    <Ruler className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No measurements logged yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="workouts" className="space-y-4">
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => setShowWorkout(true)} className="rounded-lg"><Plus className="w-3.5 h-3.5" /> Log Workout</Button>
              </div>

              {workoutData7.length > 0 && (
                <Card className="border-border/50 glass">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-3">Calories Burned (Recent)</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={workoutData7}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 15% 18%)" />
                        <XAxis dataKey="date" stroke="hsl(215 15% 55%)" fontSize={10} />
                        <YAxis stroke="hsl(215 15% 55%)" fontSize={10} />
                        <Tooltip contentStyle={{ background: 'hsl(222 22% 9%)', border: '1px solid hsl(222 15% 18%)', borderRadius: '8px' }} />
                        <Bar dataKey="calories" fill="hsl(38 92% 50%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {workouts.length > 0 ? (
                <div className="space-y-2">
                  {workouts.slice(-10).reverse().map((w) => (
                    <Card key={w.id} className="border-border/50 glass">
                      <CardContent className="p-3 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
                            <Dumbbell className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{w.workout_type || 'Workout'}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(w.log_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {w.duration_min}min · {w.calories_burned}kcal · {w.intensity}
                            </p>
                          </div>
                        </div>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 w-7" onClick={() => deleteWorkout(w.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-border/50 glass">
                  <CardContent className="p-8 text-center">
                    <Dumbbell className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No workouts logged yet</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={showMeasure} onOpenChange={setShowMeasure}>
        <DialogContent className="glass max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Measurements (cm)</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'chest', label: 'Chest' }, { key: 'waist', label: 'Waist' },
              { key: 'hips', label: 'Hips' }, { key: 'leftArm', label: 'Left Arm' },
              { key: 'rightArm', label: 'Right Arm' }, { key: 'leftThigh', label: 'Left Thigh' },
              { key: 'rightThigh', label: 'Right Thigh' }, { key: 'bodyFat', label: 'Body Fat %' },
            ].map((f) => (
              <div key={f.key}>
                <Label className="text-xs">{f.label}</Label>
                <Input
                  type="number"
                  value={(measData as any)[f.key]}
                  onChange={(e) => setMeasData({ ...measData, [f.key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <Button onClick={addMeasurement} className="w-full">Save Measurements</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={showWorkout} onOpenChange={setShowWorkout}>
        <DialogContent className="glass">
          <DialogHeader><DialogTitle>Log Workout</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Workout Type</Label>
              <Input value={workoutData.type} onChange={(e) => setWorkoutData({ ...workoutData, type: e.target.value })} placeholder="Push, Pull, Legs, Cardio..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Duration (min)</Label>
                <Input type="number" value={workoutData.duration} onChange={(e) => setWorkoutData({ ...workoutData, duration: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Calories Burned</Label>
                <Input type="number" value={workoutData.calories} onChange={(e) => setWorkoutData({ ...workoutData, calories: e.target.value })} />
              </div>
            </div>
            <div>
              <Label className="text-xs">Intensity</Label>
              <Select value={workoutData.intensity} onValueChange={(v) => setWorkoutData({ ...workoutData, intensity: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input value={workoutData.notes} onChange={(e) => setWorkoutData({ ...workoutData, notes: e.target.value })} placeholder="How did it feel?" />
            </div>
            <Button onClick={addWorkout} className="w-full">Save Workout</Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
