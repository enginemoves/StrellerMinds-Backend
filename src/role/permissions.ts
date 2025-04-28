
import { Role } from "./roles.enum";

export const Permissions = {
  [Role.STUDENT]: ['read_courses', 'enroll_course'],
  [Role.MENTOR]: ['create_course', 'manage_students'],
  [Role.ADMIN]: ['manage_roles', 'manage_users', 'full_access'],
};
