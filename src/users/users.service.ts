import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Role } from 'src/role/roles.enum';
import { UserRole } from './enums/user-role.enum';
// import { Role } from '@/roles/enums/user-role.enum'; // Add this import

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    private readonly cloudinaryService: CloudinaryService,
  ) {}

  public async create(
    createUsersDto: CreateUsersDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    try {
      const existingUser = await this.userRepo.findOne({
        where: { email: createUsersDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already exists');
      }

      if (file) {
        const uploadResult = await this.cloudinaryService.uploadImage(file);
        createUsersDto.profileImageUrl = uploadResult.secure_url;
      }

      const user = this.userRepo.create(createUsersDto);

      // ✅ Set role: if not provided, default to STUDENT
      user.role = createUsersDto.role === Role.STUDENT ? Role.STUDENT : createUsersDto.role ?? Role.STUDENT;

      return await this.userRepo.save(user);
    } catch (error) {
      throw new InternalServerErrorException('Error creating user');
    }
  }

  public async findAll(): Promise<User[]> {
    try {
      return await this.userRepo.find();
    } catch (error) {
      throw new InternalServerErrorException('Error fetching users');
    }
  }

  public async findOne(id: string): Promise<User> {
    try {
      const user = await this.userRepo.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      throw new InternalServerErrorException('Error fetching user');
    }
  }

  public async update(
    id: string,
    updateUserDto: updateUsersDto,
  ): Promise<User> {
    try {
      await this.findOne(id);
      await this.userRepo.update(id, updateUserDto);
      return await this.findOne(id);
    } catch (error) {
      throw new InternalServerErrorException('Error updating user');
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const result = await this.userRepo.delete(id);
      if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
    } catch (error) {
      throw new InternalServerErrorException('Error deleting user');
    }
  }
}
