import { Injectable } from '@nestjs/common';

@Injectable()
export class ProgressService {
    private userProgress = new Map<number, Set<number>>();

    completeLesson(userId: number, lessonId: number) {
        if (!this.userProgress.has(userId)) {
            this.userProgress.set(userId, new Set());
        }
        this.userProgress.get(userId).add(lessonId);
    }

    getCompletionPercentage(userId: number, totalLessons: number): number {
        if (!this.userProgress.has(userId)) return 0;
        return (this.userProgress.get(userId).size / totalLessons) * 100;
    }

    getProgressData(userId: number, totalLessons: number) {
        return {
            userId,
            completedLessons: Array.from(this.userProgress.get(userId) || []),
            completionPercentage: this.getCompletionPercentage(userId, totalLessons),
        };
    }
}
