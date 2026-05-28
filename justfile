tree:
    git log --graph --oneline --decorate --all

eol-check:
    npm run eol:check

eol-fix:
    npm run eol:fix

eol-fix-modified:
    npm run eol:fix-modified

pub version:
    npm run pub {{version}}
