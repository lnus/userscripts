#!/bin/bash

# check mode (default to dev)
MODE=${1:-dev}

# base url depending on mode
if [ "$MODE" == "deploy" ]; then
    BASE_URL="https://lnus.github.io/tbd"
else
    BASE_URL="http://localhost:8000"
fi

# ensure the public folder exists
mkdir -p public

# start creating the index.html file
cat > public/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Userscripts</title>
    <link rel="stylesheet" href="assets/styles.css">
</head>
<body>
    <h1>My Userscripts</h1>
    <ul>
EOF

# loop through scripts and add them to the index
for script in scripts/*.user.js; do
    script_name=$(basename "$script")
    script_url="$BASE_URL/$script_name"
    echo "    <li><a href=\"$script_url\">$script_name</a></li>" >> public/index.html
done

# close the html
cat >> public/index.html <<EOF
    </ul>
</body>
</html>
EOF

# copy scripts to public folder
cp scripts/*.user.js public/

# deploy to gh-pages
# if [ "$1" == "deploy" ]; then
#     git add public
#     git commit -m "deploy to gh-pages"
#     git subtree push --prefix public origin gh-pages
# fi

