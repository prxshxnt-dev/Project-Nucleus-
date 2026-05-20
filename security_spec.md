# Security Specification

## Data Invariants
1. `users`: An authenticated user can read their own data. Only admins/superadmins can read other users' data or modify roles. A user can create their profile but defaults to "student" and "free" plan.
2. `materials`: Any authenticated user can list/view materials (but the client UI limits access based on plan). Only admins can create/update/delete materials.

## Dirty Dozen Payloads
1. User spoofing: Creating a user profile for a different UID.
2. Role escalation: A student tries to update their role to 'admin'.
3. Plan escalation: A student tries to update their planId to 'premium'.
4. Ghost field: Adding `isAdmin: true` to user creation.
5. Missing required field: Creating a material without `requiredPlan`.
6. Invalid type: Setting `type` to "random" for a material.
7. Admin action by student: Student deleting a material.
8. Unauthorized user profile view: Student reading another student's profile.
9. Invalid material URL size: URL > 1000 chars.
10. System field tampering: Updating `createdAt` during update.
11. Update gap: Updating Material without validation of all fields.
12. Unverified email: User attempting to create a profile without a verified email (Note: Google sign-in guarantees verified email generally).

## Test Runner Logic
Tested through manual red-team auditing and ESLint.
