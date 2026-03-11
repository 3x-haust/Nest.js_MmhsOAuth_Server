import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Client } from '@elastic/elasticsearch';
import { ILike, Repository } from 'typeorm';
import { User } from './entities/user.entity';

type SearchableUser = {
  id: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  role: 'student' | 'teacher';
  major: 'software' | 'design' | 'web';
  admission?: number;
  generation?: number;
  isGraduated?: boolean;
  isAdmin: boolean;
};

type SearchUserDocument = SearchableUser & {
  searchText: string;
};

@Injectable()
export class UserSearchService implements OnModuleInit {
  private readonly indexName =
    process.env.ELASTICSEARCH_USER_INDEX || 'mmhs-users';
  private readonly syncIntervalMs = Number(
    process.env.ELASTICSEARCH_SYNC_INTERVAL_MS || 15000,
  );
  private readonly elasticsearch: Client | null;
  private lastSyncedAt = 0;
  private syncPromise: Promise<void> | null = null;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const node = process.env.ELASTICSEARCH_NODE || process.env.ES_NODE;
    if (!node) {
      this.elasticsearch = null;
      return;
    }

    const apiKey = process.env.ELASTICSEARCH_API_KEY;
    const username = process.env.ELASTICSEARCH_USERNAME;
    const password = process.env.ELASTICSEARCH_PASSWORD;

    if (apiKey) {
      this.elasticsearch = new Client({
        node,
        auth: { apiKey },
      });
      return;
    }

    if (username && password) {
      this.elasticsearch = new Client({
        node,
        auth: { username, password },
      });
      return;
    }

