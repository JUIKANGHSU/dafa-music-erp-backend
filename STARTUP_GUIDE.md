# 大發音樂 ERP 系統啟動指南

重新開機後，您需要開啟兩個終端機 (Terminal) 視窗，分別啟動後端與前端服務。

## 1. 啟動後端 (Backend)

開啟第一個終端機視窗，執行以下指令：

```bash
# 進入專案目錄 (請依據您的實際路徑調整)
cd /Users/juikang/.gemini/antigravity/scratch/dafa-music-erp

# 進入 backend 資料夾
cd backend

# 啟動 FastAPI 伺服器
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

*成功啟動後，您應該會看到 `Application startup complete` 的訊息。*

## 2. 啟動前端 (Frontend)

開啟第二個終端機視窗，執行以下指令：

```bash
# 進入專案目錄
cd /Users/juikang/.gemini/antigravity/scratch/dafa-music-erp

# 進入 frontend 資料夾
cd frontend

# 啟動 Next.js 開發伺服器
npm run dev
```

*成功啟動後，您應該會看到 `Ready in ...` 以及 `Local: http://localhost:3000` 的訊息。*

## 3. 開啟網頁

在瀏覽器網址列輸入：[http://localhost:3000](http://localhost:3000) 即可開始使用。
API 文件位於：[http://localhost:8000/docs](http://localhost:8000/docs)
