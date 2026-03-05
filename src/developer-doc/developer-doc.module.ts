import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeveloperDocController } from './developer-doc.controller';
import { DeveloperDocService } from './developer-doc.service';
import { DeveloperDoc } from './entities/developer-doc.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DeveloperDoc])],
  controllers: [DeveloperDocController],
  providers: [DeveloperDocService],
  exports: [DeveloperDocService],
})
export class DeveloperDocModule {}
