# キコのQCぼうけん

QC検定3級の勉強アプリ（全8章36節・144問・要点3行・復習・計算ドリル・キコちゃん育成）。

## 公開
GitHub Pages（Settings → Pages → Deploy from a branch → main / root）。
URL：https://wakiaseworld-cpu.github.io/kiko-qc-adventure/

## ログインと同期
キコハウス（https://wakiaseworld-cpu.github.io/kikohouse-app/）と同じ場所に置くので、キコハウスでログインした合言葉（`kh-token`）をそのまま使う。
記録はキコハウスのGAS（`qc_load` / `qc_save`）でGoogleドライブに保存し、端末間で合わせる（新しいほうを基本に、クリアした節や解いた記録は両方を足し合わせる）。

## 中身の暗号化
テキストと問題は `content.bin`（AES-GCM）に入れて公開する。鍵はGASの `__boot` が返す `qcKey`。
作り方：`node tools/encrypt.mjs qc.key` → `content.bin` ができる。鍵ファイルはリポジトリに入れない。

## 学習の時期（試験日から数える）
- 第1期（試験36日前まで）・第2期（試験18日前まで）：計算の章（第2・5・6・7・8章）を優先
- 第3期（〜試験15日前）：全章
- 直前期（試験14日前〜）：ボス未クリアの章と間違いの多い章を優先、「今日はこれだけ」に計算2問
- 連続日数：その日に10問以上解いた日（「今日はこれだけ」を終えた日も含む）
