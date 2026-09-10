import React from 'react';
import { Card } from '../common/Card';

export const DashboardSection = ({
  title,
  subtitle,
  action,
  children,
  className = '',
}) => {
  return (
    <Card title={title} subtitle={subtitle} action={action} className={className}>
      {children}
    </Card>
  );
};
