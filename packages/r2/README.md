# @mulai-plus/r2

Cloudflare R2 Storage client for the Mulai Plus application.

## Features

- **Server-side uploads**: Upload files directly from the server using the AWS SDK
- **Presigned URLs**: Generate presigned URLs for private file access
- **File deletion**: Delete files from R2
- **Batch operations**: Delete multiple files at once
- **Cleanup utilities**: Clean up orphaned files

## Environment Variables

Required environment variables in `.env`:

```env
# Cloudflare R2 Storage
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=mulai-plus-media
R2_PUBLIC_URL=https://cdn.example.com
```

## API Endpoints

The package provides the following API endpoints (mounted at `/api/upload`):

| Method | Endpoint        | Description                                      |
| ------ | --------------- | ------------------------------------------------ |
| POST   | `/`             | Upload a file to R2                              |
| POST   | `/presign`      | Get a presigned URL (requires Cloudflare Worker) |
| DELETE | `/`             | Delete a file from R2                            |
| POST   | `/download-url` | Get a presigned download URL for private files   |

## Usage

### Server-side Upload

```typescript
import { uploadToR2, deleteFromR2 } from "@mulai-plus/r2/server";

// Upload a file
const result = await uploadToR2(buffer, {
  filename: "image.jpg",
  mimeType: "image/jpeg",
  path: "cms/articles",
});

// Delete a file
await deleteFromR2(result.key);
```

### Using the API (Client-side)

```typescript
// Upload a file
const formData = new FormData();
formData.append("file", file);

const response = await fetch("/api/upload", {
  method: "POST",
  body: formData,
});

const result = await response.json();
// { url: "...", key: "...", filename: "...", size: ..., mimeType: "..." }
```

## R2 Setup

### 1. Create an R2 Bucket

1. Go to the Cloudflare Dashboard > R2
2. Create a new bucket (e.g., `mulai-plus-media`)
3. Note the bucket name

### 2. Create an API Token

1. Go to My Profile > API Tokens
2. Create a custom token with:
   - **Account Permissions**: None required
   - **Bucket Permissions**:
     - `mulai-plus-media`: Read, Write, Delete

### 3. Configure Custom Domain (Optional)

1. In R2 bucket settings, add a custom domain
2. Configure DNS CNAME record
3. Set `R2_PUBLIC_URL` to your custom domain

### 4. CORS Configuration

Add CORS rules to your R2 bucket to allow uploads from your domains:

```json
[
  {
    "AllowedOrigins": ["https://your-domain.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"]
  }
]
```

## License

Internal - Mulai Plus
