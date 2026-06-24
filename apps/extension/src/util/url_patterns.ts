export const URL_PATTERNS = ["http://*/*", "https://*/*", "file://*/*"];

export const check_url_allowed = (url: string): boolean => {
    if (url.includes("chromewebstore.google.com")) {
        return false;
    }

    // check if url matches any of the patterns in URL_PATTERNS
    for (const pattern of URL_PATTERNS) {
        const regex = new RegExp(
            "^" +
                pattern
                    .replace(/\./g, "\\.")
                    .replace(/\*/g, ".*")
                    .replace(/\//g, "\\/") +
                "$"
        );
        if (regex.test(url)) {
            return true;
        }
    }
    return false;
}
