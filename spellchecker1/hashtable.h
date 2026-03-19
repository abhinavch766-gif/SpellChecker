
#ifndef HASHTABLE_H
#define HASHTABLE_H

#include <stdbool.h>

#define TABLE_SIZE 21000 // large prime number

typedef struct Node {
    char *word;
    struct Node *next;
} Node;

void insertHash(const char *word);
bool searchHash(const char *word);
unsigned long hashFunction(const char *str);

#endif