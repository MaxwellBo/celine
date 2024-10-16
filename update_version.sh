#!/bin/bash

# Check for the correct number of arguments
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 old_version new_version"
    exit 1
fi

OLD_VERSION=$1
NEW_VERSION=$2

# Function to replace old version with new version in a file
replace_version() {
    local file=$1
    local changes_count=0

    if [ -f "$file" ]; then
        # Count lines containing the old version
        original_lines=$(grep -c "$OLD_VERSION" "$file")

        # Use sed to replace the old version with the new version
        sed -i.bak "s/$OLD_VERSION/$NEW_VERSION/g" "$file"

        # Count lines containing the new version
        updated_lines=$(grep -c "$NEW_VERSION" "$file")

        # Calculate the count of changes assuming each replacement affects one line
        changes_count=$((updated_lines - (original_lines - updated_lines)))

        echo "$changes_count"
    else
        echo "File $file not found!"
        echo "0"
    fi
}

# Replace version in deno.json and index.html and gather total changes
changes_deno=$(replace_version "deno.json")
changes_index=$(replace_version "index.html")

# Convert counted changes into integers and calculate total
total_changes=$((changes_deno + changes_index))

# Check if the total number of changes is exactly 5
if [ "$total_changes" -ne 5 ]; then
    echo "#########################################"
    echo "#                                       #"
    echo "# VERY LOUD WARNING:                    #"
    echo "# Expected 5 lines to be updated, but   #"
    echo "# found $total_changes lines changed.   #"
    echo "# Please verify your files.             #"
    echo "#                                       #"
    echo "#########################################"
    exit 1
fi

echo "Version update completed with $total_changes changes."
