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
  import { ForumCategory } from "./forum-category.entity"
  import { ForumPost } from "./forum-post.entity"
  
  @Entity("forum_topics")
  export class ForumTopic {
    @PrimaryGeneratedColumn("uuid")
    id: string
  
    @Column({ length: 255 })
    title: string
  
    @Column({ default: false })
    isPinned: boolean
  
    @Column({ default: false })
    isClosed: boolean
  
    @CreateDateColumn()
    createdAt: Date
  
    @UpdateDateColumn()
    updatedAt: Date
  
    // Many-to-One relationship
    @ManyToOne(
      () => ForumCategory,
      (category) => category.topics,
      { nullable: false },
    )
    @Index()
    category: ForumCategory
  
    // One-to-Many relationship
    @OneToMany(
      () => ForumPost,
      (post) => post.topic,
    )
    posts: ForumPost[]
  }
  
  