import { Module } from "src/module/entities/module.entity"
import { UserProgress } from "src/users/entities/user-progress.entity"
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    OneToMany,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
  } from "typeorm"

  
  @Entity("lessons")
  export class Lesson {
    @PrimaryGeneratedColumn("uuid")
    id: string
  
    @Column({ length: 255 })
    title: string
  
    @Column({ type: "text" })
    content: string
  
    @Column({ default: "text" })
    type: string // text, video, quiz, etc.
  
    @Column({ nullable: true })
    videoUrl: string
  
    @Column()
    order: number
  
    @Column({ default: 0 })
    durationInMinutes: number
  
    @CreateDateColumn()
    createdAt: Date
  
    @UpdateDateColumn()
    updatedAt: Date
  
    // Many-to-One relationship
    @ManyToOne(
      () => Module,
      (module) => module.lessons,
      { nullable: false, onDelete: "CASCADE" },
    )
    @Index()
    module: Module
  
    // One-to-Many relationship
    @OneToMany(
      () => UserProgress,
      (progress) => progress.lesson,
    )
    userProgress: UserProgress[]
  }
  
  