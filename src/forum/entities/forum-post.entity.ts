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
  import { ForumTopic } from "./forum-topic.entity"
  import { ForumComment } from "./forum-comment.entity"
import { User } from "src/users/entities/user.entity"
  
  @Entity("forum_posts")
  export class ForumPost {
    @PrimaryGeneratedColumn("uuid")
    id: string
  
    @Column({ type: "text" })
    content: string
  
    @Column({ default: 0 })
    likes: number
  
    @CreateDateColumn()
    createdAt: Date
  
    @UpdateDateColumn()
    updatedAt: Date
  
    // Many-to-One relationships
    @ManyToOne(
      () => User,
      (user) => user.forumPosts,
      { nullable: false },
    )
    @Index()
    author: User
  
    @ManyToOne(
      () => ForumTopic,
      (topic) => topic.posts,
      { nullable: false, onDelete: "CASCADE" },
    )
    @Index()
    topic: ForumTopic
  
    // One-to-Many relationship
    @OneToMany(
      () => ForumComment,
      (comment) => comment.post,
    )
    comments: ForumComment[]
  }
  
  