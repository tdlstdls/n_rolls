/**
 * url_manager.js
 * URLクエリパラメータと各設定値の同期を管理
 */

const UrlManager = {
    /**
     * URLのクエリパラメータから指定したキーの値を取得する
     */
    getParam(key) {
        const params = new URLSearchParams(window.location.search);
        return params.get(key);
    },

    /**
     * URLのクエリパラメータからseedを取得する
     */
    getSeedFromUrl() {
        const seed = this.getParam('seed');
        return seed ? parseInt(seed, 10) : null;
    },

    /**
     * URLのクエリパラメータを更新する
     * @param {string} key 
     * @param {string|number} value 
     */
    updateUrlParam(key, value) {
        const url = new URL(window.location.href);
        if (value === null || value === undefined || value === '' || value === 0 || value === "0") {
            // 進捗が0の場合はURLをスッキリさせるために削除
            if (key === 'p' && (value === 0 || value === "0")) {
                url.searchParams.delete(key);
            } else if (value === null || value === undefined || value === '') {
                url.searchParams.delete(key);
            } else {
                url.searchParams.set(key, value);
            }
        } else {
            url.searchParams.set(key, value);
        }
        window.history.replaceState(null, '', url.toString());
    },

    /**
     * URLのクエリパラメータにseedをセットする
     */
    updateUrl(seed) {
        this.updateUrlParam('seed', seed);
    },

    /**
     * 初期化処理
     */
    init(seedInput) {
        if (!seedInput) return;

        const urlSeed = this.getSeedFromUrl();
        if (urlSeed !== null && !isNaN(urlSeed)) {
            seedInput.value = urlSeed;
        } else {
            this.updateUrl(seedInput.value);
        }

        seedInput.addEventListener('input', () => {
            const val = parseInt(seedInput.value, 10);
            if (!isNaN(val)) {
                this.updateUrl(val);
            }
        });
    }
};
