# TypeORM Migrations

This directory contains TypeORM migration files for the database schema.

## Migration Commands

All migration commands are available as npm scripts in `package.json`:

### Generate Migration

Generate a new migration based on entity changes:

```bash
pnpm migration:generate src/database/migrations/MigrationName
```

This will compare the current entity definitions with the database schema and generate a migration file.

### Run Migrations

Apply all pending migrations to the database:

```bash
pnpm migration:run
```

### Revert Last Migration

Revert the most recent migration:

```bash
pnpm migration:revert
```

## Migration Workflow

1. **Modify entities** in `src/database/entities/`
2. **Generate migration**: `pnpm migration:generate src/database/migrations/DescriptiveName`
3. **Review the generated migration** file
4. **Run the migration**: `pnpm migration:run`

## Important Notes

- **Never** modify generated migration files manually
- **Always** review generated migrations before running
- **Test migrations** in a development environment first
- **Backup database** before running migrations in production
- Keep migrations in version control
