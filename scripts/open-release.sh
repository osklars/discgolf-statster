#!/bin/zsh
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export APP_VARIANT=release

cd "$REPO_ROOT/apps/statster"

echo "Installing pods with release variant..."
cd ios && pod install && cd ..

echo "Clearing derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/Statster-*

echo "Opening Xcode workspace..."
open ios/Statster.xcworkspace
