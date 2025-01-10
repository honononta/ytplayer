// 全プレイヤーを格納するオブジェクト
const players = {};

// 現在のセル数 (N*N)
let currentCellCount = 9;

// 設定値のキャッシュ (一時保存)
let keepPlaybackInfo = true;     // リフレッシュ時に前回の再生情報を残す
let defaultTableSize = 9;        // 初期表示数
let autoplayOnRefresh = false;   // リフレッシュ時に自動再生
let autoplayOnAdd = false;       // 動画登録時に自動再生

document.addEventListener('DOMContentLoaded', () => {
    // --- 設定をローカルストレージから読み込む ---
    loadSettingsFromStorage();

    // --- テーブル生成 ---
    const savedSize = localStorage.getItem('tableSize');
    const initialSize = savedSize ? parseInt(savedSize, 10) : defaultTableSize;
    document.getElementById('table-size').value = String(initialSize);
    generateTable(initialSize);

    // --- 「変更」ボタン ---
    const changeTableBtn = document.getElementById('change-table-btn');
    changeTableBtn.addEventListener('click', () => {
        const newCount = parseInt(document.getElementById('table-size').value, 10);
        localStorage.setItem('tableSize', newCount);
        generateTable(newCount);
    });

    // --- 「リセット」ボタン ---
    const resetBtn = document.getElementById('reset-btn');
    resetBtn.addEventListener('click', () => {
        closeAllVideos();
    });

    // --- 音量スライダー ---
    const volumeSlider = document.getElementById('global-volume');
    volumeSlider.addEventListener('input', () => {
        const volume = parseInt(volumeSlider.value, 10);
        Object.values(players).forEach(player => {
            if (player && typeof player.setVolume === 'function') {
                player.setVolume(volume);
            }
        });
    });

    // --- 設定ボタンでモーダルを開く ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex';
    });

    // --- 設定モーダルの「閉じる」ボタン ---
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    // --- 設定モーダルの「保存」ボタン ---
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    saveSettingsBtn.addEventListener('click', () => {
        saveSettingsToStorage();
        settingsModal.style.display = 'none';
    });
});

/**
 * YouTube IFrame Player API が準備完了した際に呼ばれる
 */
function onYouTubeIframeAPIReady() {
    // すでにテーブルが生成済みなら、そのセルの localStorage を参照してプレイヤー再設定
    restorePlayers(currentCellCount);
}

/**
 * テーブルを動的に生成する関数
 * @param {number} cellCount N×N のセル数（1,4,9,16,25）
 */
function generateTable(cellCount) {
    // DocumentFragmentを使用してDOM操作をバッチ処理化
    const fragment = document.createDocumentFragment();
    const table = document.createElement('table');
    const N = Math.sqrt(cellCount);

    // テーブルの生成を最適化
    const rows = Array.from({ length: N }, (_, r) => {
        const tr = document.createElement('tr');
        
        Array.from({ length: N }, (_, c) => {
            const cellIndex = r * N + c + 1;
            const td = document.createElement('td');
            const cellContent = document.createElement('div');
            
            cellContent.className = 'cell-content';
            cellContent.id = `cell-${cellIndex}`;
            
            td.appendChild(cellContent);
            tr.appendChild(td);
        });

        return tr;
    });

    // 一括でテーブルに追加
    rows.forEach(row => table.appendChild(row));
    fragment.appendChild(table);

    // 最後に一度だけDOMを更新
    const container = document.getElementById('table-container');
    container.innerHTML = '';
    container.appendChild(fragment);

    // プレイヤーの復元
    restorePlayers(cellCount);
}

/**
 * 指定数のセルに関して、localStorage の情報を元にプレイヤー or 入力フォームを生成する
 */
function restorePlayers(cellCount) {
    // いったん全プレイヤーを破棄
    Object.keys(players).forEach(key => {
        if (players[key]) {
            players[key].destroy();
        }
    });
    for (const key of Object.keys(players)) {
        delete players[key];
    }

    for (let i = 1; i <= cellCount; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;

        let videoId = null;
        // keepPlaybackInfo が有効な場合だけ localStorage を使って復元
        if (keepPlaybackInfo) {
            videoId = localStorage.getItem(`cell-${i}`);
        }

        if (videoId) {
            createPlayer(i, videoId);
        } else {
            showInputArea(cell, i);
        }
    }
}

/**
 * 指定セル用に入力フォームを表示する
 */
function showInputArea(cell, cellNumber) {
    cell.innerHTML = '';
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    inputArea.innerHTML = `
<label for="youtube-url-${cellNumber}">YouTube URL:</label>
<input type="text" id="youtube-url-${cellNumber}" placeholder="https://www.youtube.com/watch?v=XXXXXXX">
<button onclick="addYouTubeVideo(${cellNumber})">表示</button>
`;
    cell.appendChild(inputArea);
}

/**
 * YouTube 動画を登録する
 */
