import React from 'react';
import { VittareCoverScreen } from '../modules/cover';
import { PhoneShell } from '../components/layout/PhoneShell';

export const LoginScreen: React.FC = () => {
  return (
    <PhoneShell>
      <VittareCoverScreen isVisible={true} onEnter={() => {}} />
    </PhoneShell>
  );
};
