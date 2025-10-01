# Notifications Module

The Notifications module provides real-time WebSocket-based notifications for key learning events in the StrellerMinds platform. It implements JWT authentication, room-based scoping, and comprehensive event handling.

## Features

- **Real-time WebSocket Notifications**: Instant delivery of notifications via Socket.IO
- **JWT Authentication**: Secure WebSocket connections using JWT tokens
- **Room-based Scoping**: Per-user and per-course event targeting
- **Event-driven Architecture**: Integration with @nestjs/cqrs and EventEmitterModule
- **REST API**: Subscribe/unsubscribe endpoints for notification preferences
- **Performance Optimized**: Efficient database queries and connection management
- **Comprehensive Testing**: E2E tests for authentication and event delivery

## Architecture

### Core Components

1. **NotificationsGateway**: WebSocket gateway handling connections and real-time events
2. **NotificationsService**: Core business logic for notification management
3. **NotificationSubscriptionService**: User subscription management
4. **NotificationEventService**: Event analytics and performance tracking
5. **Event Handlers**: Domain event processors for different notification types
6. **REST Controllers**: HTTP endpoints for subscription management

### Database Design

#### NotificationEvent Entity
```typescript
{
  id: string;
  userId: string;
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  status: DeliveryStatus;
  deliveryChannels?: object;
  readAt?: Date;
  createdAt: Date;
}
```

#### NotificationSubscription Entity
```typescript
{
  id: string;
  userId: string;
  eventType: NotificationEventType;
  scope: SubscriptionScope;
  scopeId?: string;
  isActive: boolean;
  preferences?: object;
  createdAt: Date;
  updatedAt: Date;
}
```

## Event Types

- `COURSE_ENROLLMENT`: User enrolls in a course
- `COURSE_LESSON_PUBLISHED`: New lesson available in a course
- `QUIZ_GRADED`: Quiz results are available
- `LIVE_SESSION_STARTING`: Live session begins soon

## Scopes

- `USER`: Personal notifications (quiz grades, enrollments)
- `COURSE`: Course-wide notifications (lessons, live sessions)
- `GLOBAL`: Platform-wide notifications

## Usage

### WebSocket Connection

```typescript
import io from 'socket.io-client';

const socket = io('/ws', {
  auth: { token: 'your-jwt-token' },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to notifications');
});

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
});
```

### Joining Course Rooms

```typescript
socket.emit('notification:join_course', { courseId: 'course-123' }, (response) => {
  if (response.success) {
    console.log('Joined course notifications');
  }
});
```

### Marking Notifications as Read

```typescript
socket.emit('notification:mark_read', { notificationId: 'notification-123' });
```

### REST API Endpoints

#### Subscribe to Notifications
```http
POST /notifications/subscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventType": "COURSE_LESSON_PUBLISHED",
  "scope": "COURSE",
  "scopeId": "course-123",
  "preferences": {
    "realtime": true,
    "email": false,
    "push": false
  }
}
```

#### Unsubscribe from Notifications
```http
DELETE /notifications/unsubscribe
Authorization: Bearer <token>
Content-Type: application/json

{
  "eventType": "COURSE_LESSON_PUBLISHED",
  "scope": "COURSE",
  "scopeId": "course-123"
}
```

#### Get User Notifications
```http
GET /notifications?limit=20&offset=0&status=DELIVERED
Authorization: Bearer <token>
```

#### Get Notification Analytics
```http
GET /notifications/analytics?days=30
Authorization: Bearer <token>
```

## Event Emission

### From Domain Services

```typescript
@Injectable()
export class CourseService {
  constructor(private eventEmitter: EventEmitter2) {}

  async publishLesson(courseId: string, lessonData: any) {
    // Publish lesson logic...
    
    // Emit event for notifications
    this.eventEmitter.emit('course.lesson.published', {
      courseId,
      courseName: course.name,
      lessonId: lesson.id,
      lessonTitle: lesson.title,
    });
  }
}
```

