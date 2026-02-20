/**
 * url_manager.js
 * URLクエリパラメータとシード値の同期を管理
 */

const UrlManager = {
    /**
     * URLのクエリパラメータからseedを取得する
     * @returns {number|null} シード値。存在しない場合はnull
     */
    getSeedFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const seed = params.get('seed');
        return seed ? parseInt(seed, 10) : null;
    },

    /**
     * URLのクエリパラメータにseedをセットする（履歴に残さないreplaceStateを使用）
     * @param {number} seed 
     */
    updateUrl(seed) {
        const url = new URL(window.location.href);
        url.searchParams.set('seed', seed);
        // ページをリロードせずにURLを書き換える
        window.history.replaceState(null, '', url.toString());
    },

    /**
     * 初期化処理: URLにシードがあれば入力欄に反映し、なければ現在の値をURLに反映する
     * @param {HTMLInputElement} seedInput 
     */
    init(seedInput) {
        if (!seedInput) return;

        const urlSeed = this.getSeedFromUrl();
        if (urlSeed !== null && !isNaN(urlSeed)) {
            // URLにシードがある場合は入力欄を更新
            seedInput.value = urlSeed;
        } else {
            // URLにシードがない場合は現在の入力値をURLに反映
            this.updateUrl(seedInput.value);
        }

        // 入力欄が変更されたらURLを更新するイベント（リアルタイム同期）
        seedInput.addEventListener('input', () => {
            const val = parseInt(seedInput.value, 10);
            if (!isNaN(val)) {
                this.updateUrl(val);
            }
        });
    }
};