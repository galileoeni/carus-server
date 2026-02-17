# Migration Command
`yarn run typeorm migration:generate Init -d src/data-source.ts -o src/migrations`

Account Management

1. Get Account Details

Method: GET
Path: /api/v1/account
Description: Retrieves the authenticated user's profile and wallet information. 2. Edit User Profile

Method: PUT
Path: /api/v1/account/edit
Description: Updates the authenticated user's profile. You can send any combination of the fields below. To upload a profile picture, send it as form-data with the key avatar.
Request Body (form-data):
avatar: (file) The user's new profile picture.
username: (text) The user's new username.
first_name: (text) The user's first name.
last_name: (text) The user's last name.
phone: (text) The user's phone number.
address: (text) The user's address.
region: (text) The user's region.
city: (text) The user's city. 3. Change Password

Method: PUT
Path: /api/v1/account/change-password
Description: Allows an authenticated user (who did not sign up with Google) to change their password.
Request Body (json):
{
"oldPassword": "current-password",
"newPassword": "your-new-strong-password",
"confirmPassword": "your-new-strong-password"
} 4. Lodge a Complaint

Method: POST
Path: /api/v1/account/lodge-complaint
Description: Submits a message to the help and complaint system.
Request Body (json):
{
"message": "I am having an issue with..."
}
Schedule Management 5. Create a Schedule (Pickup/Dropoff)

Method: POST
Path: /api/v1/schedule/pickup
Description: Creates a new schedule for material pickup or dropoff. To include an image, send it as form-data.
Request Body (form-data):
material: (text) e.g., "plastic"
material_amount: (text) e.g., 150
container_amount: (text) e.g., 5
date: (text) e.g., "2024-12-31"
address: (text) "123 Main St, Anytown"
category: (text) "pickup" or "dropoff"
image: (file) An optional image for the schedule. 6. Get All Schedules

Method: GET
Path: /api/v1/schedule
Description: Retrieves a list of all schedules for the authenticated user. 7. Get Schedule by ID

Method: GET
Path: /api/v1/schedule/:id
Description: Retrieves a single schedule by its unique ID.
Path Parameters:
id: The UUID of the schedule. 8. Update Schedule Status

Method: PUT
Path: /api/v1/schedule/:id
Description: Allows a user to update the status of their own schedule (e.g., to 'cancelled').
Path Parameters:
id: The UUID of the schedule.
Request Body (json):
{
"status": "cancelled"
} 9. Delete Schedule by ID

Method: DELETE
Path: /api/v1/schedule/:id
Description: Deletes a schedule that belongs to the authenticated user.
Path Parameters:
id: The UUID of the schedule to delete.
Wallet & Transactions 10. Get Wallet Details

Method: GET
Path: /api/v1/wallet
Description: Retrieves the authenticated user's wallet balance and point conversion rate. 11. Get All Transactions

Method: GET
Path: /api/v1/transactions
Description: Retrieves a list of all transactions for the authenticated user.
Donations 12. Get All Donation Campaigns

Method: GET
Path: /api/v1/donation/campaigns
Description: Retrieves a list of all active donation campaigns. 13. Get Donation Campaign by ID

Method: GET
Path: /api/v1/donation/campaigns/:id
Description: Retrieves a single donation campaign by its unique ID.
Path Parameters:
id: The UUID of the donation campaign. 14. Create a Contribution

Method: POST
Path: /api/v1/donation/contribute
Description: Allows a user to contribute to a donation campaign.
Request Body (json):
{
"campaignId": "uuid-of-the-campaign",
"amount": 500
}
Redemptions 15. Redeem Points for Airtime

Method: POST
Path: /api/v1/redeem/airtime
Description: Redeems a specified number of points for airtime.
Request Body (json):
{
"points": 1000,
"phone": "08012345678"
} 16. Redeem Points for Cash

