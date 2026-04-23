import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from './index';

export type FeedbackType = 'bug' | 'feature' | 'ui' | 'other';
export type FeedbackStatus = 'new' | 'read' | 'archived';

interface FeedbackAttributes {
  id: string;
  type: FeedbackType;
  title: string;
  message: string;
  email: string | null;
  screenshot_url: string | null;
  screenshot_key: string | null;
  status: FeedbackStatus;
  user_id: string | null;
  page: string | null;
  trip_id: string | null;
  app_version: string;
  created_at?: Date;
}

interface FeedbackCreationAttributes
  extends Optional<
    FeedbackAttributes,
    'id' | 'created_at' | 'email' | 'screenshot_url' | 'screenshot_key' | 'user_id' | 'page' | 'trip_id'
  > {}

export class Feedback
  extends Model<FeedbackAttributes, FeedbackCreationAttributes>
  implements FeedbackAttributes
{
  public id!: string;
  public type!: FeedbackType;
  public title!: string;
  public message!: string;
  public email!: string | null;
  public screenshot_url!: string | null;
  public screenshot_key!: string | null;
  public status!: FeedbackStatus;
  public user_id!: string | null;
  public page!: string | null;
  public trip_id!: string | null;
  public app_version!: string;
  public created_at!: Date;
}

Feedback.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    type: { type: DataTypes.ENUM('bug', 'feature', 'ui', 'other'), allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: true },
    screenshot_url: { type: DataTypes.STRING, allowNull: true },
    screenshot_key: { type: DataTypes.STRING, allowNull: true },
    status: {
      type: DataTypes.ENUM('new', 'read', 'archived'),
      allowNull: false,
      defaultValue: 'new',
    },
    user_id: { type: DataTypes.UUID, allowNull: true },
    page: { type: DataTypes.STRING, allowNull: true },
    trip_id: { type: DataTypes.UUID, allowNull: true },
    app_version: { type: DataTypes.STRING, allowNull: false, defaultValue: 'V1 beta' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  },
  { sequelize, tableName: 'feedbacks', timestamps: false }
);
