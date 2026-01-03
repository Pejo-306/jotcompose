#!/bin/bash

# Load test script for jotcompose architecture
# Performs concurrent POST, GET, PUT, DELETE requests and cleans up afterwards
#
# Dependencies: curl, jq
# Usage: ./scripts/load_test.sh
# Environment variables (optional):
#   CONCURRENT_REQUESTS - Number of concurrent requests (default: 10)
#   NOTEBOOKS_TO_CREATE - Number of notebooks to create (default: 50)
#   NOTES_TO_CREATE - Number of notes to create (default: 200)
#   GET_REQUESTS - Number of GET requests to perform (default: 100)
#   PUT_REQUESTS - Number of PUT requests to perform (default: 50)

set -e

# Check dependencies
if ! command -v curl &> /dev/null; then
    echo "Error: curl is required but not installed"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed"
    echo "Install with: brew install jq (macOS) or apt-get install jq (Linux)"
    exit 1
fi

# Configuration
API_BASE="http://localhost:8888"
NOTEBOOKS_API="$API_BASE/api/notebooks"
NOTES_API="$API_BASE/api/notes"
NOTEBOOKS_HEALTH="$API_BASE/health/notebooks"
NOTES_HEALTH="$API_BASE/health/notes"

# Load test parameters
CONCURRENT_REQUESTS=${CONCURRENT_REQUESTS:-10}
NOTEBOOKS_TO_CREATE=${NOTEBOOKS_TO_CREATE:-50}
NOTES_TO_CREATE=${NOTES_TO_CREATE:-200}
GET_REQUESTS=${GET_REQUESTS:-100}
PUT_REQUESTS=${PUT_REQUESTS:-50}

# Temporary files for tracking created resources
NOTEBOOK_IDS_FILE=$(mktemp)
NOTE_IDS_FILE=$(mktemp)
PID_FILE=$(mktemp)

# Cleanup function
cleanup() {
    echo ""
    echo "========================================="
    echo "Cleaning up created resources..."
    echo "========================================="
    
    # Delete all created notebooks (this will cascade delete associated notes)
    # We delete notebooks first because deleting a notebook automatically deletes its notes
    if [ -s "$NOTEBOOK_IDS_FILE" ]; then
        echo "Deleting notebooks (this will cascade delete associated notes)..."
        local deleted=0
        while IFS= read -r notebook_id || [ -n "$notebook_id" ]; do
            if [ -n "$notebook_id" ] && [ "$notebook_id" != "null" ]; then
                local response=$(curl -s -w "\n%{http_code}" -X DELETE "$NOTEBOOKS_API/$notebook_id")
                local http_code=$(echo "$response" | tail -n1)
                if [ "$http_code" -eq 204 ] || [ "$http_code" -eq 404 ]; then
                    deleted=$((deleted + 1))
                fi
            fi
        done < "$NOTEBOOK_IDS_FILE"
        echo "Deleted $deleted notebooks"
    fi
    
    # Delete remaining notes that weren't associated with notebooks
    if [ -s "$NOTE_IDS_FILE" ]; then
        echo "Deleting remaining standalone notes..."
        local deleted=0
        while IFS= read -r note_id || [ -n "$note_id" ]; do
            if [ -n "$note_id" ] && [ "$note_id" != "null" ]; then
                local response=$(curl -s -w "\n%{http_code}" -X DELETE "$NOTES_API/$note_id")
                local http_code=$(echo "$response" | tail -n1)
                if [ "$http_code" -eq 204 ] || [ "$http_code" -eq 404 ]; then
                    deleted=$((deleted + 1))
                fi
            fi
        done < "$NOTE_IDS_FILE"
        echo "Deleted $deleted standalone notes"
    fi
    
    # Clean up temp files
    rm -f "$NOTEBOOK_IDS_FILE" "$NOTE_IDS_FILE" "$PID_FILE"
    
    echo "Cleanup complete!"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Check if services are up
check_health() {
    local service=$1
    local health_url=$2
    
    echo "Checking $service health..."
    local response=$(curl -s -w "\n%{http_code}" "$health_url")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] && [ "$body" = "up" ]; then
        echo "✓ $service is up"
        return 0
    else
        echo "✗ $service is down (HTTP $http_code)"
        return 1
    fi
}

# Function to create a notebook
create_notebook() {
    local name=$1
    local description=$2
    local response=$(curl -s -w "\n%{http_code}" "$NOTEBOOKS_API" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"name\": \"$name\", \"description\": \"$description\"}")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 201 ]; then
        local notebook_id=$(echo "$body" | jq -r '.id' 2>/dev/null)
        if [ -n "$notebook_id" ] && [ "$notebook_id" != "null" ]; then
            echo "$notebook_id" >> "$NOTEBOOK_IDS_FILE"
        fi
        echo "Created notebook: $name (ID: $notebook_id)"
    else
        echo "Failed to create notebook $name (HTTP $http_code): $body"
    fi
}

