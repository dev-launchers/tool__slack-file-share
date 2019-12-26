#!/bin/bash
# Replace variables in wrangler.toml with env vars defined in travis
# STUDENT_ROUTE, STUDENT_CHANNELS_TO_WEBHOOK_KV_NAMESPACES MENTOR_ROUTE and
# MENTOR_CHANNELS_TO_WEBHOOK_KV_NAMESPACES have different values in travis based on the branch
sed -e "s~ACCOUNT_ID~$ACCOUNT_ID~" \
    -e "s~ZONE_ID~$ZONE_ID~" \
    -e "s~ROUTE~$ROUTE~" \
    -e "s~SLACK_COMMON_KV_ID~$SLACK_COMMON_KV_ID~" \
    wrangler.toml > templated_wrangler.toml
mv templated_wrangler.toml wrangler.toml
CF_API_KEY=$CF_API_KEY CF_EMAIL=$CF_EMAIL wrangler publish