# 排班 + Sidework：正式版架构（已搭好）

> 不换现有 POS 的轻量网页应用。排班模块与 Sidework 检查模块分开，
> 唯一的交点是表现分 → 下周排班建议（减半天 / 减一天 / 正常），经理终审。

## 目录

```
app/
  backend/                 # Python FastAPI + SQLite
    app/
      main.py              # 入口、CORS、/uploads 静态文件
      models.py            # 员工、班次、排班、清单、完成记录、日报
      auth.py              # PIN 哈希、Token 会话
      seed.py              # 种子数据（经理 123456，员工 1111/2222/3333）
      database.py          # SQLite 连接（DATABASE_URL 设了就用 PostgreSQL）
      routers/             # auth / employees / schedule / sidework / review / report / ai
      services/
        scoring.py         # 完成率 40% + 复核通过率 40% + 准时率 20%，14 天滚动分
        daily_report.py    # 每日报告 v2：分数 → 原因 → 建议 → 给员工的话
    uploads/               # 照片/视频（按日期分文件夹，数据库只存路径）
    requirements.txt
  frontend/                # Vite + React
    src/
      api.js               # 所有后端调用集中在这里
      App.jsx              # 登录 + 左侧竖导航（电脑端）/ 底部 Tab（手机端）
      pages/               # Schedule / Today / Review / Score / Report / Suggest / Draft / Tasks / Profile
```

## 运行（两个终端）

```bash
# 终端 1：后端
cd app/backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# 接口文档：http://localhost:8000/docs
# 健康检查：http://localhost:8000/api/health

# 终端 2：前端
cd app/frontend
npm install
npm run dev
# 打开：http://localhost:5173
```

## 自测脚本（5 分钟）

1. Anna（1111）登录 → 今日 Sidework → 给“卷餐具 20 套”传照片 → 点完成。
2. 经理（123456）登录 → 经理复核 → 通过。
3. Anna 再登录 → 分数 → 分数已更新。
4. 经理 → 每日报告 → 看到当日总结；→ 下周排班建议 → 看到 keep / 减半天 / 减一天建议。

## Spec-Driven 开发（六份上下文文档）

新会话开工前先读仓库根目录的六份文档：`project-overview.md`、
`architecture.md`、`code-standards.md`、`ai-workflow.md`、`ui-context.md`、
`progress.md`，以及 `AGENTS.md`。每个新功能先写 `specs/` 里的 spec，
再写代码。当前状态以 `progress.md` 为准。

## 还没做的事（下一步，不是架构缺口）

- 邮件发每日报告给经理：需配 SMTP，报告接口已留好（`POST /api/reports/daily/generate`）。
- AI 视觉判照片：没配 key 只做文件检查、结论永远待人工；配 key 走 OpenAI 兼容接口，视觉版只标存疑、经理终审。
- 排班建议目前用单日分，14 天滚动分已算好、尚未接进建议。
- 排班表已支持点格子直接改（换班次、×取消、空格子新增）；拖拽排班还没做。