function addYouTubeVideo(cellNumber) {
    try {
        const inputField = document.getElementById(`youtube-url-${cellNumber}`);
        if (!inputField) {
            throw new Error('Input field not found');
        }

        const url = inputField.value.trim();
        if (!url) {
            throw new Error('URL is empty');
        }

        if (!url.includes("youtube.com/watch?v=") && !url.includes("youtu.be/")) {
            throw new Error('Invalid YouTube URL');
        }

        let videoId = '';
        if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1].split("&")[0];
        } else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1].split("?")[0];
        }

        if (!videoId) {
            throw new Error('Could not extract video ID');
        }

        // 以下既存のコード
        if (keepPlaybackInfo) {
            localStorage.setItem(`cell-${cellNumber}`, videoId);
        }

        const cell = document.getElementById(`cell-${cellNumber}`);
        cell.innerHTML = '';
        createPlayer(cellNumber, videoId, false);

    } catch (error) {
        console.error('Error adding YouTube video:', error);
        let errorMessage = 'エラーが発生しました。';
        
        // エラーメッセージの詳細化
        if (error.message === 'Invalid YouTube URL') {
            errorMessage = '有効なYouTube URLを入力してください。';
        } else if (error.message === 'Could not extract video ID') {
            errorMessage = '動画IDを取得できませんでした。';
        }
        
        alert(errorMessage);
    }
}

/**
 * 指定セルに Player オブジェクトを生成して埋め込む
 */
function createPlayer(cellNumber, videoId, isRefresh = true) {
    try {
        const cell = document.getElementById(`cell-${cellNumber}`);
        if (!cell) {
            throw new Error(`Cell ${cellNumber} not found`);
        }

        const playerArea = document.createElement('div');
        playerArea.className = 'player-area';
        playerArea.id = `player-${cellNumber}`;
        cell.appendChild(playerArea);

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = '×';
        closeButton.onclick = () => removeYouTubeVideo(cellNumber);
        cell.appendChild(closeButton);

        const shouldAutoplay = (isRefresh && autoplayOnRefresh) || (!isRefresh && autoplayOnAdd);

        // YouTube Player の生成を try-catch で囲む
        players[cellNumber] = new YT.Player(playerArea.id, {
            videoId: videoId,
            playerVars: {
                autoplay: shouldAutoplay ? 1 : 0,
                controls: 1,
            },
            events: {
                onError: (event) => {
                    console.error('YouTube Player Error:', event.data);
                    // エラーメッセージを表示して入力フォームに戻す
                    alert('動画の読み込みに失敗しました。URLを確認してください。');
                    removeYouTubeVideo(cellNumber);
                },
                onReady: (event) => {
                    console.log(`Player ${cellNumber} ready`);
                }
            }
        });

    } catch (error) {
        console.error(`Failed to create player ${cellNumber}:`, error);
        // エラーが発生した場合は入力フォームに戻す
        const cell = document.getElementById(`cell-${cellNumber}`);
        if (cell) {
            showInputArea(cell, cellNumber);
        }
    }
}

/**
 * 動画を削除して入力フォームを表示し直す
 */
function removeYouTubeVideo(cellNumber) {
    if (keepPlaybackInfo) {
        localStorage.removeItem(`cell-${cellNumber}`);
    }

    if (players[cellNumber]) {
        players[cellNumber].destroy();
        delete players[cellNumber];
    }

    const cell = document.getElementById(`cell-${cellNumber}`);
    showInputArea(cell, cellNumber);
}

/**
 * すべての動画を閉じてフォームに戻す (リセットボタン用)
 */
function closeAllVideos() {
    for (let i = 1; i <= currentCellCount; i++) {
        removeYouTubeVideo(i);
    }
}

/**
 * 設定をローカルストレージから読み込む
 */
function loadSettingsFromStorage() {
    keepPlaybackInfo = localStorage.getItem('keepPlaybackInfo') === '1';
    autoplayOnRefresh = localStorage.getItem('autoplayOnRefresh') === '1';
    autoplayOnAdd = localStorage.getItem('autoplayOnAdd') === '1';
    defaultTableSize = parseInt(localStorage.getItem('defaultTableSize') || '9', 10);

    // ダイアログのUIにも反映
    document.getElementById('keep-playback-info').checked = keepPlaybackInfo;
    document.getElementById('autoplay-on-refresh').checked = autoplayOnRefresh;
    document.getElementById('autoplay-on-add').checked = autoplayOnAdd;
    document.getElementById('default-table-size').value = String(defaultTableSize);
}

/**
 * 設定をローカルストレージに保存する
 */
function saveSettingsToStorage() {
    const keepPlaybackInfoChecked = document.getElementById('keep-playback-info').checked;
    const autoplayOnRefreshChecked = document.getElementById('autoplay-on-refresh').checked;
    const autoplayOnAddChecked = document.getElementById('autoplay-on-add').checked;
    const defaultTableSizeValue = parseInt(document.getElementById('default-table-size').value, 10);

    // 変数にも反映
    keepPlaybackInfo = keepPlaybackInfoChecked;
    autoplayOnRefresh = autoplayOnRefreshChecked;
    autoplayOnAdd = autoplayOnAddChecked;
    defaultTableSize = defaultTableSizeValue;

    // ローカルストレージに保存
    localStorage.setItem('keepPlaybackInfo', keepPlaybackInfo ? '1' : '0');
    localStorage.setItem('autoplayOnRefresh', autoplayOnRefresh ? '1' : '0');
    localStorage.setItem('autoplayOnAdd', autoplayOnAdd ? '1' : '0');
    localStorage.setItem('defaultTableSize', String(defaultTableSize));

    alert('設定を保存しました。');
}
