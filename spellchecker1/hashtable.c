
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "hashtable.h"

Node *table[TABLE_SIZE] = {NULL};

unsigned long hashFunction(const char *str) {
    unsigned long hash = 5381;
    int c;
    while ((c = *str++))
        hash = ((hash << 5) + hash) + c;
    return hash % TABLE_SIZE;
}

void insertHash(const char *word) {
    unsigned long idx = hashFunction(word);
    Node *newNode = (Node*)malloc(sizeof(Node));
    newNode->word = strdup(word);
    newNode->next = table[idx];
    table[idx] = newNode;
}

bool searchHash(const char *word) {
    unsigned long idx = hashFunction(word);
    Node *temp = table[idx];
    while (temp) {
        if (strcmp(temp->word, word) == 0)
            return true;
        temp = temp->next;
    }
    return false;
}
