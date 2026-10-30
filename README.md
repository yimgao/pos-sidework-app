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
      database.py          # SQLite 连接（以后换 PostgreSQL 改这里）
      routers/             # auth / employees / schedule / sidework / review / report
      services/
        scoring.py         # 完成率 40% + 复核通过率 40% + 准时率 20%
        daily_report.py    # 每日报告规则版文字
    uploads/               # 照片/视频（按日期分文件夹，数据库只存路径）
    requirements.txt
  frontend/                # Vite + React
    src/
      api.js               # 所有后端调用集中在这里
      App.jsx              # 登录 + 顶部导航
      pages/               # Schedule / Today / Review / Score / Report / Suggest
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

## 还没做的事（下一步，不是架构缺口）

- 邮件发每日报告给经理：需配 SMTP，报告接口已留好（`POST /api/reports/daily/generate`）。
- AI 视觉判照片：报告服务里 `daily_report.py` 是规则版，视觉版只标存疑、经理终审。
- 两周滚动分：当前分数接口用当日分，滚动平均在 `scoring.py` 里加一个 14 天聚合即可。
- 排班编辑 UI：排班表已能看、接口已能建班次和发布，拖拽/点选编辑是前端下一小步。
