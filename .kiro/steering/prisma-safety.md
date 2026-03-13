---
inclusion: auto
---

# Prisma 数据库安全规范

## 危险操作警告

以下 Prisma 命令可能导致数据丢失，**生产环境严禁使用**：

### 🚨 极度危险
- `prisma migrate reset` - 删除所有数据并重新运行迁移
- `prisma db push --force-reset` - 强制重置数据库
- `prisma migrate dev --create-only` 后直接 apply - 可能导致数据丢失

### ⚠️ 需谨慎
- `prisma migrate dev` - 开发环境使用，会重置数据库
- `prisma db push` - 直接同步 schema，跳过迁移历史

## 安全操作流程

### 开发环境（MySQL）

1. **Schema 变更**：
   ```bash
   # 1. 创建迁移（不应用）
   npx prisma migrate dev --create-only --name describe_your_change
   
   # 2. 检查生成的迁移 SQL
   cat prisma/migrations/[timestamp]_describe_your_change/migration.sql
   
   # 3. 确认无误后应用
   npx prisma migrate dev
   ```

2. **仅生成 Prisma Client**（不修改数据库）：
   ```bash
   npx prisma generate
   ```

3. **查看数据库状态**：
   ```bash
   npx prisma migrate status
   ```

### 生产环境（MySQL）

1. **应用迁移**：
   ```bash
   # 仅应用待处理的迁移，不会重置数据
   npx prisma migrate deploy
   ```

2. **禁止使用**：
   - ❌ `prisma migrate dev`
   - ❌ `prisma migrate reset`
   - ❌ `prisma db push`

## 数据备份

### 开发环境备份

```bash
# MySQL 备份
mysqldump -h 10.1.96.2 -P 3308 -u s-hkdev -p tax > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复
mysql -h 10.1.96.2 -P 3308 -u s-hkdev -p tax < backup_20260313_120000.sql
```

### 自动备份脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "db:backup": "mysqldump -h 10.1.96.2 -P 3308 -u s-hkdev -p tax > backups/backup_$(date +%Y%m%d_%H%M%S).sql",
    "db:status": "prisma migrate status",
    "prisma:generate": "prisma generate",
    "prisma:migrate:create": "prisma migrate dev --create-only",
    "prisma:migrate:apply": "prisma migrate dev"
  }
}
```

## 当前配置检查

✅ **正确配置**：
- 使用 MySQL 生产数据库
- `postinstall` 只运行 `prisma generate`（安全）
- 没有自动运行 migrate 的脚本

⚠️ **注意事项**：
- 不要手动运行 `prisma migrate reset`
- Schema 变更前先备份数据库
- 使用 `--create-only` 先检查迁移 SQL

## 紧急恢复

如果数据已丢失：

1. 检查是否有备份文件
2. 检查 MySQL binlog（如果启用）
3. 联系数据库管理员恢复

## 最佳实践

1. **每次 Schema 变更前备份**
2. **使用 Git 管理迁移文件**
3. **在测试环境先验证迁移**
4. **生产环境只用 `prisma migrate deploy`**
5. **定期备份数据库**