### From Event Handlers

```typescript
@EventsHandler(CourseEnrollmentCompletedEvent)
export class CourseEnrollmentHandler implements IEventHandler<CourseEnrollmentCompletedEvent> {
  constructor(private eventEmitter: EventEmitter2) {}

  async handle(event: CourseEnrollmentCompletedEvent) {
    const payload = event.getPayload();
    
    this.eventEmitter.emit('course.enrollment.completed', {
      userId: payload.userId,
      courseId: payload.courseId,
      courseName: payload.courseName,
      enrollmentType: payload.enrollmentType,
    });
  }
}
```

## Performance Considerations

### Database Optimization
- Composite indexes on frequently queried columns
- Partitioning for high-volume notification tables
- Read replicas for analytics queries

### Connection Management
- Connection pooling for WebSocket connections
- Room-based message targeting to reduce bandwidth
- Heartbeat mechanism for connection health

### Caching Strategy
- Redis caching for user subscription data
- In-memory caching for frequently accessed course enrollment data
- Cache invalidation on subscription changes

## Security

### Authentication
- JWT token validation for all WebSocket connections
- Token extraction from multiple sources (auth, query, headers)
- User existence validation

### Authorization
- Room access control based on course enrollment
- User-scoped notification delivery
- Rate limiting on subscription changes

## Error Handling

### Connection Errors
- Graceful handling of authentication failures
- Automatic reconnection for client connections
- Connection timeout management

### Event Processing Errors
- Retry mechanism for failed event processing
- Dead letter queue for unprocessable events
- Comprehensive error logging and monitoring

## Testing

### E2E Tests
Run the comprehensive E2E test suite:

```bash
npm run test:e2e test/e2e/notifications/notifications.e2e-spec.ts
```

Test coverage includes:
- WebSocket authentication and authorization
- Room-based event scoping and delivery
- Real-time notification processing
- Error handling and edge cases
- Performance under load

### Unit Tests
```bash
npm run test src/notifications
```

## Monitoring and Analytics

### Health Metrics
- Connection count and health status
- Event delivery success rates
- Database query performance
- Error rates and types

### User Engagement
- Notification read rates by event type
- User subscription preferences
- Real-time vs batch delivery preferences

## Configuration

### Environment Variables
```env
# WebSocket Configuration
CORS_ORIGINS=http://localhost:3000,https://app.stellerminds.com
JWT_SECRET=your-jwt-secret

# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost:5432/stellerminds

# Redis Configuration (for scaling)
REDIS_URL=redis://localhost:6379
```

### Module Configuration
```typescript
@Module({
  imports: [
    NotificationsModule,
    // ... other modules
  ],
})
export class AppModule {}
```

## Deployment

### Scaling Considerations
- Horizontal scaling with Redis adapter for Socket.IO
- Database read replicas for analytics
- CDN for static notification assets

### Production Checklist
- [ ] Configure CORS origins for production domains
- [ ] Set up Redis for multi-instance deployments
- [ ] Configure database connection pooling
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting
- [ ] Configure SSL/TLS for WebSocket connections

## Troubleshooting

### Common Issues

#### Connection Failures
```
Error: Authentication token required
```
**Solution**: Ensure JWT token is provided in auth, query, or Authorization header.

#### Room Access Denied
```
Error: Not enrolled in course
```
**Solution**: Verify user enrollment in the course before attempting to join room.

#### High Memory Usage
**Solution**: Implement connection limits and cleanup inactive connections.

### Debug Mode
Enable debug logging:
```typescript
const logger = new Logger('NotificationsGateway');
logger.debug('Debug message');
```

## Future Enhancements

- Push notification support (FCM, APNS)
- Email notification templates
- Notification batching and digest emails
- Advanced analytics and reporting
- A/B testing for notification content
- Multi-language support
- Rich media notifications

## Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility for client integrations
5. Performance test any changes that affect event delivery

## License

This module is part of the StrellerMinds platform and follows the project's licensing terms.
