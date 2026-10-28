import { useMemo } from 'react';
import { MESSAGES } from '../constants/messages';

export function useGreeting(firstName = '') {
  return useMemo(() => {
    const hour = new Date().getHours();
    let greetingPrefix = MESSAGES.GREETING.MORNING;

    if (hour >= 12 && hour < 17) {
      greetingPrefix = MESSAGES.GREETING.AFTERNOON;
    } else if (hour >= 17 || hour < 5) {
      greetingPrefix = MESSAGES.GREETING.EVENING;
    }

    return firstName ? `${greetingPrefix}, ${firstName}` : greetingPrefix;
  }, [firstName]);
}
