'use client';

/**
 * LYNTOS User Greeting Component
 * Sprint 7.3 - Stripe Dashboard Shell
 * Personalized greeting based on time of day
 */
import React from 'react';
import { useLayoutContext } from './useLayoutContext';

export function UserGreeting() {
  const { user } = useLayoutContext();

  if (!user) return null;

  // Determine greeting based on time
  const hour = new Date().getHours();
  let greeting = 'Merhaba';
  if (hour < 12) greeting = 'Günaydın';
  else if (hour < 18) greeting = 'İyi günler';
  else greeting = 'İyi akşamlar';

  // Determine honorific (can be dynamic based on gender in the future)
  const honorific = 'Bey';

  // Get first name
  const firstName = user.name.split(' ')[0];

  return (
    <div className="hidden lg:block">
      <span className="text-[14px] text-[#697386]">
        {greeting},{' '}
        <span className="font-medium text-[#1a1f36]">
          {firstName} {honorific}
        </span>
      </span>
    </div>
  );
}
