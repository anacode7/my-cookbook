# Page snapshot

```yaml
- generic [ref=e3]:
  - complementary [ref=e4]:
    - generic [ref=e5]:
      - img [ref=e6]
      - heading "Cookbook" [level=1] [ref=e8]
    - navigation [ref=e9]:
      - link "Recipe Library" [ref=e10] [cursor=pointer]:
        - /url: /
        - img [ref=e11]
        - generic [ref=e13]: Recipe Library
      - link "Shopping List" [ref=e14] [cursor=pointer]:
        - /url: /shopping-list
        - img [ref=e15]
        - generic [ref=e19]: Shopping List
      - link "Import Recipes" [ref=e20] [cursor=pointer]:
        - /url: /import
        - img [ref=e21]
        - generic [ref=e24]: Import Recipes
  - main [ref=e25]:
    - generic [ref=e27]:
      - generic [ref=e28]:
        - heading "Import Recipes" [level=2] [ref=e29]
        - paragraph [ref=e30]: Paste your recipe text or upload a file to automatically parse and add them to your library.
      - generic [ref=e32]:
        - generic [ref=e33]:
          - img [ref=e34]
          - paragraph [ref=e37]: Drag and drop your recipe file here, or click to browse
          - button "Select File" [ref=e39] [cursor=pointer]
        - generic [ref=e44]: Or paste text
        - textbox "Paste your recipe text here..." [ref=e45]
        - generic [ref=e46]:
          - button "Parse Recipes" [disabled]
```