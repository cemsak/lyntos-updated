'use client';

import React, { useMemo } from 'react';
import { CardGrid } from '../../_components/shared/Card';
import { ControlCard } from './ControlCard';
import type { EnrichedCrossCheck, CheckFilter, GroupFilter } from '../_types/crossCheck';
import { SEVERITY_CONFIG } from '../_types/crossCheck';

interface ControlCardGridProps {
  checks: EnrichedCrossCheck[];
  filter: CheckFilter;
  groupFilter: GroupFilter;
  onCheckClick: (check: EnrichedCrossCheck) => void;
}

function matchesFilter(check: EnrichedCrossCheck, filter: CheckFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'kritik': return check.severity === 'critical' || check.severity === 'high';
    case 'failed': return check.status === 'fail';
    case 'warning': return check.status === 'warning';
    case 'passed': return check.status === 'pass';
    case 'no_data': return check.status === 'no_data';
    default: return true;
  }
}

function matchesGroup(check: EnrichedCrossCheck, group: GroupFilter): boolean {
  if (group === 'all') return true;
  const id = check.check_id.toLowerCase();
  switch (group) {
    case 'beyan': return id.includes('beyan') || id.includes('kdv') || id.includes('muhtasar');
    case 'teknik': return id.includes('teknik') || id.includes('ters') || id.includes('eksi') || id.includes('denklik');
    case 'mali': return id.includes('mali') || id.includes('bilanco');
    case 'efatura': return id.includes('efatura') || id.includes('fatura');
    default: return true;
  }
}

export function ControlCardGrid({ checks, filter, groupFilter, onCheckClick }: ControlCardGridProps) {
  const filtered = useMemo(() => {
    return checks
      .filter(c => matchesFilter(c, filter) && matchesGroup(c, groupFilter))
      .sort((a, b) => SEVERITY_CONFIG[a.severity].priority - SEVERITY_CONFIG[b.severity].priority);
  }, [checks, filter, groupFilter]);

  if (filtered.length === 0) {
    return (
      <div className="bg-[#F5F6F8] rounded-xl p-8 text-center">
        <p className="text-sm text-[#969696]">
          {checks.length === 0
            ? 'Capraz kontrol sonucu bulunamadi. Lutfen veri yukleyin.'
            : 'Secilen filtreye uyan kontrol bulunamadi.'}
        </p>
      </div>
    );
  }

  return (
    <CardGrid columns={3} gap="md">
      {filtered.map(check => (
        <ControlCard
          key={check.check_id}
          check={check}
          onClick={() => onCheckClick(check)}
        />
      ))}
    </CardGrid>
  );
}