Method: POST
Path: /api/v1/redeem/cash
Description: Redeems a specified number of points for cash, transferred to the user's bank.
Request Body (json):
{
"points": 2000,
"bank_name": "Example Bank",
"account_number": "1234567890"
}

---

## For Admin

Authentication

1. Admin Login

Method: POST
Path: /api/v1/admin/login
Description: Authenticates an admin user and returns access and refresh tokens.
Request Body:
{
"identifier": "admin@example.com",
"password": "yourpassword"
}
Dashboard 2. Get Dashboard Data

Method: GET
Path: /api/v1/admin/dashboard
Description: Retrieves aggregate data for the admin dashboard, including user count, schedule count, and total wallet amount.
Headers: Requires Authorization token.
Admin & User Management 3. Create Admin

Method: POST
Path: /api/v1/admin/create-admin
Description: Creates a new user with the 'admin' role.
Headers: Requires Authorization token.
Request Body:
{
"first_name": "New",
"last_name": "Admin",
"email": "newadmin@example.com",
"password": "a-strong-password",
"phone": "08012345678",
"gender": "Male",
"dob": "1990-01-01",
"country_code": "NG"
}

4. Assign Admin Role

Method: PATCH
Path: /api/v1/admin/assign-admin/:id
Description: Assigns the 'admin' role to an existing user.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the user to promote. 5. Remove Admin Role

Method: PATCH
Path: /api/v1/admin/remove-admin/:id
Description: Removes the 'admin' role from a user, demoting them to a regular 'user'.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the admin to demote. 6. Toggle User Status (Enable/Disable)

Method: PATCH
Path: /api/v1/admin/toggle-user-status/:id
Description: Toggles a user's isDisabled status. If a user is disabled, they will be blocked from logging in.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the user to enable or disable. 7. Get All User Accounts

Method: GET
Path: /api/v1/admin/accounts
Description: Retrieves a paginated list of all users with the 'user' role.
Headers: Requires Authorization token.
Query Parameters (Optional):
page: The page number to retrieve (e.g., 1).
pageSize: The number of items per page (e.g., 10).
Password Management 8. Admin Forgot Password

Method: POST
Path: /api/v1/auth/forgot-password
Description: Sends a password reset link to an admin's email address.
Request Body:
{
"email": "admin@example.com"
}

9. Admin Reset Password

Method: POST
Path: /api/v1/auth/password/reset
Description: Resets the admin's password using the token from the reset email.
Request Body:
{
"token": "your-reset-token",
"newPassword": "your-new-strong-password"
}
Schedule Management 10. Accept Schedule

Method: PUT
Path: /api/v1/admin/schedule/accept/:id
Description: Marks a user's schedule as 'accepted'.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the schedule to accept. 11. Cancel Schedule

Method: PUT
Path: /api/v1/admin/schedule/cancel/:id
Description: Marks a user's schedule as 'missed'.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the schedule to cancel. 12. Fulfill Schedule

Method: POST
Path: /api/v1/admin/schedule/fulfill/:id
Description: Marks a schedule as 'completed' and credits the user's wallet.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the schedule to fulfill.
Request Body:
{
"material_amount": 100,
"material": "plastic"
} 13. Get All Schedules

Method: GET
Path: /api/v1/admin/schedules
Description: Retrieves a paginated list of all user schedules.
Headers: Requires Authorization token.
Query Parameters (Optional):
page: The page number to retrieve (e.g., 1).
pageSize: The number of items per page (e.g., 10).
Financial & Donations 14. Get Total Wallet Amount

Method: GET
Path: /api/v1/admin/total-wallet-amount
Description: Retrieves the sum of all naira_amount from all user wallets.
Headers: Requires Authorization token. 15. Get All Donations

Method: GET
Path: /api/v1/admin/donations
Description: Retrieves a list of all donation campaigns.
Headers: Requires Authorization token. 16. Get Donation by ID

