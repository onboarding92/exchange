# BitChange – Self Test Guide

This document explains how to verify that the BitChange codebase is
in a healthy state using automated tests and basic manual checks.

It assumes a development environment similar to:
- Node.js 20.x
- npm 10+
- Local clone of the repository

---

## 1. Backend (server) – Automated tests

From repo root:

```bash
cd server
npm install
npm test
