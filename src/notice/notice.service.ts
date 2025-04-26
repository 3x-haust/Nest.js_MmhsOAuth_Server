import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notice } from './entities/notice.entity';
import {
  CreateNoticeDto,
  UpdateNoticeDto,
  NoticeResponseDto,
} from './dto/notice.dto';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NoticeService {
  constructor(
    @InjectRepository(Notice)
    private noticeRepository: Repository<Notice>,
  ) {}

  async create(createNoticeDto: CreateNoticeDto, user: User): Promise<Notice> {
    const notice = this.noticeRepository.create({
      ...createNoticeDto,
      userId: user.id,
    });
    return this.noticeRepository.save(notice);
  }

  async findAll(includeInactive = false): Promise<Notice[]> {
    const queryBuilder = this.noticeRepository
      .createQueryBuilder('notice')
      .leftJoinAndSelect('notice.user', 'user')
      .orderBy('notice.createdAt', 'DESC');

    if (!includeInactive) {
      queryBuilder.where('notice.isActive = :isActive', { isActive: true });
    }

    return queryBuilder.getMany();
  }

  async findOne(id: number): Promise<Notice> {
    const notice = await this.noticeRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!notice) {
      throw new NotFoundException(`Notice with ID ${id} not found`);
    }

    return notice;
  }

  async update(id: number, updateNoticeDto: UpdateNoticeDto): Promise<Notice> {
    const notice = await this.findOne(id);

    const updatedNotice = {
      ...notice,
      ...updateNoticeDto,
    };

    return this.noticeRepository.save(updatedNotice);
  }

  async remove(id: number): Promise<void> {
    const notice = await this.findOne(id);
    await this.noticeRepository.remove(notice);
  }

  toResponseDto(notice: Notice): NoticeResponseDto {
    return {
      id: notice.id,
      title: notice.title,
      content: notice.content,
      isActive: notice.isActive,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
      author: notice.user
        ? {
            id: notice.user.id,
            nickname: notice.user.nickname,
          }
        : undefined,
    };
  }
}
