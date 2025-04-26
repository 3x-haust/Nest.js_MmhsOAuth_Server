import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { ResponseStrategy } from '../shared/strategies/response.strategy';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private responseStrategy: ResponseStrategy,
  ) {}

  async getAllUsers() {
    const users = await this.userRepository.find({
      order: { id: 'ASC' },
    });

    return this.responseStrategy.success(
      '사용자 목록을 성공적으로 가져왔습니다.',
      users,
    );
  }

  async getUserById(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    return this.responseStrategy.success(
      '사용자 정보를 성공적으로 가져왔습니다.',
      user,
    );
  }

  async updateUser(id: number, updateData: Partial<User>) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateData.email },
      });
      if (existingUser) {
        return this.responseStrategy.badRequest('이미 사용 중인 이메일입니다.');
      }
    }

    if (updateData.nickname && updateData.nickname !== user.nickname) {
      const existingUser = await this.userRepository.findOne({
        where: { nickname: updateData.nickname },
      });
      if (existingUser) {
        return this.responseStrategy.badRequest('이미 사용 중인 닉네임입니다.');
      }
    }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(user, updateData);
    const updatedUser = await this.userRepository.save(user);

    return this.responseStrategy.success(
      '사용자 정보가 성공적으로 업데이트되었습니다.',
      updatedUser,
    );
  }

  async deleteUser(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      return this.responseStrategy.notFound('사용자를 찾을 수 없습니다.');
    }

    await this.userRepository.remove(user);

    return this.responseStrategy.success('사용자가 성공적으로 삭제되었습니다.');
  }
}
