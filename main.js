// 全プレイヤーを格納するオブジェクト
const players = {};

// 現在のセル数 (N*N)
let currentCellCount = 9;

// 設定値のキャッシュ (一時保存)
let keepPlaybackInfo = true;     // リフレッシュ時に前回の再生情報を残す
let defaultTableSize = 9;        // 初期表示数
let autoplayOnRefresh = false;   // リフレッシュ時に自動再生
let autoplayOnAdd = false;       // 動画登録時に自動再生
let enableComments = true;       // コメント表示の有効/無効

const DEFAULT_SETTINGS = {
    keepPlaybackInfo: true,
    defaultTableSize: 9,
    autoplayOnRefresh: false,
    autoplayOnAdd: false,
    enableVideoLoop: false,
    muteOnStart: false,
    defaultVolume: 15,
    apiKey: '',
    enableComments: true  // デフォルト設定に追加
};

// 音量の初期値を保存
let currentVolume = 15;  // デフォルト値

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
        updateVolume(volume);
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

    // 保存された音量を復元
    const savedVolume = localStorage.getItem('youtube-volume');
    if (savedVolume !== null) {
        currentVolume = parseInt(savedVolume, 10);
        document.getElementById('global-volume').value = currentVolume;
    }

    // APIキーガイドモーダル関連のイベントリスナーを追加
    const apiKeyGuideBtn = document.getElementById('api-key-guide-btn');
    const apiKeyGuideModal = document.createElement('div');
    apiKeyGuideModal.id = 'api-key-guide-modal';
    document.body.appendChild(apiKeyGuideModal);

    apiKeyGuideBtn.addEventListener('click', () => {
        // 直接ガイドの内容をモーダルに設定
        apiKeyGuideModal.innerHTML = `
            <div id="api-key-guide-content">
                <button id="close-api-key-guide-btn">✕</button>
                <div class="api-key-guide-container">
                    <h1>YouTubeライブコメント取得用 APIキーの取得方法</h1>

                    <div class="warning">
                        <strong>注意:</strong> このAPIキーは無料で取得できますが、使用には制限があります。過度な使用は追加費用が発生する可能性があります。
                    </div>

                    <h2>手順1: Google Cloud Platformにログイン</h2>
                    <ol>
                        <li><a href="https://console.cloud.google.com/" target="_blank">Google Cloud Platform</a>にアクセスします。</li>
                        <li>Googleアカウントでログインします。</li>
                    </ol>

                    <h2>手順2: 新しいプロジェクトを作成</h2>
                    <ol>
                        <li>画面上部のプロジェクト選択メニューをクリックします。</li>
                        <li>「新しいプロジェクト」をクリックします。</li>
                        <li>プロジェクト名を入力し、「作成」をクリックします。</li>
                    </ol>

                    <h2>手順3: YouTube Data APIを有効化</h2>
                    <ol>
                        <li>左側のメニューから「APIとサービス」>「ライブラリ」を選択します。</li>
                        <li>検索バーで「YouTube Data API v3」を検索します。</li>
                        <li>「YouTube Data API v3」をクリックし、「有効にする」をクリックします。</li>
                    </ol>

                    <h2>手順4: 認証情報を作成</h2>
                    <ol>
                        <li>「APIとサービス」>「認証情報」に移動します。</li>
                        <li>「認証情報を作成」>「APIキー」をクリックします。</li>
                        <li>自動的に新しいAPIキーが生成されます。</li>
                        <li>キーの横にある「コピー」ボタンをクリックし、アプリケーションに貼り付けます。</li>
                    </ol>

                    <h2>手順5: APIキーの制限（推奨）</h2>
                    <ol>
                        <li>作成したAPIキーの横にある「編集」をクリックします。</li>
                        <li>「アプリケーションの制限」で「HTTPリファラー (ウェブサイト)」を選択します。</li>
                        <li>「ウェブサイト」に、アプリケーションのURLを追加します。</li>
                        <li>「API制限」で「YouTube Data API v3」を選択します。</li>
                    </ol>

                    <div class="warning">
                        <strong>重要な注意点:</strong>
                        <ul>
                            <li>APIキーは秘密にしてください。</li>
                            <li>不正利用を防ぐため、適切な制限を設定してください。</li>
                            <li>使用状況を定期的に確認し、必要に応じてキーをリセットしてください。</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // クローズボタンのイベントリスナーを追加
        const closeBtn = document.getElementById('close-api-key-guide-btn');
        closeBtn.addEventListener('click', () => {
            apiKeyGuideModal.style.display = 'none';
        });

        // モーダルを表示
        apiKeyGuideModal.style.display = 'flex';
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
 */
function generateTable(cellCount) {
    const fragment = document.createDocumentFragment();
    const table = document.createElement('table');
    const N = Math.sqrt(cellCount);

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

    rows.forEach(row => table.appendChild(row));
    fragment.appendChild(table);

    const container = document.getElementById('table-container');
    container.innerHTML = '';
    container.appendChild(fragment);

    restorePlayers(cellCount);
}

/**
 * 指定数のセルに関して、localStorage の情報を元にプレイヤー or 入力フォームを生成する
 */
function restorePlayers(cellCount) {
    currentCellCount = cellCount;

    Object.keys(players).forEach(key => {
        if (players[key]) {
            players[key].destroy();
        }
    });
    
    Object.keys(players).forEach(key => delete players[key]);

    for (let i = 1; i <= cellCount; i++) {
        const cell = document.getElementById(`cell-${i}`);
        if (!cell) continue;

        let videoId = null;
        if (keepPlaybackInfo) {
            videoId = localStorage.getItem(`cell-${i}`);
        }

        if (videoId) {
            createPlayer(i, videoId, true);
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
            throw new Error('URLが入力されていません');
        }

        let videoId = '';
        
        if (url.includes("youtube.com/watch?v=")) {
            videoId = url.split("v=")[1];
            if (videoId.includes("&")) {
                videoId = videoId.split("&")[0];
            }
        } 
        else if (url.includes("youtu.be/")) {
            videoId = url.split("youtu.be/")[1];
            if (videoId.includes("?")) {
                videoId = videoId.split("?")[0];
            }
        }

        if (!videoId || !videoId.match(/^[a-zA-Z0-9_-]{11}$/)) {
            throw new Error('有効なYouTube URLを入力してください');
        }

        if (keepPlaybackInfo) {
            localStorage.setItem(`cell-${cellNumber}`, videoId);
        }

        const cell = document.getElementById(`cell-${cellNumber}`);
        cell.innerHTML = '';
        createPlayer(cellNumber, videoId, false);

    } catch (error) {
        console.error('Error:', error.message);
        alert(error.message || 'エラーが発生しました');
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

        const shouldAutoplay = (isRefresh && autoplayOnRefresh) || (!isRefresh && autoplayOnAdd);

        // プレイヤーエリア
        const playerArea = document.createElement('div');
        playerArea.className = 'player-area';
        playerArea.id = `player-${cellNumber}`;
        cell.appendChild(playerArea);

        // コメントコンテナを追加
        const commentContainer = document.createElement('div');
        commentContainer.className = 'comment-container';
        commentContainer.id = `comment-container-${cellNumber}`;
        cell.appendChild(commentContainer);

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.textContent = '✕';
        closeButton.onclick = () => removeYouTubeVideo(cellNumber);
        cell.appendChild(closeButton);

        players[cellNumber] = new YT.Player(playerArea.id, {
            videoId: videoId,
            playerVars: {
                autoplay: shouldAutoplay ? 1 : 0,
                controls: 1,
                rel: 0,
                playsinline: 1,
                enablejsapi: 1
            },
            events: {
                onReady: async (event) => {
                    if (shouldAutoplay) {
                        event.target.playVideo();
                    }
                    event.target.setVolume(currentVolume);
                    
                    // 少し待ってからライブ配信の判定を行う
                    setTimeout(async () => {
                        const videoData = event.target.getVideoData();
                        console.log('Video Data:', videoData);  // デバッグ用
                
                        const apiKey = localStorage.getItem('apiKey') || '';
                        if (apiKey) {
                            try {
                                // getLiveChatIdを直接呼び出してチャットIDの有無で判定
                                const liveChatId = await getLiveChatId(videoId, apiKey);
                                if (liveChatId) {
                                    console.log('Live chat ID found:', liveChatId);
                                    startChatPolling(videoId, cellNumber, apiKey);
                                } else {
                                    console.log('No live chat ID found');
                                }
                            } catch (error) {
                                console.error('Error checking live status:', error);
                            }
                        } else {
                            console.error('API Key is not set');
                        }
                    }, 1000);  // 1秒待ってから判定
                },
                onError: (event) => {
                    console.error('YouTube Player Error:', event.data);
                    alert('動画の読み込みに失敗しました。URLを確認してください。');
                    removeYouTubeVideo(cellNumber);
                }
            }
        });

    } catch (error) {
        console.error(`Failed to create player ${cellNumber}:`, error);
        const cell = document.getElementById(`cell-${cellNumber}`);
        if (cell) {
            showInputArea(cell, cellNumber);
        }
    }
}

function displayComment(text, cellNumber) {
    const container = document.getElementById(`comment-container-${cellNumber}`);
    if (!container) return;

    const comment = document.createElement('div');
    comment.className = 'comment';
    comment.textContent = text;
    
    // ランダムな高さに配置
    const top = Math.random() * (container.offsetHeight - 30);
    comment.style.top = `${top}px`;
    
    container.appendChild(comment);

    // アニメーション終了後にコメントを削除
    comment.addEventListener('animationend', () => {
        comment.remove();
    });
}

/**
 * 動画を削除して入力フォームを表示し直す
 */
function removeYouTubeVideo(cellNumber) {
    // チャットポーリングを停止
    if (chatPollingIntervals[cellNumber]) {
        clearInterval(chatPollingIntervals[cellNumber]);
        delete chatPollingIntervals[cellNumber];
    }

    // コメントの追跡情報をクリア
    if (displayedComments[cellNumber]) {
        displayedComments[cellNumber] = {
            comments: new Set(),
            lastProcessedTimestamp: 0
        };
    }
    
    // 以下は既存のコード
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
    const settings = {};
    
    Object.entries(DEFAULT_SETTINGS).forEach(([key, defaultValue]) => {
        const savedValue = localStorage.getItem(key);
        if (savedValue !== null) {
            if (typeof defaultValue === 'boolean') {
                settings[key] = savedValue === '1';
            } else if (typeof defaultValue === 'number') {
                settings[key] = parseInt(savedValue, 10);
            } else {
                settings[key] = savedValue;  // 文字列はそのまま
            }
        } else {
            settings[key] = defaultValue;
        }
    });

    keepPlaybackInfo = settings.keepPlaybackInfo;
    autoplayOnRefresh = settings.autoplayOnRefresh;
    autoplayOnAdd = settings.autoplayOnAdd;
    defaultTableSize = settings.defaultTableSize;
    enableComments = settings.enableComments;

    document.getElementById('keep-playback-info').checked = settings.keepPlaybackInfo;
    document.getElementById('autoplay-on-refresh').checked = settings.autoplayOnRefresh;
    document.getElementById('autoplay-on-add').checked = settings.autoplayOnAdd;
    document.getElementById('default-table-size').value = settings.defaultTableSize;
    document.getElementById('enable-video-loop').checked = settings.enableVideoLoop;
    document.getElementById('mute-on-start').checked = settings.muteOnStart;
    document.getElementById('default-volume').value = settings.defaultVolume;
    document.getElementById('volume-value').textContent = settings.defaultVolume;
    document.getElementById('api-key').value = settings.apiKey;
    document.getElementById('enable-comments').checked = settings.enableComments;

    return settings;
}

/**
 * 設定をローカルストレージに保存する
 */
function saveSettingsToStorage() {
    const newSettings = {
        keepPlaybackInfo: document.getElementById('keep-playback-info').checked,
        autoplayOnRefresh: document.getElementById('autoplay-on-refresh').checked,
        autoplayOnAdd: document.getElementById('autoplay-on-add').checked,
        defaultTableSize: parseInt(document.getElementById('default-table-size').value),
        enableVideoLoop: document.getElementById('enable-video-loop').checked,
        muteOnStart: document.getElementById('mute-on-start').checked,
        defaultVolume: parseInt(document.getElementById('default-volume').value),
        apiKey: document.getElementById('api-key').value,
        enableComments: document.getElementById('enable-comments').checked  // 新しい設定
    };

    keepPlaybackInfo = newSettings.keepPlaybackInfo;
    autoplayOnRefresh = newSettings.autoplayOnRefresh;
    autoplayOnAdd = newSettings.autoplayOnAdd;
    defaultTableSize = newSettings.defaultTableSize;
    enableComments = newSettings.enableComments;  // グローバル変数も更新

    Object.entries(newSettings).forEach(([key, value]) => {
        localStorage.setItem(key, typeof value === 'boolean' ? (value ? '1' : '0') : value);
    });

    if (!keepPlaybackInfo) {
        for (let i = 1; i <= 25; i++) {
            localStorage.removeItem(`cell-${i}`);
        }
    }

    alert('設定を保存しました。');
}

/**
 * 音量変更関数
 */
function updateVolume(volume) {
    currentVolume = volume;
    Object.values(players).forEach(player => {
        if (player && typeof player.setVolume === 'function') {
            player.setVolume(volume);
        }
    });
    localStorage.setItem('youtube-volume', volume);
}

// 音量スライダーの値表示を更新
document.getElementById('default-volume').addEventListener('input', (e) => {
    document.getElementById('volume-value').textContent = e.target.value;
});

// ライブチャットのポーリングを管理するオブジェクト
const chatPollingIntervals = {};
// 既に表示したコメントを追跡するオブジェクト
const displayedComments = {};

// ライブチャットのIDを取得する関数
async function getLiveChatId(videoId, apiKey) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`);
    const data = await response.json();
    if (data.items && data.items[0] && data.items[0].liveStreamingDetails) {
        return data.items[0].liveStreamingDetails.activeLiveChatId;
    }
    return null;
}

