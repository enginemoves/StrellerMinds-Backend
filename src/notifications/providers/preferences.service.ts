import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@Injectable()
export class PreferenceService {
  constructor(
    @InjectRepository(NotificationPreference)
    private prefRepo: Repository<NotificationPreference>,
  ) {}

  async getOrCreate(userId: string): Promise<NotificationPreference> {
    let pref = await this.prefRepo.findOne({ where: { userId } });

    if (!pref) {
      pref = this.prefRepo.create({ userId });
      await this.prefRepo.save(pref);
    }

    return pref;
  }

  async updatePreferences(
  userId: string,
  data: UpdatePreferencesDto
): Promise<NotificationPreference>
 {
    const pref = await this.getOrCreate(userId);

    // // If 'preferences' is provided in data, merge it deeply instead of overwriting completely
    // if (data.preferences) {
    //   pref.preferences = {
    //     ...pref.preferences,
    //     ...data.preferences,
    //   };
    // }

    // Merge all other fields (except 'preferences', which is handled above)
    Object.assign(pref, { ...data, preferences: undefined });

    return this.prefRepo.save(pref);
  }
}
