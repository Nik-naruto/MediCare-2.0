import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { ArrowRight } from 'lucide-react';

export const QuickActionCard = ({
  title,
  description,
  icon: Icon,
  to,
  onClick,
  variant = 'sky',
}) => {
  const variantIconStyles = {
    sky: 'bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white',
    teal: 'bg-teal-50 text-teal-600 group-hover:bg-teal-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white',
    purple: 'bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white',
  };

  const iconStyle = variantIconStyles[variant] || variantIconStyles.sky;

  const content = (
    <div className="p-4 flex items-center justify-between gap-4 group">
      <div className="flex items-center gap-3.5">
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconStyle}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="text-left">
          <h4 className="text-sm font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
            {title}
          </h4>
          {description && <p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>}
        </div>
      </div>
      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all shrink-0" />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block">
        <Card className="hover:shadow-md transition-all">{content}</Card>
      </Link>
    );
  }

  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-md transition-all">
      {content}
    </Card>
  );
};
