import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface GalleryPhotoAttributes {
  id: string;
  trip_id: string;
  member_id: string;
  pin_id: string | null;
  url: string;
  created_at?: Date;
}

interface GalleryPhotoCreationAttributes extends Optional<GalleryPhotoAttributes, 'id' | 'created_at'> {}

export class GalleryPhoto extends Model<GalleryPhotoAttributes, GalleryPhotoCreationAttributes> implements GalleryPhotoAttributes {
  public id!: string;
  public trip_id!: string;
  public member_id!: string;
  public pin_id!: string | null;
  public url!: string;
  public created_at!: Date;
}

GalleryPhoto.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    pin_id: { type: DataTypes.UUID, allowNull: true },
    url: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'gallery_photos', timestamps: false }
);
