import { Injectable } from '@nestjs/common';

/**
 * Service for tracking and calculating user lesson progress.
 */
@Injectable()
export class ProgressService {
    private userProgress = new Map<number, Set<number>>();

    /**
     * Mark a lesson as completed for a user.
     * @param userId - The ID of the user.
     * @param lessonId - The ID of the lesson to be marked as completed.
     */
    completeLesson(userId: number, lessonId: number) {
        if (!this.userProgress.has(userId)) {
            this.userProgress.set(userId, new Set());
        }
        this.userProgress.get(userId).add(lessonId);
    }

    /**
     * Get the completion percentage of lessons for a user.
     * @param userId - The ID of the user.
     * @param totalLessons - The total number of lessons available.
     * @returns The completion percentage as a number.
     */
    getCompletionPercentage(userId: number, totalLessons: number): number {
        if (!this.userProgress.has(userId)) return 0;
        return (this.userProgress.get(userId).size / totalLessons) * 100;
    }

    /**
     * Get the progress data for a user, including completed lessons and completion percentage.
     * @param userId - The ID of the user.
     * @param totalLessons - The total number of lessons available.
     * @returns An object containing the user's ID, an array of completed lessons, and the completion percentage.
     */
    getProgressData(userId: number, totalLessons: number) {
        return {
            userId,
            completedLessons: Array.from(this.userProgress.get(userId) || []),
            completionPercentage: this.getCompletionPercentage(userId, totalLessons),
        };
    }
}
