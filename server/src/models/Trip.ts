import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface TripAttributes {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at?: Date;
}

interface TripCreationAttributes extends Optional<TripAttributes, 'id' | 'created_at'> {}

export class Trip extends Model<TripAttributes, TripCreationAttributes> implements TripAttributes {
  public id!: string;
  public name!: string;
  public invite_code!: string;
  public owner_id!: string;
  public created_at!: Date;
}

Trip.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    invite_code: { type: DataTypes.STRING(6), unique: true, allowNull: false },
    owner_id: { type: DataTypes.UUID, allowNull: false },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'trips', timestamps: false }
);
