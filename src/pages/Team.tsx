import React from 'react';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Team page showcasing the leadership, engineers, and contributors
 * behind Give Protocol.
 */
export const Team: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">
        {t('team.title', 'Our Team')}
      </h1>
      <p className="text-lg text-gray-600 mb-12">
        {t(
          'team.subtitle',
          'Give Protocol is built by a dedicated team of engineers, nonprofit leaders, and blockchain experts working to bring transparency and efficiency to charitable giving.'
        )}
      </p>
      
      <div className="bg-emerald-50 rounded-2xl p-8 border border-emerald-100 text-center">
        <h2 className="text-2xl font-semibold text-emerald-900 mb-4">
          {t('team.comingSoon', 'Team Profiles Coming Soon')}
        </h2>
        <p className="text-emerald-700">
          {t(
            'team.comingSoonDesc',
            'We are updating our team directory. Check back shortly to meet the people behind Give Protocol.'
          )}
        </p>
      </div>
    </div>
  );
};

export default Team;