# Function to create a note
create_note() {
    local title=$1
    local content=$2
    local notebook_id=$3
    local json_data
    if [ -n "$notebook_id" ] && [ "$notebook_id" != "null" ]; then
        json_data="{\"title\": \"$title\", \"content\": \"$content\", \"notebookId\": \"$notebook_id\"}"
    else
        json_data="{\"title\": \"$title\", \"content\": \"$content\"}"
    fi
    
    local response=$(curl -s -w "\n%{http_code}" "$NOTES_API" \
        -X POST -H "Content-Type: application/json" \
        -d "$json_data")
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 201 ]; then
        local note_id=$(echo "$body" | jq -r '.id' 2>/dev/null)
        if [ -n "$note_id" ] && [ "$note_id" != "null" ]; then
            echo "$note_id" >> "$NOTE_IDS_FILE"
        fi
        echo "Created note: $title (ID: $note_id)"
    else
        echo "Failed to create note $title (HTTP $http_code): $body"
    fi
}

# Function to get a resource
get_resource() {
    local api_url=$1
    local id=$2
    local resource_type=$3
    
    local response=$(curl -s -w "\n%{http_code}" "$api_url/$id")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "✓ GET $resource_type $id successful"
    else
        echo "✗ GET $resource_type $id failed (HTTP $http_code)"
    fi
}

# Function to get all resources
get_all_resources() {
    local api_url=$1
    local resource_type=$2
    
    local response=$(curl -s -w "\n%{http_code}" "$api_url")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        local count=$(echo "$response" | sed '$d' | jq '. | length' 2>/dev/null || echo "0")
        echo "✓ GET all $resource_type successful (count: $count)"
    else
        echo "✗ GET all $resource_type failed (HTTP $http_code)"
    fi
}

# Function to update a resource
update_notebook() {
    local id=$1
    local name=$2
    local description=$3
    
    local response=$(curl -s -w "\n%{http_code}" "$NOTEBOOKS_API/$id" \
        -X PUT -H "Content-Type: application/json" \
        -d "{\"name\": \"$name\", \"description\": \"$description\"}")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "✓ PUT notebook $id successful"
    else
        echo "✗ PUT notebook $id failed (HTTP $http_code)"
    fi
}

update_note() {
    local id=$1
    local title=$2
    local content=$3
    
    local response=$(curl -s -w "\n%{http_code}" "$NOTES_API/$id" \
        -X PUT -H "Content-Type: application/json" \
        -d "{\"title\": \"$title\", \"content\": \"$content\"}")
    local http_code=$(echo "$response" | tail -n1)
    
    if [ "$http_code" -eq 200 ]; then
        echo "✓ PUT note $id successful"
    else
        echo "✗ PUT note $id failed (HTTP $http_code)"
    fi
}

# Function to run concurrent requests
run_concurrent() {
    local func=$1
    local count=$2
    shift 2
    local args=("$@")
    
    local pids=()
    local batch_size=$CONCURRENT_REQUESTS
    
    for ((i=0; i<count; i+=batch_size)); do
        local batch_end=$((i + batch_size))
        if [ $batch_end -gt $count ]; then
            batch_end=$count
        fi
        
        # Start batch of concurrent requests
        for ((j=i; j<batch_end; j++)); do
            "$func" "${args[@]}" "$j" &
            pids+=($!)
        done
        
        # Wait for batch to complete
        for pid in "${pids[@]}"; do
            wait $pid 2>/dev/null || true
        done
        pids=()
    done
}

# Main execution
echo "========================================="
echo "Load Testing jotcompose Architecture"
echo "========================================="
echo ""
echo "Configuration:"
echo "  Concurrent requests: $CONCURRENT_REQUESTS"
echo "  Notebooks to create: $NOTEBOOKS_TO_CREATE"
echo "  Notes to create: $NOTES_TO_CREATE"
echo "  GET requests: $GET_REQUESTS"
echo "  PUT requests: $PUT_REQUESTS"
echo ""

# Health checks
if ! check_health "notebooks" "$NOTEBOOKS_HEALTH"; then
    echo "Error: Notebooks service is not available"
    exit 1
fi

if ! check_health "notes" "$NOTES_HEALTH"; then
    echo "Error: Notes service is not available"
    exit 1
fi

echo ""
echo "========================================="
echo "Phase 1: Creating Notebooks (Concurrent)"
echo "========================================="
start_time=$(date +%s)

# Create notebooks concurrently
for ((i=1; i<=NOTEBOOKS_TO_CREATE; i+=CONCURRENT_REQUESTS)); do
    pids=()
    for ((j=0; j<CONCURRENT_REQUESTS && (i+j)<=NOTEBOOKS_TO_CREATE; j++)); do
        idx=$((i+j))
        create_notebook "LoadTest-Notebook-$idx" "Description for notebook $idx" &
        pids+=($!)
    done
    for pid in "${pids[@]}"; do
        wait $pid 2>/dev/null || true
    done
