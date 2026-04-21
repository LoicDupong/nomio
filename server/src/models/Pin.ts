import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface PinAttributes {
  id: string;
  trip_id: string;
  member_id: string;
  lat: number;
  lng: number;
  title: string;
  note: string | null;
  category: 'food' | 'spot' | 'hotel' | 'activity';
  photo_url: string | null;
  rating: number | null;
  budget: number | null;
  created_at?: Date;
}

interface PinCreationAttributes extends Optional<PinAttributes, 'id' | 'created_at' | 'rating' | 'budget'> {}

export class Pin extends Model<PinAttributes, PinCreationAttributes> implements PinAttributes {
  public id!: string;
  public trip_id!: string;
  public member_id!: string;
  public lat!: number;
  public lng!: number;
  public title!: string;
  public note!: string | null;
  public category!: 'food' | 'spot' | 'hotel' | 'activity';
  public photo_url!: string | null;
  public rating!: number | null;
  public budget!: number | null;
  public created_at!: Date;
}

Pin.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    member_id: { type: DataTypes.UUID, allowNull: false },
    lat: { type: DataTypes.DECIMAL(10, 8), allowNull: false },
    lng: { type: DataTypes.DECIMAL(11, 8), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: true },
    category: { type: DataTypes.ENUM('food', 'spot', 'hotel', 'activity'), allowNull: false },
    photo_url: { type: DataTypes.STRING, allowNull: true },
    rating: { type: DataTypes.INTEGER, allowNull: true },
    budget: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'pins', timestamps: false }
);