    this.elasticsearch = new Client({ node });
  }

  async onModuleInit() {
    if (!this.elasticsearch) {
      return;
    }

    try {
      await this.ensureIndex();
      await this.syncUsers(true);
    } catch (error) {
      console.error('Failed to initialize Elasticsearch user index:', error);
    }
  }

  async searchUsers(query: string, limit = 20): Promise<SearchableUser[]> {
    const keyword = query.trim();
    if (!keyword) {
      return [];
    }

    if (!this.elasticsearch) {
      const users = await this.searchUsersFromDatabase(
        keyword,
        Math.max(limit * 4, 80),
      );
      return this.rankUsers(users, keyword, limit);
    }

    await this.syncUsers();

    try {
      const wildcardKeyword = this.escapeForWildcard(keyword.toLowerCase());
      const response = await this.elasticsearch.search<SearchUserDocument>({
        index: this.indexName,
        size: limit,
        query: {
          bool: {
            should: [
              {
                multi_match: {
                  query: keyword,
                  fields: ['nickname^5', 'email^4', 'searchText^3'],
                  type: 'bool_prefix',
                },
              },
              {
                multi_match: {
                  query: keyword,
                  fields: ['nickname^4', 'email^3'],
                  fuzziness: 'AUTO',
                  prefix_length: 1,
                  boost: 2,
                },
              },
              {
                match_phrase_prefix: {
                  nickname: {
                    query: keyword,
                    boost: 6,
                  },
                },
              },
              {
                match_phrase_prefix: {
                  email: {
                    query: keyword,
                    boost: 5,
                  },
                },
              },
              {
                wildcard: {
                  'nickname.keyword': {
                    value: `*${wildcardKeyword}*`,
                    case_insensitive: true,
                    boost: 4,
                  },
                },
              },
              {
                wildcard: {
                  'email.keyword': {
                    value: `*${wildcardKeyword}*`,
                    case_insensitive: true,
                    boost: 3,
                  },
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
      });

      const hits = response.hits?.hits ?? [];
      const users = hits
        .map((hit) => {
          const source = hit._source;
          if (!source) {
            return null;
          }
          return this.toSearchableUser(source);
        })
        .filter((user): user is SearchableUser => user !== null);

      if (users.length > 0) {
        return this.rankUsers(users, keyword, limit);
      }
    } catch (error) {
      console.error(
        'Elasticsearch user search failed. Falling back to DB search.',
        error,
      );
    }

    const users = await this.searchUsersFromDatabase(
      keyword,
      Math.max(limit * 4, 80),
    );
    return this.rankUsers(users, keyword, limit);
  }

  private async ensureIndex() {
    if (!this.elasticsearch) {
      return;
    }

    try {
      await this.elasticsearch.indices.create({
        index: this.indexName,
        settings: {
          analysis: {
            tokenizer: {
              user_autocomplete_ngram: {
                type: 'ngram',
                min_gram: 1,
                max_gram: 20,
                token_chars: ['letter', 'digit', 'punctuation', 'symbol'],
              },
            },
            analyzer: {
              user_autocomplete_index: {
                type: 'custom',
                tokenizer: 'user_autocomplete_ngram',
                filter: ['lowercase'],
              },
              user_autocomplete_search: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase'],
              },
            },
            normalizer: {
              user_lowercase_normalizer: {
                type: 'custom',
                filter: ['lowercase'],
              },
            },
          },
        },
        mappings: {
          properties: {
            id: { type: 'integer' },
            nickname: {
              type: 'text',
              analyzer: 'user_autocomplete_index',
              search_analyzer: 'user_autocomplete_search',
              fields: {
                keyword: {
                  type: 'keyword',
                  normalizer: 'user_lowercase_normalizer',
                },
              },
            },
            email: {
              type: 'text',
              analyzer: 'user_autocomplete_index',
              search_analyzer: 'user_autocomplete_search',
              fields: {
                keyword: {
                  type: 'keyword',
                  normalizer: 'user_lowercase_normalizer',
                },
              },
            },
            profileImageUrl: { type: 'keyword' },
            role: { type: 'keyword' },
            major: { type: 'keyword' },
            admission: { type: 'integer' },
            generation: { type: 'integer' },
            isGraduated: { type: 'boolean' },
            isAdmin: { type: 'boolean' },
            searchText: {
              type: 'text',
              analyzer: 'user_autocomplete_index',
              search_analyzer: 'user_autocomplete_search',
            },
          },
        },
      });
    } catch (error) {
      const errorType = (
        error as { meta?: { body?: { error?: { type?: string } } } }
      )?.meta?.body?.error?.type;
      if (errorType !== 'resource_already_exists_exception') {
        throw error;
      }
    }
  }

  private async syncUsers(force = false) {
    if (!this.elasticsearch) {
      return;
    }

    const now = Date.now();
    if (!force && now - this.lastSyncedAt < this.syncIntervalMs) {
      return;
    }

    if (this.syncPromise) {
      await this.syncPromise;
      return;
    }

    this.syncPromise = this.reindexAllUsers()
      .catch((error) => {
        console.error('Failed to sync Elasticsearch user index:', error);
      })
      .finally(() => {
        this.lastSyncedAt = Date.now();
        this.syncPromise = null;
      });

    await this.syncPromise;
  }

  private async reindexAllUsers() {
    if (!this.elasticsearch) {
      return;
    }

    const users = await this.searchUsersFromDatabase('', 100000);

    await this.elasticsearch.deleteByQuery({
      index: this.indexName,
      query: {
        match_all: {},
      },
      refresh: true,
      conflicts: 'proceed',
    });

    if (users.length === 0) {
      return;
    }

    const operations: Array<Record<string, unknown>> = [];
    users.forEach((user) => {
      operations.push({
        index: { _index: this.indexName, _id: String(user.id) },
      });
      operations.push(this.toDocument(user));
    });

    await this.elasticsearch.bulk({
      operations,
      refresh: true,
    });
  }

  private async searchUsersFromDatabase(
    query: string,
    limit: number,
  ): Promise<SearchableUser[]> {
    const keyword = query.trim();
    const where = keyword
      ? [{ nickname: ILike(`%${keyword}%`) }, { email: ILike(`%${keyword}%`) }]
      : undefined;

    return this.userRepository.find({
      where,
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImageUrl: true,
        role: true,
        major: true,
        admission: true,
        generation: true,
        isGraduated: true,
        isAdmin: true,
      },
      take: limit,
    });
  }

  private toDocument(user: SearchableUser): SearchUserDocument {
    return {
      ...user,
      searchText: `${user.nickname} ${user.email}`.trim(),
    };
  }

  private toSearchableUser(document: SearchUserDocument): SearchableUser {
    return {
      id: document.id,
      email: document.email,
      nickname: document.nickname,
      profileImageUrl: document.profileImageUrl ?? null,
      role: document.role,
      major: document.major,
      admission: document.admission,
      generation: document.generation,
      isGraduated: document.isGraduated,
      isAdmin: document.isAdmin,
    };
  }

  private escapeForWildcard(keyword: string) {
    return keyword.replace(/[\\*?]/g, '\\$&');
  }

  private rankUsers(
    users: SearchableUser[],
    query: string,
    limit: number,
  ): SearchableUser[] {
    const keyword = this.normalizeText(query);
    const deduped = new Map<number, SearchableUser>();
    users.forEach((user) => {
      deduped.set(user.id, user);
    });

    return [...deduped.values()]
      .sort((left, right) => {
        const scoreGap =
          this.getMatchScore(right, keyword) -
          this.getMatchScore(left, keyword);
        if (scoreGap !== 0) {
          return scoreGap;
        }
        return left.nickname.localeCompare(right.nickname, 'ko');
      })
      .slice(0, limit);
  }

  private getMatchScore(user: SearchableUser, keyword: string): number {
    if (!keyword) {
      return 0;
    }

    const nickname = this.normalizeText(user.nickname);
    const email = this.normalizeText(user.email);
    const emailId = email.split('@')[0] ?? '';

    let score = 0;

    if (nickname === keyword) {
      score += 1200;
    }
    if (email === keyword) {
      score += 1100;
    }
    if (emailId === keyword) {
      score += 1050;
    }

    if (nickname.startsWith(keyword)) {
      score += 900;
    }
    if (email.startsWith(keyword)) {
      score += 760;
    }
    if (emailId.startsWith(keyword)) {
      score += 700;
    }

    if (nickname.includes(keyword)) {
      score += 500;
    }
    if (email.includes(keyword)) {
      score += 420;
    }
    if (emailId.includes(keyword)) {
      score += 360;
    }

    score -= Math.min(nickname.length, 120);
    score -= Math.min(email.length, 120) * 0.2;

    return score;
  }

  private normalizeText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '');
  }
}
