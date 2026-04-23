import { Sequelize } from 'sequelize';

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error('DATABASE_URL is missing');
}

try {
  const parsed = new URL(dbUrl);
  console.log('DB CONFIG DEBUG', {
    protocol: parsed.protocol,
    host: parsed.hostname,
    port: parsed.port,
    database: parsed.pathname.slice(1), // Remove leading slash
    hasSSLParam: parsed.search.includes('ssl'),
  });
} catch (e) {
  console.error('DB URL PARSE FAILED');
  throw e;
}

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

import { User } from './User';
import { Trip } from './Trip';
import { TripMember } from './TripMember';
import { Pin } from './Pin';
import { GalleryPhoto } from './GalleryPhoto';
import { Feedback } from './Feedback';

// Associations
Trip.belongsTo(User, { foreignKey: 'owner_id', as: 'owner' });
User.hasMany(Trip, { foreignKey: 'owner_id', as: 'trips' });

TripMember.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(TripMember, { foreignKey: 'trip_id', as: 'members' });

TripMember.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(TripMember, { foreignKey: 'user_id', as: 'memberships' });

Pin.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(Pin, { foreignKey: 'trip_id', as: 'pins' });

Pin.belongsTo(TripMember, { foreignKey: 'member_id', as: 'member' });
TripMember.hasMany(Pin, { foreignKey: 'member_id', as: 'pins' });

GalleryPhoto.belongsTo(Trip, { foreignKey: 'trip_id', as: 'trip' });
Trip.hasMany(GalleryPhoto, { foreignKey: 'trip_id', as: 'gallery_photos' });

GalleryPhoto.belongsTo(TripMember, { foreignKey: 'member_id', as: 'member' });
GalleryPhoto.belongsTo(Pin, { foreignKey: 'pin_id', as: 'pin' });
Pin.hasMany(GalleryPhoto, { foreignKey: 'pin_id', as: 'gallery_photos' });

Feedback.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(Feedback, { foreignKey: 'user_id', as: 'feedbacks' });

export { User, Trip, TripMember, Pin, GalleryPhoto, Feedback };