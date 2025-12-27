# Testing Gmail Push Notifications

## Step 1: Check if webhook is receiving Pub/Sub messages

Run this command in Google Cloud Shell:

```bash
# Check Pub/Sub subscription status
gcloud pubsub subscriptions describe gmail-push-sub

# Pull any pending messages (to see if any are queued)
gcloud pubsub subscriptions pull gmail-push-sub --limit=10
```

## Step 2: Manually test the webhook

Send a test notification to your webhook:

```bash
curl -X POST https://acqui-mail.vercel.app/api/gmail-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "data": "eyJlbWFpbEFkZHJlc3MiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiaGlzdG9yeUlkIjoiMTIzNDU2In0="
    }
  }'
```

This should trigger the webhook and write to Firebase.

## Step 3: Check Firebase

Open Firebase Console → Realtime Database → Look for `/emailSyncTrigger` node.

It should have been updated with timestamp and historyId.

## Step 4: Check Browser Console

Open your app with console visible (F12) and look for:
- "🔔 Push notification trigger received"

If you see this, push notifications are working!

## Step 5: Verify Gmail Watch is Active

In your app console, you should have seen:
```
✅ Gmail push notifications enabled
✅ Push notifications active until [date]
```

## Common Issues:

### Issue 1: Pub/Sub not delivering to webhook
**Solution:** The webhook URL must be publicly accessible and return 200

### Issue 2: Gmail watch expired
**Solution:** Watches expire after 7 days - app auto-renews, but check expiration

### Issue 3: Webhook not deployed
**Solution:** Verify https://acqui-mail.vercel.app/api/gmail-webhook returns {"error":"Method not allowed"}

### Issue 4: Firebase rules blocking writes
**Solution:** Check Firebase rules allow writes to /emailSyncTrigger

## Quick Test Command:

```bash
# In Google Cloud Shell, send a test Pub/Sub message
gcloud pubsub topics publish gmail-push \
  --message='{"emailAddress":"test@example.com","historyId":"123456"}'
```

Then check your app - if you see "🔔 Push notification trigger received", it's working!