Method: GET
Path: /api/v1/admin/donations/:id
Description: Retrieves a single donation campaign by its ID.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the donation campaign. 17. Get All Transactions

Method: GET
Path: /api/v1/admin/transactions
Description: Retrieves a paginated list of all transactions.
Headers: Requires Authorization token.
Query Parameters (Optional):
page: The page number to retrieve (e.g., 1).
pageSize: The number of items per page (e.g., 10).
Complaints 18. View Complaints

Method: GET
Path: /api/v1/admin/complaints
Description: Retrieves a paginated list of all complaints submitted by users.
Headers: Requires Authorization token.
Query Parameters (Optional):
page: The page number to retrieve (e.g., 1).
pageSize: The number of items per page (e.g., 10).

Campaign Management
19. Get All Campaigns
Method: GET
Path: /api/v1/donation/campaigns
Description: Retrieves a list of all donation campaigns.
Headers: Requires Authorization token.
20. Get Campaign by ID
Method: GET
Path: /api/v1/donation/campaigns/:id
Description: Retrieves a single donation campaign by its ID.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the donation campaign.
21. Create Campaign
Method: POST
Path: /api/v1/donation/campaigns
Description: Creates a new donation campaign.
Headers: Requires Authorization token.
Request Body (form-data):
image: (file) The campaign's image.
title: (text) The campaign's title.
description: (text) The campaign's description.
22. Update Campaign
Method: PUT
Path: /api/v1/donation/campaigns/:id
Description: Updates an existing donation campaign.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the donation campaign.
Request Body (form-data):
image: (file) The campaign's new image.
title: (text) The campaign's new title.
description: (text) The campaign's new description.
23. Delete Campaign
Method: DELETE
Path: /api/v1/donation/campaigns/:id
Description: Deletes a donation campaign.
Headers: Requires Authorization token.
Path Parameters:
id: The UUID of the donation campaign.

Configuration Management
24. Get Point to Naira Configuration
Method: GET
Path: /api/v1/admin/configurations/point-to-naira
Description: Retrieves the current point-to-naira conversion rate.
Headers: Requires Authorization token.
25. Set Point to Naira Configuration
Method: POST
Path: /api/v1/admin/configurations/point-to-naira
Description: Sets the point-to-naira conversion rate.
Headers: Requires Authorization token.
Request Body (json):
{
"value": 100
}
26. Create Configuration
Method: POST
Path: /api/v1/admin/configurations
Description: Creates a new configuration setting.
Headers: Requires Authorization token.
Request Body (json):
{
"type": "point_to_plastic",
"value": "0.5"
}
27. Update Configuration
Method: PUT
Path: /api/v1/admin/configurations/:type
Description: Updates an existing configuration setting by its type, or creates it if it does not exist.
Headers: Requires Authorization token.
Path Parameters:
type: The type of configuration to update (e.g., 'point_to_naira').
Request Body (json):
{
"value": "0.6"
}

# Newly added endpoints
1. Get All Redemptions
Method: GET
Endpoint: /api/v1/admin/redemptions
Description: Retrieves a paginated list of all redemption requests.
Sample Request:
curl --location --request GET 'http://localhost:5000/api/v1/admin/redemptions?page=1&pageSize=10' \
--header 'Authorization: Bearer <your_admin_token>'
Sample Response:
{
  "status_code": 200,
  "data": [
    {
      "id": "cbb3c276-8f35-4c42-992a-3a131336c9a6",
      "points": 100,
      "status": "pending",
      "type": "cash",
      "user": {
        "id": "a1b2c3d4-e5f6-7890-1234-567890abcdef",
        "email": "user@example.com"
      }
    }
  ],
  "errors": [],
  "message": "Success",
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "pageSize": 10,
    "totalCount": 1
  }
}
2. Approve a Redemption
Method: PUT
Endpoint: /api/v1/admin/redemptions/approve/:id
Description: Approves a pending redemption request.
Sample Request:
curl --location --request PUT 'http://localhost:5000/api/v1/admin/redemptions/approve/cbb3c276-8f35-4c42-992a-3a131336c9a6' \
--header 'Authorization: Bearer <your_admin_token>'
Sample Response:
{
  "status_code": 200,
  "data": {},
  "errors": [],
  "message": "Redemption approved"
}
3. Decline a Redemption
Method: PUT
Endpoint: /api/v1/admin/redemptions/decline/:id
Description: Declines a pending redemption request and refunds the points to the user.
Sample Request:
curl --location --request PUT 'http://localhost:5000/api/v1/admin/redemptions/decline/cbb3c276-8f35-4c42-992a-3a131336c9a6' \
--header 'Authorization: Bearer <your_admin_token>'
Sample Response:
{
  "status_code": 200,
  "data": {},
  "errors": [],
  "message": "Redemption declined"
}

