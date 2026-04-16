import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

interface TripMemberAttributes {
  id: string;
  trip_id: string;
  user_id: string | null;
  guest_name: string | null;
  role: 'owner' | 'member';
  joined_at?: Date;
}

interface TripMemberCreationAttributes extends Optional<TripMemberAttributes, 'id' | 'joined_at'> {}

export class TripMember extends Model<TripMemberAttributes, TripMemberCreationAttributes> implements TripMemberAttributes {
  public id!: string;
  public trip_id!: string;
  public user_id!: string | null;
  public guest_name!: string | null;
  public role!: 'owner' | 'member';
  public joined_at!: Date;
}

TripMember.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    trip_id: { type: DataTypes.UUID, allowNull: false },
    user_id: { type: DataTypes.UUID, allowNull: true },
    guest_name: { type: DataTypes.STRING, allowNull: true },
    role: { type: DataTypes.ENUM('owner', 'member'), allowNull: false, defaultValue: 'member' },
    joined_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'trip_members', timestamps: false }
);
