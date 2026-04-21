import {
  faUtensils,
  faLocationDot,
  faBed,
  faPersonRunning,
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { Category } from '@/types';

export const CATEGORY_ICON: Record<Category, IconDefinition> = {
  food: faUtensils,
  spot: faLocationDot,
  hotel: faBed,
  activity: faPersonRunning,
};

export const CATEGORY_COLOR: Record<Category, string> = {
  food: '#f59e0b',
  spot: '#3b82f6',
  hotel: '#8b5cf6',
  activity: '#10b981',
};

export const CATEGORY_LABEL: Record<Category, string> = {
  food: 'Food',
  spot: 'Spot',
  hotel: 'Hotel',
  activity: 'Activity',
};