done

end_time=$(date +%s)
echo "Created notebooks in $((end_time - start_time)) seconds"
echo ""

# Read notebook IDs for later use (compatible with older bash)
NOTEBOOK_IDS=()
while IFS= read -r line || [ -n "$line" ]; do
    if [ -n "$line" ] && [ "$line" != "null" ]; then
        NOTEBOOK_IDS+=("$line")
    fi
done < "$NOTEBOOK_IDS_FILE" 2>/dev/null || true
NOTEBOOK_COUNT=${#NOTEBOOK_IDS[@]}

if [ $NOTEBOOK_COUNT -eq 0 ]; then
    echo "Warning: No notebooks were created. Exiting."
    exit 1
fi

echo "========================================="
echo "Phase 2: Creating Notes (Concurrent)"
echo "========================================="
start_time=$(date +%s)

# Create notes concurrently (some with notebookId, some without)
for ((i=1; i<=NOTES_TO_CREATE; i+=CONCURRENT_REQUESTS)); do
    pids=()
    for ((j=0; j<CONCURRENT_REQUESTS && (i+j)<=NOTES_TO_CREATE; j++)); do
        idx=$((i+j))
        # Assign to notebook if available, otherwise create standalone note
        if [ $((idx % 3)) -eq 0 ] && [ $NOTEBOOK_COUNT -gt 0 ]; then
            # Every 3rd note gets a notebookId
            notebook_idx=$((idx % NOTEBOOK_COUNT))
            notebook_id="${NOTEBOOK_IDS[$notebook_idx]}"
            create_note "LoadTest-Note-$idx" "Content for note $idx" "$notebook_id" &
        else
            create_note "LoadTest-Note-$idx" "Content for note $idx" "" &
        fi
        pids+=($!)
    done
    for pid in "${pids[@]}"; do
        wait $pid 2>/dev/null || true
    done
done

end_time=$(date +%s)
echo "Created notes in $((end_time - start_time)) seconds"
echo ""

# Read note IDs (compatible with older bash)
NOTE_IDS=()
while IFS= read -r line || [ -n "$line" ]; do
    if [ -n "$line" ] && [ "$line" != "null" ]; then
        NOTE_IDS+=("$line")
    fi
done < "$NOTE_IDS_FILE" 2>/dev/null || true
NOTE_COUNT=${#NOTE_IDS[@]}

echo "========================================="
echo "Phase 3: GET Requests (Concurrent)"
echo "========================================="
start_time=$(date +%s)

# GET all notebooks and notes
for ((i=0; i<GET_REQUESTS/2; i++)); do
    get_all_resources "$NOTEBOOKS_API" "notebooks" &
    get_all_resources "$NOTES_API" "notes" &
done

# GET individual resources
if [ $NOTEBOOK_COUNT -gt 0 ]; then
    for ((i=0; i<GET_REQUESTS && i<NOTEBOOK_COUNT; i++)); do
        idx=$((i % NOTEBOOK_COUNT))
        get_resource "$NOTEBOOKS_API" "${NOTEBOOK_IDS[$idx]}" "notebook" &
    done
fi

if [ $NOTE_COUNT -gt 0 ]; then
    for ((i=0; i<GET_REQUESTS && i<NOTE_COUNT; i++)); do
        idx=$((i % NOTE_COUNT))
        get_resource "$NOTES_API" "${NOTE_IDS[$idx]}" "note" &
    done
fi

wait

end_time=$(date +%s)
echo "Completed GET requests in $((end_time - start_time)) seconds"
echo ""

echo "========================================="
echo "Phase 4: PUT Requests (Concurrent)"
echo "========================================="
start_time=$(date +%s)

# Update notebooks
if [ $NOTEBOOK_COUNT -gt 0 ]; then
    for ((i=0; i<PUT_REQUESTS && i<NOTEBOOK_COUNT; i++)); do
        idx=$((i % NOTEBOOK_COUNT))
        update_notebook "${NOTEBOOK_IDS[$idx]}" "Updated-Notebook-$idx" "Updated description $idx" &
    done
fi

# Update notes
if [ $NOTE_COUNT -gt 0 ]; then
    for ((i=0; i<PUT_REQUESTS && i<NOTE_COUNT; i++)); do
        idx=$((i % NOTE_COUNT))
        update_note "${NOTE_IDS[$idx]}" "Updated-Note-$idx" "Updated content $idx" &
    done
fi

wait

end_time=$(date +%s)
echo "Completed PUT requests in $((end_time - start_time)) seconds"
echo ""

echo "========================================="
echo "Load Test Complete!"
echo "========================================="
echo "Created:"
echo "  - $NOTEBOOK_COUNT notebooks"
echo "  - $NOTE_COUNT notes"
echo ""
echo "Cleanup will run automatically on exit..."

