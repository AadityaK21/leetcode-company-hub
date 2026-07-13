export interface SheetEntry {
  slug: string;
  title: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  section: string;
  isPremium?: boolean;
}

export const BLIND_75: SheetEntry[] = [
  // Arrays & Hashing
  { slug: "two-sum", title: "Two Sum", difficulty: "EASY", section: "Array" },
  { slug: "best-time-to-buy-and-sell-stock", title: "Best Time to Buy and Sell Stock", difficulty: "EASY", section: "Array" },
  { slug: "contains-duplicate", title: "Contains Duplicate", difficulty: "EASY", section: "Array" },
  { slug: "product-of-array-except-self", title: "Product of Array Except Self", difficulty: "MEDIUM", section: "Array" },
  { slug: "maximum-subarray", title: "Maximum Subarray", difficulty: "MEDIUM", section: "Array" },
  { slug: "maximum-product-subarray", title: "Maximum Product Subarray", difficulty: "MEDIUM", section: "Array" },
  { slug: "find-minimum-in-rotated-sorted-array", title: "Find Minimum in Rotated Sorted Array", difficulty: "MEDIUM", section: "Array" },
  { slug: "search-in-rotated-sorted-array", title: "Search in Rotated Sorted Array", difficulty: "MEDIUM", section: "Array" },
  { slug: "3sum", title: "3Sum", difficulty: "MEDIUM", section: "Array" },
  { slug: "container-with-most-water", title: "Container With Most Water", difficulty: "MEDIUM", section: "Array" },
  // Binary
  { slug: "sum-of-two-integers", title: "Sum of Two Integers", difficulty: "MEDIUM", section: "Binary" },
  { slug: "number-of-1-bits", title: "Number of 1 Bits", difficulty: "EASY", section: "Binary" },
  { slug: "counting-bits", title: "Counting Bits", difficulty: "EASY", section: "Binary" },
  { slug: "missing-number", title: "Missing Number", difficulty: "EASY", section: "Binary" },
  { slug: "reverse-bits", title: "Reverse Bits", difficulty: "EASY", section: "Binary" },
  // Dynamic Programming
  { slug: "climbing-stairs", title: "Climbing Stairs", difficulty: "EASY", section: "Dynamic Programming" },
  { slug: "coin-change", title: "Coin Change", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "longest-increasing-subsequence", title: "Longest Increasing Subsequence", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "longest-common-subsequence", title: "Longest Common Subsequence", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "word-break", title: "Word Break", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "combination-sum-iv", title: "Combination Sum IV", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "house-robber", title: "House Robber", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "house-robber-ii", title: "House Robber II", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "decode-ways", title: "Decode Ways", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "unique-paths", title: "Unique Paths", difficulty: "MEDIUM", section: "Dynamic Programming" },
  { slug: "jump-game", title: "Jump Game", difficulty: "MEDIUM", section: "Dynamic Programming" },
  // Graph
  { slug: "clone-graph", title: "Clone Graph", difficulty: "MEDIUM", section: "Graph" },
  { slug: "course-schedule", title: "Course Schedule", difficulty: "MEDIUM", section: "Graph" },
  { slug: "pacific-atlantic-water-flow", title: "Pacific Atlantic Water Flow", difficulty: "MEDIUM", section: "Graph" },
  { slug: "number-of-islands", title: "Number of Islands", difficulty: "MEDIUM", section: "Graph" },
  { slug: "longest-consecutive-sequence", title: "Longest Consecutive Sequence", difficulty: "MEDIUM", section: "Graph" },
  { slug: "alien-dictionary", title: "Alien Dictionary", difficulty: "HARD", section: "Graph", isPremium: true },
  { slug: "graph-valid-tree", title: "Graph Valid Tree", difficulty: "MEDIUM", section: "Graph", isPremium: true },
  { slug: "number-of-connected-components-in-an-undirected-graph", title: "Number of Connected Components in an Undirected Graph", difficulty: "MEDIUM", section: "Graph", isPremium: true },
  // Interval
  { slug: "insert-interval", title: "Insert Interval", difficulty: "MEDIUM", section: "Interval" },
  { slug: "merge-intervals", title: "Merge Intervals", difficulty: "MEDIUM", section: "Interval" },
  { slug: "non-overlapping-intervals", title: "Non-overlapping Intervals", difficulty: "MEDIUM", section: "Interval" },
  { slug: "meeting-rooms", title: "Meeting Rooms", difficulty: "EASY", section: "Interval", isPremium: true },
  { slug: "meeting-rooms-ii", title: "Meeting Rooms II", difficulty: "MEDIUM", section: "Interval", isPremium: true },
  // Linked List
  { slug: "reverse-linked-list", title: "Reverse Linked List", difficulty: "EASY", section: "Linked List" },
  { slug: "linked-list-cycle", title: "Linked List Cycle", difficulty: "EASY", section: "Linked List" },
  { slug: "merge-two-sorted-lists", title: "Merge Two Sorted Lists", difficulty: "EASY", section: "Linked List" },
  { slug: "merge-k-sorted-lists", title: "Merge k Sorted Lists", difficulty: "HARD", section: "Linked List" },
  { slug: "remove-nth-node-from-end-of-list", title: "Remove Nth Node From End of List", difficulty: "MEDIUM", section: "Linked List" },
  { slug: "reorder-list", title: "Reorder List", difficulty: "MEDIUM", section: "Linked List" },
  // Matrix
  { slug: "set-matrix-zeroes", title: "Set Matrix Zeroes", difficulty: "MEDIUM", section: "Matrix" },
  { slug: "spiral-matrix", title: "Spiral Matrix", difficulty: "MEDIUM", section: "Matrix" },
  { slug: "rotate-image", title: "Rotate Image", difficulty: "MEDIUM", section: "Matrix" },
  { slug: "word-search", title: "Word Search", difficulty: "MEDIUM", section: "Matrix" },
  // String
  { slug: "longest-substring-without-repeating-characters", title: "Longest Substring Without Repeating Characters", difficulty: "MEDIUM", section: "String" },
  { slug: "longest-repeating-character-replacement", title: "Longest Repeating Character Replacement", difficulty: "MEDIUM", section: "String" },
  { slug: "minimum-window-substring", title: "Minimum Window Substring", difficulty: "HARD", section: "String" },
  { slug: "valid-anagram", title: "Valid Anagram", difficulty: "EASY", section: "String" },
  { slug: "group-anagrams", title: "Group Anagrams", difficulty: "MEDIUM", section: "String" },
  { slug: "valid-parentheses", title: "Valid Parentheses", difficulty: "EASY", section: "String" },
  { slug: "valid-palindrome", title: "Valid Palindrome", difficulty: "EASY", section: "String" },
  { slug: "longest-palindromic-substring", title: "Longest Palindromic Substring", difficulty: "MEDIUM", section: "String" },
  { slug: "palindromic-substrings", title: "Palindromic Substrings", difficulty: "MEDIUM", section: "String" },
  { slug: "encode-and-decode-strings", title: "Encode and Decode Strings", difficulty: "MEDIUM", section: "String", isPremium: true },
  // Tree
  { slug: "maximum-depth-of-binary-tree", title: "Maximum Depth of Binary Tree", difficulty: "EASY", section: "Tree" },
  { slug: "same-tree", title: "Same Tree", difficulty: "EASY", section: "Tree" },
  { slug: "invert-binary-tree", title: "Invert Binary Tree", difficulty: "EASY", section: "Tree" },
  { slug: "binary-tree-maximum-path-sum", title: "Binary Tree Maximum Path Sum", difficulty: "HARD", section: "Tree" },
  { slug: "binary-tree-level-order-traversal", title: "Binary Tree Level Order Traversal", difficulty: "MEDIUM", section: "Tree" },
  { slug: "serialize-and-deserialize-binary-tree", title: "Serialize and Deserialize Binary Tree", difficulty: "HARD", section: "Tree" },
  { slug: "subtree-of-another-tree", title: "Subtree of Another Tree", difficulty: "EASY", section: "Tree" },
  { slug: "construct-binary-tree-from-preorder-and-inorder-traversal", title: "Construct Binary Tree from Preorder and Inorder Traversal", difficulty: "MEDIUM", section: "Tree" },
  { slug: "validate-binary-search-tree", title: "Validate Binary Search Tree", difficulty: "MEDIUM", section: "Tree" },
  { slug: "kth-smallest-element-in-a-bst", title: "Kth Smallest Element in a BST", difficulty: "MEDIUM", section: "Tree" },
  { slug: "lowest-common-ancestor-of-a-binary-search-tree", title: "Lowest Common Ancestor of a BST", difficulty: "MEDIUM", section: "Tree" },
  { slug: "implement-trie-prefix-tree", title: "Implement Trie (Prefix Tree)", difficulty: "MEDIUM", section: "Tree" },
  { slug: "design-add-and-search-words-data-structure", title: "Design Add and Search Words Data Structure", difficulty: "MEDIUM", section: "Tree" },
  { slug: "word-search-ii", title: "Word Search II", difficulty: "HARD", section: "Tree" },
  // Heap
  { slug: "merge-k-sorted-lists", title: "Merge k Sorted Lists", difficulty: "HARD", section: "Heap" },
  { slug: "top-k-frequent-elements", title: "Top K Frequent Elements", difficulty: "MEDIUM", section: "Heap" },
  { slug: "find-median-from-data-stream", title: "Find Median from Data Stream", difficulty: "HARD", section: "Heap" },
];
