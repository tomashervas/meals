import React from 'react';
import type { UserProfile, MacroTargets, MacroTotals } from '../../types/nutrition';
import { CalorieBalanceCard } from './CalorieBalanceCard';
import { MacroBreakdownCard } from './MacroBreakdownCard';

interface DashboardProps {
  profile: UserProfile;
  targets: MacroTargets;
  dailyTotals: MacroTotals;
  onOpenProfile: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  profile,
  targets,
  dailyTotals,
  onOpenProfile,
}) => {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <CalorieBalanceCard
        profile={profile}
        targets={targets}
        dailyCalories={dailyTotals.calories}
        onOpenProfile={onOpenProfile}
      />
      <MacroBreakdownCard
        profile={profile}
        targets={targets}
        dailyTotals={dailyTotals}
      />
    </section>
  );
};
