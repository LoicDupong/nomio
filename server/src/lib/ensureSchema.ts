import { DataTypes, ModelAttributeColumnOptions, Sequelize } from 'sequelize';

type ColumnDefinition = ModelAttributeColumnOptions;

async function ensureColumns(
  sequelize: Sequelize,
  tableName: string,
  columns: Record<string, ColumnDefinition>
): Promise<void> {
  const queryInterface = sequelize.getQueryInterface();
  const table = await queryInterface.describeTable(tableName);

  for (const [columnName, definition] of Object.entries(columns)) {
    if (table[columnName]) continue;

    await queryInterface.addColumn(tableName, columnName, definition);
    console.log(`DB schema repaired: added ${tableName}.${columnName}`);
  }
}

export async function ensureSchema(sequelize: Sequelize): Promise<void> {
  await ensureColumns(sequelize, 'users', {
    is_admin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  });

  await ensureColumns(sequelize, 'gallery_photos', {
    storage_key: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    size_bytes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  });
}
