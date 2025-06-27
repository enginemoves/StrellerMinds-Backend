import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Progress {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: number;

    @Column()
    lessonId: number;

    @Column({ default: false })
    completed: boolean;

    @Column({ type: 'float', nullable: true })
    score: number;

    @Column({ type: 'int', nullable: true })
    timeSpent: number; // in seconds

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    updatedAt: Date;
}