# Helena Fit API Documentation

Base URL: `http://localhost:3000/api`

## Authentication

### Login (Telegram)

```http
POST /auth/telegram
Content-Type: application/json

{
  "initData": "telegram_init_data_string"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "user": {
    "id": "uuid",
    "telegramId": "123456789",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Login (Admin)

```http
POST /auth/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "jwt_token",
  "admin": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@helenafit.uz",
    "role": "SUPER_ADMIN"
  }
}
```

## Users

All endpoints require JWT authentication.

### Get Current User Profile

```http
GET /users/me
Authorization: Bearer {token}
```

### Get User Access

```http
GET /users/me/access
Authorization: Bearer {token}
```

**Response:**
```json
{
  "workouts": [
    {
      "id": "uuid",
      "title": "Программа для начинающих",
      "coverImage": "/uploads/image.jpg"
    }
  ],
  "recipes": [...]
}
```

### Get User Transactions

```http
GET /users/me/transactions
Authorization: Bearer {token}
```

## Workouts

### Get Workout Collections

```http
GET /workouts
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Программа для начинающих",
    "description": "Описание",
    "coverImage": "/uploads/image.jpg",
    "price": 150000,
    "discount": 20,
    "discountType": "PERCENTAGE",
    "finalPrice": 120000,
    "workoutCount": 10,
    "hasAccess": false
  }
]
```

### Get Workout Collection Details

```http
GET /workouts/{id}
Authorization: Bearer {token}
```

## Recipes

### Get Recipe Collections

```http
GET /recipes
Authorization: Bearer {token}
```

### Get Recipe Collection Details

```http
GET /recipes/{id}?category=BREAKFAST
Authorization: Bearer {token}
```

### Get Recipe Details

```http
GET /recipes/{collectionId}/recipe/{recipeId}
Authorization: Bearer {token}
```

## News

### Get News Feed

```http
GET /news?page=1&limit=10
```

**Response:**
```json
{
  "items": [...],
  "total": 50,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

### Get News by ID

```http
GET /news/{id}
```

## Admin - Users

All admin endpoints require JWT authentication with admin role.

### Get All Users

```http
GET /admin/users?search=telegram_id&status=ACTIVE
Authorization: Bearer {admin_token}
```

### Create User

```http
POST /admin/users
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "telegramId": "123456789"
}
```

### Get User Access

```http
GET /admin/users/{id}/access
Authorization: Bearer {admin_token}
```

### Update User Access

```http
PUT /admin/users/{id}/access
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "workoutIds": ["uuid1", "uuid2"],
  "recipeIds": ["uuid3", "uuid4"]
}
```

### Delete User

```http
DELETE /admin/users/{id}
Authorization: Bearer {admin_token}
```

## Admin - Workouts

### Get All Workout Collections

```http
GET /admin/workouts/collections
Authorization: Bearer {admin_token}
```

### Create Workout Collection

```http
POST /admin/workouts/collections
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Новая программа",
  "description": "Описание",
  "coverImage": "/uploads/image.jpg",
  "price": 150000,
  "discount": 0,
  "discountType": "PERCENTAGE",
  "order": 1
}
```

### Update Workout Collection

```http
PUT /admin/workouts/collections/{id}
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Обновленное название",
  "price": 120000
}
```

### Delete Workout Collection

```http
DELETE /admin/workouts/collections/{id}
Authorization: Bearer {admin_token}
```

### Create Workout

```http
POST /admin/workouts/collections/{collectionId}/workouts
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Разминка",
  "description": "Описание",
  "coverImage": "/uploads/image.jpg",
  "calories": 150,
  "duration": 15,
  "rutubeUrl": "https://rutube.ru/video/...",
  "order": 1
}
```

### Reorder Workouts

```http
PUT /admin/workouts/collections/{collectionId}/reorder
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "workoutIds": ["uuid1", "uuid2", "uuid3"]
}
```

## Admin - Recipes

Similar structure to Workouts endpoints.

### Create Recipe

```http
POST /admin/recipes/collections/{collectionId}/recipes
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Овсяная каша",
  "category": "BREAKFAST",
  "cookingTime": 10,
  "ingredients": [
    { "name": "Овсяные хлопья", "amount": "50г" },
    { "name": "Молоко", "amount": "200мл" }
  ],
  "instructions": "1. Залить овсяные хлопья молоком...",
  "caloriesPer100g": 120,
  "proteinPer100g": 4.5,
  "fatPer100g": 3.2,
  "carbsPer100g": 18.5,
  "caloriesPerServing": 350,
  "proteinPerServing": 12.0,
  "fatPerServing": 8.5,
  "carbsPerServing": 55.0
}
```

## Admin - News

### Get All News

```http
GET /admin/news
Authorization: Bearer {admin_token}
```

### Create News

```http
POST /admin/news
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "title": "Специальное предложение!",
  "content": "Полный текст новости...",
  "excerpt": "Краткое описание",
  "bannerImage": "/uploads/banner.jpg",
  "status": "PUBLISHED",
  "publishedAt": "2024-01-01T00:00:00Z",
  "workoutCollectionIds": ["uuid1"],
  "recipeCollectionIds": []
}
```

## Upload

### Upload Image

```http
POST /upload/image
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "url": "/uploads/abc123.jpg",
  "filename": "abc123.jpg"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Admin access required"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```
