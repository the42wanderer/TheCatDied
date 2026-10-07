import React, {useLayoutEffect} from 'react';
import {useThree} from '@react-three/fiber';

// Mounted once async assets exist: force a draw, then release Remotion's capture.
export const Settle: React.FC<{onReady: () => void}> = ({onReady}) => {
  const advance = useThree((s) => s.advance);
  useLayoutEffect(() => {
    advance(performance.now());
    requestAnimationFrame(() => {
      advance(performance.now());
      onReady();
    });
  }, [advance, onReady]);
  return null;
};
