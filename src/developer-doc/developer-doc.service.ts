import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  CreateDeveloperDocDto,
  DeveloperDocResponseDto,
  UpdateDeveloperDocDto,
} from './dto/developer-doc.dto';
import { DeveloperDoc } from './entities/developer-doc.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class DeveloperDocService {
  constructor(
    @InjectRepository(DeveloperDoc)
    private readonly developerDocRepository: Repository<DeveloperDoc>,
  ) {}

  async create(createDeveloperDocDto: CreateDeveloperDocDto, user: User): Promise<DeveloperDoc> {
    const doc = this.developerDocRepository.create({
      ...createDeveloperDocDto,
      userId: user.id,
    });

    return this.developerDocRepository.save(doc);
  }

  async findAll(includeUnpublished = false): Promise<DeveloperDoc[]> {
    const queryBuilder = this.developerDocRepository
      .createQueryBuilder('doc')
      .leftJoinAndSelect('doc.user', 'user')
      .orderBy('doc.createdAt', 'DESC');

    if (!includeUnpublished) {
      queryBuilder.where('doc.isPublished = :isPublished', { isPublished: true });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<DeveloperDoc> {
    const doc = await this.developerDocRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!doc) {
      throw new NotFoundException(`Developer document with ID ${id} not found`);
    }

    return doc;
  }

  async update(id: number, updateDeveloperDocDto: UpdateDeveloperDocDto): Promise<DeveloperDoc> {
    const doc = await this.findOne(id);

    const updatedDoc = {
      ...doc,
      ...updateDeveloperDocDto,
    };

    return this.developerDocRepository.save(updatedDoc);
  }

  async remove(id: number): Promise<void> {
    const doc = await this.findOne(id);
    await this.developerDocRepository.remove(doc);
  }

  toResponseDto(doc: DeveloperDoc): DeveloperDocResponseDto {
    return {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      isPublished: doc.isPublished,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      author: doc.user
        ? {
            id: doc.user.id,
            nickname: doc.user.nickname,
          }
        : undefined,
    };
  }
}
