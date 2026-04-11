import type { User } from '@udd/contracts';
import type { UserRepository } from '../interfaces.js';
import { queryOne, query } from '../../connection.js';

function rowToUser(row: Record<string, unknown>): User {
  return {
    id: row['id'] as string,
    externalAuthId: row['external_auth_id'] as string,
    email: row['email'] as string,
    displayName: row['display_name'] as string,
    avatarUrl: (row['avatar_url'] as string | null) ?? null,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgUserRepository implements UserRepository {
  async findById(id: string): Promise<User | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM users WHERE id = $1',
      [id],
    );
    return row ? rowToUser(row) : null;
  }

  async findByExternalAuthId(externalAuthId: string): Promise<User | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM users WHERE external_auth_id = $1',
      [externalAuthId],
    );
    return row ? rowToUser(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM users WHERE email = $1',
      [email],
    );
    return row ? rowToUser(row) : null;
  }

  async upsert(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO users (external_auth_id, email, display_name, avatar_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (external_auth_id)
       DO UPDATE SET
         email        = EXCLUDED.email,
         display_name = EXCLUDED.display_name,
         avatar_url   = EXCLUDED.avatar_url,
         updated_at   = NOW()
       RETURNING *`,
      [data.externalAuthId, data.email, data.displayName, data.avatarUrl ?? null],
    );
    if (!row) throw new Error('Upsert returned no rows');
    return rowToUser(row);
  }
}
