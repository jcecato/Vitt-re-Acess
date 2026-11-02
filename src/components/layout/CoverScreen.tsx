import React from 'react';
import { VittareCoverScreen } from '../../modules/cover';

interface CoverScreenProps {
  isVisible: boolean;
  onEnter: () => void;
}

export const CoverScreen: React.FC<CoverScreenProps> = ({ isVisible, onEnter }) => {
  if (!isVisible) return null;
  return <VittareCoverScreen isVisible={isVisible} onEnter={onEnter} />;
};
