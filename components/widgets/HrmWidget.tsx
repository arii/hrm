
import React from 'react';
import Widget from './Widget';
import HrmTiles from '../HrmTiles';

const HrmWidget: React.FC = () => {
  return (
    <Widget title="Heart Rate">
      <HrmTiles />
    </Widget>
  );
};

export default HrmWidget;
