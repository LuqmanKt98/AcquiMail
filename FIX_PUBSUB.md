# Fix Pub/Sub Subscription for Gmail Push Notifications

Run these commands in **Google Cloud Shell** (https://shell.cloud.google.com):

```bash
# 1. Set the project
gcloud config set project acquimail-44077

# 2. Check current subscription status (look for "pushConfig" and failed deliveries)
gcloud pubsub subscriptions describe gmail-push-sub

# 3. Delete the existing subscription (it might have issues)
gcloud pubsub subscriptions delete gmail-push-sub

# 4. Recreate with proper settings (no auth required, proper ack deadline)
gcloud pubsub subscriptions create gmail-push-sub \
  --topic=gmail-push \
  --push-endpoint=https://acqui-mail.vercel.app/api/gmail-webhook \
  --ack-deadline=60 \
  --push-no-wrapper

# 5. Verify the subscription
gcloud pubsub subscriptions describe gmail-push-sub

# 6. Test by publishing a message (simulates what Gmail does)
gcloud pubsub topics publish gmail-push \
  --message='{"emailAddress":"test@example.com","historyId":"12345"}'
```

After running these commands, the push notifications should work!
