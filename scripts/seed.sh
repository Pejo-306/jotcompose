#!/bin/bash

# API endpoints
NOTEBOOKS_API="http://localhost:8888"
NOTES_API="http://localhost:8888"
NOTEBOOKS_HEALTH_URL="$NOTEBOOKS_API/health/notebooks"
NOTES_HEALTH_URL="$NOTES_API/health/notes"

# Create a bunch of notebooks and capture their IDs
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$NOTEBOOKS_HEALTH_URL")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] && [ "$HEALTH_BODY" = "up" ]; then
    NOTEBOOK_RESPONSE_1=$(curl -s "$NOTEBOOKS_API/api/notebooks" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"name\": \"N1\", \"description\": \"Notebook 1 description\"}")
    NOTEBOOK_ID_1=$(echo "$NOTEBOOK_RESPONSE_1" | jq -r '.id')
    echo "$NOTEBOOK_RESPONSE_1"
    
    NOTEBOOK_RESPONSE_2=$(curl -s "$NOTEBOOKS_API/api/notebooks" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"name\": \"N2\", \"description\": \"Notebook 2 description\"}")
    NOTEBOOK_ID_2=$(echo "$NOTEBOOK_RESPONSE_2" | jq -r '.id')
    echo "$NOTEBOOK_RESPONSE_2"
    
    NOTEBOOK_RESPONSE_3=$(curl -s "$NOTEBOOKS_API/api/notebooks" \
        -X POST -H "Content-Type: application/json" \
        -d "{\"name\": \"N3\", \"description\": \"Notebook 3 description\"}")
    echo "$NOTEBOOK_RESPONSE_3"
else
    echo "Service at $NOTEBOOKS_API is down"
fi

# Create a bunch of notes
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$NOTES_HEALTH_URL")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] && [ "$HEALTH_BODY" = "up" ]; then
    for i in {1..4}; do
        NOTE_RESPONSE=$(curl -s "$NOTES_API/api/notes" \
            -X POST -H "Content-Type: application/json" \
            -d "{\"title\": \"N$i\", \"content\": \"Note $i content\", \"notebookId\": \"$NOTEBOOK_ID_1\"}")
        echo "$NOTE_RESPONSE"
    done

    for i in {5..8}; do
        NOTE_RESPONSE=$(curl -s "$NOTES_API/api/notes" \
            -X POST -H "Content-Type: application/json" \
            -d "{\"title\": \"N$i\", \"content\": \"Note $i content\", \"notebookId\": \"$NOTEBOOK_ID_2\"}")
        echo "$NOTE_RESPONSE"
    done

    for i in {9..12}; do
        NOTE_RESPONSE=$(curl -s "$NOTES_API/api/notes" \
            -X POST -H "Content-Type: application/json" \
            -d "{\"title\": \"N$i\", \"content\": \"Note $i content\"}")
        echo "$NOTE_RESPONSE"
    done
else
    echo "Service at $NOTES_API is down"
fi



# Delete notes
if false; then
    curl "$NOTES_API/api/notes/" \
        -X DELETE -H "Content-Type: application/json" \
        -d "{\"notebookId\": \"\"}"

    curl "$NOTES_API/api/notes/" \
        -X DELETE -H "Content-Type: application/json" \
        -d "{\"notebookId\": \"123\"}"

    curl "$NOTES_API/api/notes/" \
        -X DELETE -H "Content-Type: application/json" \
        -d "{\"notebookId\": \"b123456\"}"

    curl "$NOTES_API/api/notes/" \
        -X DELETE -H "Content-Type: application/json" \
        -d "{\"notebookId\": \"b654321\"}"
fi
