# Manus Support Ticket: CloudFront/S3 Storage Access Issue

## Summary
All media files (images, videos, logos) stored in CloudFront/S3 are returning **403 Forbidden** errors after publishing the site. This issue started immediately after the most recent publish operation.

## Project Details
- **Project Name**: dronemapp-v2 (Drone Mapping Project Manager / MapIt)
- **Project ID**: FiS5WF2NaftJTm6fu3BYQb
- **User**: Clay Bechtol
- **Date Issue Started**: January 31, 2026 (after publish)

## Issue Description
1. All CloudFront URLs for stored media return HTTP 403 Forbidden
2. This affects ALL files - both old uploads and new uploads made after the issue started
3. The storage API's `downloadUrl` endpoint returns the same CloudFront URL (not a presigned URL)
4. The storage API's `download` endpoint returns "invalid uidPath format" error

## Example Failed URLs
```
https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/1/media/C103%20View_wm_1769649742652.jpg
→ Returns: HTTP 403 Forbidden

https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/projects/30003/logo/CIsK8R7fq0YvSpwQ7FJOY.JPG
→ Returns: HTTP 403 Forbidden
```

## API Responses

### downloadUrl endpoint
```
GET https://forge.manus.ai/v1/storage/downloadUrl?path=1/media/C103%20View_wm_1769649742652.jpg
Authorization: Bearer [API_KEY]

Response: 200 OK
{
  "url": "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/1/media/C103%20View_wm_1769649742652.jpg"
}
// Note: Returns same CloudFront URL that is blocked
```

### download endpoint
```
GET https://forge.manus.ai/v1/storage/download?path=1/media/C103%20View_wm_1769649742652.jpg
Authorization: Bearer [API_KEY]

Response: 400 Bad Request
{
  "error": "invalid uidPath format, expected {uid}/{filePath}"
}
```

## Impact
- **Critical**: All project media (65+ items in main project) are inaccessible
- Project logos do not display
- Media gallery shows broken images
- PDF report generation may be affected
- New uploads also fail to display

## Expected Behavior
- CloudFront URLs should be publicly accessible (as they were before publish)
- OR the storage API should provide presigned URLs that work

## Requested Action
1. Restore public read access to the S3 bucket/CloudFront distribution
2. OR provide a working presigned URL endpoint for authenticated downloads
3. Investigate what changed during the publish process that caused this

## Environment Info
- Storage API: https://forge.manus.ai
- CloudFront Domain: d2xsxph8kpxj0f.cloudfront.net
- App ID: 310519663204719166
- Bucket ID: FiS5WF2NaftJTm6fu3BYQb

## Contact
Please respond urgently as this is blocking all media functionality in the production application.
