#!/bin/bash

ai-api() {
    cd ./comment-ai-api || exit 1

    # check if venv exists
    if [ ! -d "venv" ]; then
        echo ">>> Creating venv for python ..."
        python -m venv venv
    fi

    echo ">>> Activating venv ..."
    source venv/Scripts/activate

    echo ">>> Installing requirements ..."
    pip install -r requirements.txt

    echo ">>> Starting python app ..."
    python app.py
}

backend-api() {
    cd ./comment-backend-api || exit 1

    echo ">>> Installing dependencies ..."
    npm install

    echo ">>> Starting Node.js app ..."
    npm start
}

web-ui() {
    cd ./comment-web-ui || exit 1

    echo ">>> Installing dependencies ..."
    npm install

    echo ">>> Starting React app ..."
    npm start
}

# running on parallel
ai-api > ./comment-ai-api/execution.log 2>&1 &
web-ui > ./comment-web-ui/execution.log 2>&1 &
backend-api > ./comment-backend-api/execution.log 2>&1
