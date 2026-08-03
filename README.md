# TRPG DM 自訂戰鬥計算表

這是 DM 專用的單頁戰鬥計算工具，採用自訂規則；D&D 5e 僅曾作為介面參考，目前畫面不再宣稱使用標準 D&D 5e 規則。

## 主要功能

- 管理玩家、怪物、友軍 NPC、遊俠靈寵與牧師死靈魁儡。
- 所有角色與怪物分開記錄物理護甲、魔法護甲。
- 武僧氣點上限可自訂。
- 牧師、遊俠、法師的 1～9 環法術位上限可自訂。
- 召喚死靈魁儡時自動檢查並扣除牧師法術位。
- 魁儡模板支援重新命名、上下排序、召喚及刪除。
- 遊俠靈寵可以記錄多項特殊能力。
- 結構化戰鬥事件紀錄，可快速篩選法術位或氣點異動。
- 戰役存檔可以命名，並可建立、切換、還原及刪除手動快照。
- 自動備份保留最近 20 份，手動快照另外保留最多 30 份。
- 支援 JSON 匯出／匯入。
- 角色與怪物圖片會壓縮後保存在瀏覽器的 IndexedDB。
- 可連接 Google Drive `appDataFolder`，在不同裝置同步目前戰役狀態與戰鬥紀錄。
- 同步前會比對版本；本機與雲端都有變更時不會自動互相覆蓋。

## 資料保存

資料會先保存在目前瀏覽器的 IndexedDB，不需要 Firebase、Supabase 或自行維護資料庫。Google Drive 同步是選用功能，未設定時仍可完整離線使用。

- 每次操作會自動儲存。
- 有異動時，每五分鐘建立一次自動備份。
- 切換手動快照、匯入 JSON 或清除紀錄前，會先建立安全備份。
- 舊版單一 AC 會在載入時複製為物理護甲與魔法護甲。
- Google Drive 同步目前包含戰役狀態與戰鬥紀錄；角色圖片、自動備份及手動快照保留在各裝置。
- Google 授權逾期時，網頁會保留本機變更並提示重新連接，不會丟失本機資料。

建議在重要場次前建立具名稱的手動快照，並定期匯出 JSON 作為獨立備份。

## 設定 Google Drive 跨裝置同步

1. 在 [Google Cloud Console](https://console.cloud.google.com/) 建立或選擇專案。
2. 啟用 **Google Drive API**。
3. 設定 OAuth 同意畫面，加入 `https://www.googleapis.com/auth/drive.appdata` 權限；若應用程式仍是測試狀態，將自己的 Google 帳號加入測試使用者。
4. 建立 **OAuth Client ID → Web application**。
5. 在 **Authorized JavaScript origins** 加入實際來源，例如：
   - 本機：`http://localhost:4173`
   - GitHub Pages：`https://你的帳號.github.io`
   - 使用自訂網域時，再加入該 HTTPS 網域。
6. 複製 Client ID，在網頁的 **Google 同步** 面板貼上並儲存，然後按 **連接 Google**。

OAuth Client ID 可以公開；不要建立或放入 Client Secret、存取權杖或密碼。若希望所有裝置開啟網頁時已預填 Client ID，可將 Client ID 寫入 `assets/js/config.js` 的 `googleClientId` 後再發布。

第一次連接時：

- Google Drive 沒有同步檔：上傳本機狀態並建立雲端版本 1。
- 新裝置沒有本機存檔：自動下載雲端狀態。
- 本機與雲端都已有資料：標示版本衝突，由使用者選擇下載雲端或以本機覆蓋。
- 正常使用時：本機立即儲存，停止操作約 3.5 秒後同步雲端。

## 本機使用與檢查

一般離線功能可直接開啟 `index.html`。Google OAuth 必須從已授權的 HTTP／HTTPS origin 執行，本機測試請使用：

```powershell
npm.cmd run serve
```

然後開啟 `http://localhost:4173`。

執行專案檢查：

```powershell
npm.cmd test
```

## 發佈到 GitHub Pages

1. 將專案推送到 GitHub repository 的 `main` 分支。
2. 在 repository 的 **Settings → Pages** 開啟 GitHub Pages。
3. 部署來源選擇 **GitHub Actions**。
4. `.github/workflows/pages.yml` 會先執行 `npm test`，通過後才發布網站。

GitHub Pages 只發布網站程式；執行中的戰役資料會存於使用者的 IndexedDB 與 Google Drive appData，不會提交到 GitHub repository。
