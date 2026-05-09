---
title: 一个公式、一段代码和一张图
date: 2026-03-12
slug: formula-code-figure
summary: 技术文章常常同时需要推导、实现和直觉解释。页面排版应该服务于阅读节奏：正文宽度适中，代码清楚，侧栏只放真正有用的导航。
tags: Math, Code
readTime: 5 min read
---

# 一个公式、一段代码和一张图

技术文章常常同时需要推导、实现和直觉解释。页面排版应该服务于阅读节奏：正文宽度适中，代码清楚，侧栏只放真正有用的导航。

## 代码片段

```python
loss = cross_entropy(logits, labels) + alpha * regularizer(theta)
```

## 写作顺序

一个可读的技术笔记通常可以按这个顺序组织：

1. 先说明问题。
2. 再给出公式或核心算法。
3. 最后补上实验、图和边界条件。