# Notifications

## User Endpoints

### 1. Get All Notifications
- **Method:** GET
- **Path:** `/api/v1/account/notifications`
- **Description:** Retrieves a paginated list of notifications for the authenticated user and the unread count.
- **Query Parameters:**
  - `page`: (optional) Page number (default: 1)
  - `pageSize`: (optional) Items per page (default: 10)
- **Sample Request:**
  `curl --location --request GET 'http://localhost:5000/api/v1/account/notifications?page=1&pageSize=10' --header 'Authorization: Bearer <token>'`
- **Sample Response:**
```json
{
  "status_code": 200,
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "title": "Welcome to Carus!",
        "message": "Hi John, welcome to Carus. We are glad to have you on board.",
        "type": "welcome",
        "isRead": false,
        "createdAt": "2024-05-20T10:00:00.000Z"
      }
    ],
    "unreadCount": 1
  },
  "errors": [],
  "message": "Success",
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "pageSize": 10,
    "totalCount": 1
  }
}
```

### 2. Mark Notification as Read
- **Method:** PATCH
- **Path:** `/api/v1/account/notifications/:id/read`
- **Description:** Marks a specific notification as read.
- **Sample Request:**
  `curl --location --request PATCH 'http://localhost:5000/api/v1/account/notifications/550e8400-e29b-41d4-a716-446655440000/read' --header 'Authorization: Bearer <token>'`
- **Sample Response:**
```json
{
  "status_code": 200,
  "data": {},
  "errors": [],
  "message": "Notification marked as read"
}
```

### 3. Update FCM Token
- **Method:** POST
- **Path:** `/api/v1/account/notifications/token`
- **Description:** Updates the user's FCM token for push notifications.
- **Request Body:**
```json
{
  "token": "your-fcm-token-here"
}
```
- **Sample Response:**
```json
{
  "status_code": 200,
  "data": {},
  "errors": [],
  "message": "FCM token updated successfully"
}
```

## Admin Endpoints

### 1. Send Broadcast Notification
- **Method:** POST
- **Path:** `/api/v1/admin/notifications/push`
- **Description:** Sends a push notification announcement to all users.
- **Request Body:**
```json
{
  "title": "System Update",
  "message": "The system will be down for maintenance at midnight."
}
```
- **Sample Response:**
```json
{
  "status_code": 200,
  "data": {},
  "errors": [],
  "message": "Broadcast notification sent successfully"
}
```

## Socket.io Implementation

### Connection & Authentication
Clients should connect to the root namespace. After connection, they **must** authenticate to receive private notifications.

- **Event:** `authenticate`
- **Direction:** Client -> Server
- **Data:** `"<your_jwt_access_token>"`
- **Description:** Validates the user's session.

- **Event:** `authenticated`
- **Direction:** Server -> Client
- **Data:** `{ "success": true }` or `{ "success": false, "message": "..." }`

### Receiving Notifications
- **Event:** `notification`
- **Direction:** Server -> Client
- **Data:** Notification object (see Get All Notifications response).
