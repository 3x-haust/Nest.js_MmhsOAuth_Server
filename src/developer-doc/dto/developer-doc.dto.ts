import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDeveloperDocDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}

export class UpdateDeveloperDocDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

export class DeveloperDocResponseDto {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: number;
    nickname: string;
  };
}