// ライブチャットメッセージを取得する関数
async function fetchLiveChatMessages(liveChatId, apiKey, pageToken = '') {
    const url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=200&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const response = await fetch(url);
    return await response.json();
}

// チャットの監視を開始する関数
async function startChatPolling(videoId, cellNumber, apiKey) {
    // コメント機能が無効の場合は処理しない
    if (!enableComments) return;

    try {
        console.log('Starting chat polling...');
        const liveChatId = await getLiveChatId(videoId, apiKey);
        if (!liveChatId) {
            console.log('No live chat ID found');
            return;
        }

        // セル毎の表示済みコメントを初期化
        if (!displayedComments[cellNumber]) {
            displayedComments[cellNumber] = {
                comments: new Set(),
                lastProcessedTimestamp: Date.now()  // 現在の時間で初期化
            };
        }

        // 初回のリクエストで最新のページトークンを取得
        const initialData = await fetchLiveChatMessages(liveChatId, apiKey);
        let nextPageToken = initialData.nextPageToken;

        // 最初のタイムスタンプを記録
        const firstFetchTimestamp = Date.now();

        chatPollingIntervals[cellNumber] = setInterval(async () => {
            // コメント機能が無効になっていたら停止
            if (!enableComments) {
                clearInterval(chatPollingIntervals[cellNumber]);
                return;
            }

            try {
                const data = await fetchLiveChatMessages(liveChatId, apiKey, nextPageToken);
                
                // 新しいコメントのみを表示
                if (data.items && data.items.length > 0) {
                    // コメントをフィルタリング
                    const newComments = data.items.filter(item => {
                        const publishedTimestamp = new Date(item.snippet.publishedAt).getTime();
                        const messageText = item.snippet.displayMessage.trim();
                        const messageKey = `${messageText}`;
                        
                        // 最初のフェッチ以降に投稿されたコメントで、まだ表示していないもの
                        return publishedTimestamp > firstFetchTimestamp &&
                               !displayedComments[cellNumber].comments.has(messageKey);
                    });

                    // コメントを時間順にソート
                    newComments.sort((a, b) => 
                        new Date(a.snippet.publishedAt) - new Date(b.snippet.publishedAt)
                    );

                    // コメントを表示
                    newComments.forEach((item, index) => {
                        const messageText = item.snippet.displayMessage.trim();
                        const messageKey = `${messageText}`;

                        setTimeout(() => {
                            displayComment(messageText, cellNumber);
                            
                            // 表示済みコメントとして記録
                            displayedComments[cellNumber].comments.add(messageKey);
                        }, index * 200);
                    });
                }
                
                nextPageToken = data.nextPageToken;
            } catch (error) {
                console.error('Error fetching chat messages:', error);
            }
        }, 3000);  // チェック間隔を少し延ばす

    } catch (error) {
        console.error('Error starting chat polling:', error);
    }
}