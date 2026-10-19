#!/bin/sh
# Vercel "Ignored Build Step" (vercel.json ignoreCommand): exit 0 skips the build, exit 1 builds.
# Admin saves to drafts/* only build when the admin asks for a preview (a "[preview]" commit).
case "$VERCEL_GIT_COMMIT_REF" in
  drafts/*)
    case "$VERCEL_GIT_COMMIT_MESSAGE" in
      *"[preview]"*) exit 1 ;;
      *) exit 0 ;;
    esac
    ;;
  *) exit 1 ;;
esac
