import type { ProviderConfig } from '@udd/contracts';
import type { ProviderConfigRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToConfig(row: Record<string, unknown>): ProviderConfig {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    createdByUserId: row['created_by_user_id'] as string,
    name: row['name'] as string,
    providerType: row['provider_type'] as ProviderConfig['providerType'],
    endpointUrl: row['endpoint_url'] as string,
    modelCatalogMode: row['model_catalog_mode'] as ProviderConfig['modelCatalogMode'],
    authScheme: row['auth_scheme'] as ProviderConfig['authScheme'],
    credentialSecretRef: row['credential_secret_ref'] as string,
    customHeadersEncryptedRef:
      (row['custom_headers_encrypted_ref'] as string | null) ?? null,
    isActive: row['is_active'] as boolean,
    isSystemManaged: row['is_system_managed'] as boolean,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
    deletedAt: row['deleted_at'] ? (row['deleted_at'] as Date).toISOString() : null,
  };
}

export class PgProviderConfigRepository implements ProviderConfigRepository {
  async create(
    data: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>,
  ): Promise<ProviderConfig> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO provider_configs
         (workspace_id, created_by_user_id, name, provider_type, endpoint_url,
          model_catalog_mode, auth_scheme, credential_secret_ref,
          custom_headers_encrypted_ref, is_active, is_system_managed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.workspaceId,
        data.createdByUserId,
        data.name,
        data.providerType,
        data.endpointUrl,
        data.modelCatalogMode,
        data.authScheme,
        data.credentialSecretRef,
        data.customHeadersEncryptedRef ?? null,
        data.isActive,
        data.isSystemManaged,
      ],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToConfig(row);
  }

  async findById(id: string): Promise<ProviderConfig | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM provider_configs WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToConfig(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: string,
    options?: PageOptions,
  ): Promise<Page<ProviderConfig>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM provider_configs
       WHERE workspace_id = $1 AND deleted_at IS NULL ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToConfig);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        ProviderConfig,
        'name' | 'endpointUrl' | 'modelCatalogMode' | 'isActive' | 'credentialSecretRef'
      >
    >,
  ): Promise<ProviderConfig | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE provider_configs
       SET name                  = COALESCE($2, name),
           endpoint_url          = COALESCE($3, endpoint_url),
           model_catalog_mode    = COALESCE($4, model_catalog_mode),
           is_active             = COALESCE($5, is_active),
           credential_secret_ref = COALESCE($6, credential_secret_ref),
           updated_at            = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.endpointUrl ?? null,
        data.modelCatalogMode ?? null,
        data.isActive ?? null,
        data.credentialSecretRef ?? null,
      ],
    );
    return row ? rowToConfig(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `UPDATE provider_configs
       SET deleted_at = NOW(), updated_at = NOW(), is_active = FALSE
       WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}
