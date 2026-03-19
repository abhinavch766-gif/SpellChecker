
#ifndef TRIE_H
#define TRIE_H

#include <stdbool.h>

#define ALPHABET_SIZE 26

typedef struct TrieNode {
    struct TrieNode *children[ALPHABET_SIZE];
    bool isEndOfWord;
} TrieNode;

TrieNode* createNode();
void insertWord(TrieNode *root, const char *word);
bool searchWord(TrieNode *root, const char *word);
void suggestWords(TrieNode *root, char *prefix);

#endif