export type HrZone = 'ZONE_1' | 'ZONE_2' | 'ZONE_3' | 'ZONE_4' | 'ZONE_5'

export const HR_ZONES = {
  ZONE_1: {
    key: 'ZONE_1',
    label: 'Very Light',
    range: [50, 60],
    color: '#6EE7B7',
    gradient: 'linear-gradient(135deg, #6EE7B7 0%, #34D399 100%)',
    glow: '0 0 20px #6EE7B7',
  },
  ZONE_2: {
    key: 'ZONE_2',
    label: 'Light',
    range: [60, 70],
    color: '#34D399',
    gradient: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)',
    glow: '0 0 20px #34D399',
  },
  ZONE_3: {
    key: 'ZONE_3',
    label: 'Moderate',
    range: [70, 80],
    color: '#FBBF24',
    gradient: 'linear-gradient(135deg, #FBBF24 0%, #F59E0B 100%)',
    glow: '0 0 20px #FBBF24',
  },
  ZONE_4: {
    key: 'ZONE_4',
    label: 'Hard',
    range: [80, 90],
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    glow: '0 0 20px #F59E0B',
  },
  ZONE_5: {
    key: 'ZONE_5',
    label: 'Maximum',
    range: [90, 100],
    color: '#EF4444',
    gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    glow: '0 0 20px #EF4444',
  },
} as const
