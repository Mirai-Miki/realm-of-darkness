import type {
  ChronicleDb,
  InsertChronicleData,
  UpdateChronicleData,
} from "@realm/database";
import type {
  IChronicleRepository,
  ChronicleData,
  Snowflake,
  ChronicleRepositoryInput,
  CreateChronicleInput,
} from "@realm/common";

import { eq, inArray } from "drizzle-orm";
import {
  db,
  chronicles,
  insertChronicleSchema,
  updateChronicleSchema,
} from "@realm/database";
import {
  RealmError,
  SnowflakeSchema,
  generateSnowflake,
  GameEdition,
} from "@realm/common";
import { hasDataChanged } from "./repository.utilities";

function toChronicleData(db: ChronicleDb): ChronicleData {
  return {
    id: db.id,
    name: db.name,
    iconUrl: db.iconUrl,
    defaultVersion: (db.defaultVersion as GameEdition) ?? GameEdition.Fifth,
    storytellerRoleIds: Array.isArray(db.storytellerRoleIds)
      ? [...db.storytellerRoleIds]
      : [],
    createdAt: db.createdAt,
    lastUpdated: db.lastUpdated,
  };
}

export class ChronicleRepository implements IChronicleRepository {
  private hasChanges(
    current: ChronicleDb,
    incoming: UpdateChronicleData
  ): boolean {
    return hasDataChanged<ChronicleDb, UpdateChronicleData>(current, incoming);
  }

  public async findById(id: Snowflake): Promise<ChronicleData | null> {
    try {
      const validatedId = SnowflakeSchema.parse(id);
      const result = await db
        .select()
        .from(chronicles)
        .where(eq(chronicles.id, validatedId))
        .limit(1);
      return result.length === 0 ? null : toChronicleData(result[0]);
    } catch (error) {
      throw new RealmError("Failed to find chronicle by ID", {
        cause: error,
        fields: { id },
      });
    }
  }

  public async findAllIds(): Promise<Snowflake[]> {
    try {
      const result = await db.select({ id: chronicles.id }).from(chronicles);
      return result.map((r) => r.id);
    } catch (error) {
      throw new RealmError("Failed to fetch all chronicle IDs", {
        cause: error,
      });
    }
  }

  public async findManyByIds(ids: Snowflake[]): Promise<ChronicleData[]> {
    if (ids.length === 0) {
      return [];
    }
    try {
      const validatedIds = ids.map((id) => SnowflakeSchema.parse(id));
      const results = await db
        .select()
        .from(chronicles)
        .where(inArray(chronicles.id, validatedIds));
      return results.map(toChronicleData);
    } catch (error) {
      throw new RealmError("Failed to find chronicles by IDs", {
        cause: error,
      });
    }
  }

  public async create(input: CreateChronicleInput): Promise<ChronicleData> {
    const chronicleId = generateSnowflake();
    try {
      const dbRecord: InsertChronicleData = {
        id: chronicleId,
        name: input.name,
        iconUrl: input.iconUrl || "",
        defaultVersion: input.defaultVersion ?? GameEdition.Fifth,
        storytellerRoleIds: input.storytellerRoleIds ?? [],
      };
      const validatedData = insertChronicleSchema.parse(dbRecord);
      const [result] = await db
        .insert(chronicles)
        .values(validatedData)
        .returning();
      return toChronicleData(result);
    } catch (error) {
      throw new RealmError("Failed to create chronicle", {
        cause: error,
        fields: { id: chronicleId },
      });
    }
  }

  public async update(input: ChronicleRepositoryInput): Promise<ChronicleData>;
  public async update(
    input: ChronicleRepositoryInput,
    options: { ignoreNotFound: true }
  ): Promise<ChronicleData | null>;
  public async update(
    input: ChronicleRepositoryInput,
    options?: { ignoreNotFound: boolean }
  ): Promise<ChronicleData | null> {
    try {
      const validatedId = SnowflakeSchema.parse(input.id);
      const currentResult = await db
        .select()
        .from(chronicles)
        .where(eq(chronicles.id, validatedId))
        .limit(1);

      if (currentResult.length === 0) {
        if (!options?.ignoreNotFound) {
          throw new RealmError("Chronicle not found for update", {
            fields: { id: input.id },
          });
        }
        return null;
      }

      return await this.performUpdate(input, currentResult[0]);
    } catch (error) {
      if (error instanceof RealmError) throw error;
      throw new RealmError("Failed to update chronicle", {
        cause: error,
        fields: { id: input.id },
      });
    }
  }

  private async performUpdate(
    input: ChronicleRepositoryInput,
    currentChronicle: ChronicleDb
  ): Promise<ChronicleData> {
    try {
      const updateData: UpdateChronicleData = {
        id: input.id,
        name: input.name !== undefined ? input.name : currentChronicle.name,
        iconUrl:
          input.iconUrl !== undefined
            ? input.iconUrl
            : currentChronicle.iconUrl,
        defaultVersion:
          input.defaultVersion !== undefined
            ? input.defaultVersion
            : (currentChronicle.defaultVersion as GameEdition),
        storytellerRoleIds:
          input.storytellerRoleIds !== undefined
            ? input.storytellerRoleIds
            : currentChronicle.storytellerRoleIds,
        lastUpdated: new Date(),
      };

      if (!this.hasChanges(currentChronicle, updateData)) {
        return toChronicleData(currentChronicle);
      }

      const validatedData = updateChronicleSchema.parse(updateData);
      const [result] = await db
        .update(chronicles)
        .set(validatedData)
        .where(eq(chronicles.id, input.id))
        .returning();
      return toChronicleData(result);
    } catch (error) {
      throw new RealmError("Failed to perform update on chronicle", {
        cause: error,
        fields: { id: input.id },
      });
    }
  }

  public async upsert(input: ChronicleRepositoryInput): Promise<ChronicleData> {
    try {
      const existingResult = await db
        .select()
        .from(chronicles)
        .where(eq(chronicles.id, input.id))
        .limit(1);
      if (existingResult.length > 0) {
        return await this.performUpdate(input, existingResult[0]);
      } else {
        return await this.create(input);
      }
    } catch (error) {
      throw new RealmError("Failed to upsert chronicle", {
        cause: error,
        fields: { id: input.id },
      });
    }
  }

  public async delete(id: Snowflake): Promise<void> {
    try {
      const validatedId = SnowflakeSchema.parse(id);
      await db.delete(chronicles).where(eq(chronicles.id, validatedId));
    } catch (error) {
      throw new RealmError("Failed to delete chronicle", {
        cause: error,
        fields: { id },
      });
    }
  }

  public async exists(id: Snowflake): Promise<boolean> {
    try {
      const validatedId = SnowflakeSchema.parse(id);
      const result = await db
        .select({ id: chronicles.id })
        .from(chronicles)
        .where(eq(chronicles.id, validatedId))
        .limit(1);
      return result.length > 0;
    } catch (error) {
      throw new RealmError("Failed to check chronicle existence", {
        cause: error,
        fields: { id },
      });
    }
  }
}
